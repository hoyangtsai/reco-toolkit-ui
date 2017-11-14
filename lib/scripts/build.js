const fs = require('fs');
const utilFs = require('../util/fs');
// const spawn = require('../util/spawn');
const path = require('path');
const Promise = require('bluebird');
const chalk = require('chalk');
const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const rimraf = Promise.promisify(require('rimraf'));
const yargs = require('yargs');
const mkdirp = require('mkdirp');

class Build {
  constructor(ctx) {
    this.ctx = ctx;
    this.options = {
      hasRouter: {
        type: 'boolean',
        desc: 'using react-router',
        default: false,
      },
      outputHtml: {
        type: 'boolean',
        desc: 'Output static html files',
        default: true,
      }
    };

    this.options = yargs.options(this.options);
    Object.assign(ctx.argv, this.options.argv);

    process.env.NODE_ENV = 'production';
    process.env.MODULE_PATH = path.join(__dirname, '../../node_modules');
    process.env.PUBLISH_DIR = 'publish';
  }

  * run() {
    console.log('building ...');

    const {
      cwd,
      argv,
      env
    } = this.ctx;

    let userConfig = require(path.join(cwd, 'config/reco-config.js'));
    let pageConfig = require(path.join(cwd, userConfig.pageConfig));
    let baseConfig = Object.assign({}, userConfig, pageConfig);

    let webpackBaseConfig = require('../webpack/webpack.config.base');
    let ssrConfig;

    return this.checkRouter(baseConfig).then(hasRouter => {
      argv.hasRouter = hasRouter;
      if (argv.hasRouter) {
        return this.generateRouterTempFile(baseConfig);
      }
    })
    .then(() => {
      if (!argv.outputHtml) return;

      let webpackHtmlConfig = require('../webpack/webpack.config.html');
      ssrConfig = webpackMerge(
        webpackBaseConfig(baseConfig, argv), webpackHtmlConfig(baseConfig, argv)
      );
      return this.webpackPromise(ssrConfig);
    })
    .then(() => {
      if (!argv.outputHtml) return;

      if (Array.isArray(baseConfig.entry)) {
        return Promise.map(baseConfig.entry, page => {
          this.reactDOMRender(baseConfig, page);
        })
      } else {
        return Promise.map(Object.keys(baseConfig.entry), key => {
          return Promise.map(baseConfig.entry[key], page => {
            this.reactDOMRender(baseConfig, page);
          })
        })
      }
    })
    .then(() => {
      if (argv.hasRouter) {
        return Promise.map(Object.keys(ssrConfig.entry), key => {
          rimraf.sync(ssrConfig.entry[key])
        })
      }
    })
    .then(() => {
      if (Array.isArray(baseConfig.entry)) {
        let webpackConfig = require('../webpack/webpack.config');
        let buildConfig = webpackMerge(
          webpackBaseConfig(baseConfig, argv), webpackConfig(baseConfig)
        );
        // console.log(buildConfig);
        return this.webpackPromise(buildConfig);
      } else {
        let webpackJsConfig = require('../webpack/webpack.config.js.js');
        let jsConfig = webpackMerge(
          webpackBaseConfig(baseConfig, argv), webpackJsConfig(baseConfig)
        );
        let webpackCssConfig = require('../webpack/webpack.config.css');
        let cssConfig = webpackMerge(
          webpackBaseConfig(baseConfig, argv), webpackCssConfig(baseConfig)
        );
        return this.webpackPromise(jsConfig).then(stats => {
          return this.webpackPromise(cssConfig);
        }).then(stats => {
          return Promise.map(Object.keys(cssConfig.entry), entry => {
            rimraf.sync(path.join(cwd, process.env.PUBLISH_DIR, 'css', `${entry}.js`))
          })
        })
      }
    })
    .then(() => {
      return utilFs.copyFileSync(
        path.join(__dirname, '../external/react.js'),
        path.join(cwd, process.env.PUBLISH_DIR, 'js/react.js')
      );
    })

  }

  checkRouter(config) {
    return new Promise((resolve, reject) => {
      if (!Array.isArray(config.entry)) resolve(false);
      for (let i in config.entry) {
        let fileName = config.entry[i];
        let strFile = String(
          fs.readFileSync(config.jsPath + config.path + `/${fileName}.js`)
        );
        if (strFile.indexOf('react-router') > -1) resolve(true);
      }
      resolve(false);
    })
  }

  generateRouterTempFile(config) {
    return Promise.map(config.entry, fileName => {
      try {
        let exists = fs.existsSync(config.jsPath + config.path + `/${fileName}.jsx`);
        if (exists) {
          let strJsx = String(fs.readFileSync(config.jsPath + config.path + `/${fileName}.jsx`));
          if (strJsx.indexOf('/** generated temporary file **/') < 0) {
            throw new Error(`error generateRouterTempFile: ` +
              config.jsPath + config.path + `/${fileName}.jsx` +
              ` 为非系统生成临时文件 请重命名`);
          }
        }
        let strFile = String(fs.readFileSync(config.jsPath + config.path + `/${fileName}.js`));
        strFile = strFile.replace(/import.+['"]react-router['"]/, '');
        strFile = strFile.replace(/<Router[\s\S]+<\/Router>/, function(str) {
          str = str.replace(/<Router[^<]*>/, '<div>');
          str = str.replace('</Router>', '</div>');
          str = str.replace(/<IndexRedirect[^<]*>/g, '');
          str = str.replace(/<Redirect[^<]*>/g, '');
          str = str.replace(/<IndexRoute[^<]*>/g, function(match) {
            match = match.replace(/[\s\S]+component\s*=\s*\{/i, '');
            match = match.replace(/\}[\s\S]+/, '');
            return '<' + match + '/>';
          });
          str = str.replace(/<Route[^<]*>/g, function(match) {
            match = match.replace(/[\s\S]+component\s*=\s*\{/i, '');
            match = match.replace(/\}[\s\S]+/, '');
            return '<' + match + '/>';
          });
          return str;
        });
        strFile = '/** generated temporary file **/\r\n' + strFile;
        fs.writeFileSync(config.jsPath + config.path + `/${fileName}.jsx`, strFile);
      } catch (err) {
        throw err;
      }
    })
  }

  webpackPromise(config) {
    return new Promise((resolve, reject) => {
      webpack(config, (err, stats) => {
        if (err) reject(new Error('Build failed'));
        resolve(stats);
      })
    })
  }

  reactDOMRender(config, fileName) {
    global.React = require('react');
    global.ReactDOM = require('react-dom');
    global.ReactDOMServer = require('react-dom/server');

    global.document = {
      querySelector: function(x) { return x; },
      getElementById: function(x) { return '#' + x; },
      getElementsByTagName: function() { return [] }
    };

    let devDir = config.devDirectory || '_tmp';

    ReactDOM.render = (dom, place) => {
      let reg;
      if (place.indexOf(".") >= 0) {
        let str = place.slice((place.indexOf(".") + 1));
        reg = new RegExp("<.+class=.+" + str + "[^<]+>", "i");
      } else if (place.indexOf("#") >= 0) {
        let str = place.slice((place.indexOf("#") + 1));
        reg = new RegExp("<.+id=.+" + str + "[^<]+>", "i");
      }
      let htmlPath = path.join(process.cwd(),
        config.htmlPath, config.path, `${fileName}.html`);
      let html = ReactDOMServer.renderToStaticMarkup(dom);

      let content = String(fs.readFileSync(htmlPath))
        .replace(reg, match => { return match + html })
      let distHtmlPath = path.join(process.cwd(),
        process.env.PUBLISH_DIR, 'html', config.path, `${fileName}.html`);

      mkdirp.sync(path.join(process.cwd(),
        process.env.PUBLISH_DIR, 'html', config.path));
      fs.writeFileSync(distHtmlPath, content);
    }

    try {
      let page = path.join(process.cwd(),
        devDir, 'ssr', config.path, `${fileName}.js`);
      require(page);
    } catch (err) {
      throw err;
    }
  }


}

module.exports = Build;