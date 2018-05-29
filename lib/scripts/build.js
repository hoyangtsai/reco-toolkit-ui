const fs = require('fs');
const utilFs = require('../util/fs');
const path = require('path');
const Promise = require('bluebird');
const chalk = require('chalk');
const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const rimraf = Promise.promisify(require('rimraf'));
const yargs = require('yargs');
const mkdirp = require('mkdirp');
const del = require('del');
const cheerio = require('cheerio');
const beautifyHtml = require('js-beautify').html;
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

function Build(ctx) {
  process.env.NODE_ENV = 'production';
  process.env.MODULE_PATH = path.join(__dirname, '../../node_modules');
  process.env.PUBLISH_DIR = 'publish';

  const { cwd, argv } = ctx;

  const baseConfig = require(path.join(cwd, 'config/reco-config.js'));
  baseConfig.webpack = baseConfig.hasOwnProperty('webpack') ? baseConfig.webpack : {};

  const webpackBaseConfig = require('../webpack/webpack.config.base');

  let ssrConfig;
  const htmlMap = [];

  return checkRouter(baseConfig).then((hasRouter) => {
    argv.hasRouter = hasRouter;
    if (argv.prerender && argv.hasRouter) {
      return generateRouterTempFile(baseConfig);
    }
  })
  .then(() => {
    if (!argv.prerender) return;
    let webpackHtmlConfig = require('../webpack/webpack.config.html');
    ssrConfig = webpackMerge(
      webpackBaseConfig(baseConfig, argv), webpackHtmlConfig(baseConfig, argv)
    );
    return webpackPromise(ssrConfig);
  })
  .then(() => {
    if (!argv.prerender) return;

    if (Array.isArray(baseConfig.webpack.entry)) {
      return Promise.map(baseConfig.webpack.entry, (page) => {
        reactDOMRender(baseConfig, page, htmlMap);
      })
    } else {
      return Promise.map(Object.keys(baseConfig.webpack.entry), (key) => {
        return Promise.map(baseConfig.webpack.entry[key], (page) => {
          reactDOMRender(baseConfig, page, htmlMap);
        })
      })
    }
  })
  .then(() => {
    if (argv.prerender && argv.hasRouter) {
      return Promise.map(Object.keys(ssrConfig.entry), (key) => {
        rimraf.sync(ssrConfig.entry[key])
      })
    }
  })
  .then(() => {
    if (Array.isArray(baseConfig.webpack.entry)) {
      let webpackConfig = require('../webpack/webpack.config');
      let buildConfig = webpackMerge(
        webpackBaseConfig(baseConfig, argv), webpackConfig.call(this, baseConfig, argv)
      );
      return webpackPromise(buildConfig);
    } else {
      let webpackJsConfig = require('../webpack/webpack.config.js.js');
      let jsConfig = webpackMerge(
        webpackBaseConfig(baseConfig, argv), webpackJsConfig.call(this, baseConfig, argv)
      );
      let webpackCssConfig = require('../webpack/webpack.config.css');
      let cssConfig = webpackMerge(
        webpackBaseConfig(baseConfig, argv), webpackCssConfig(baseConfig, argv)
      );

      return webpackPromise(jsConfig).then((stats) => {
        return webpackPromise(cssConfig);
      }).then((stats) => {
        return Promise.map(Object.keys(cssConfig.entry), (entry) => {
          rimraf.sync(path.join(cwd, process.env.PUBLISH_DIR, `${entry}.js`))
        });
      })
    }
  })
  .then(() => {
    if (argv.prerender) {
      htmlMap.forEach((htmlInfo, index) => {
        const htmlPath = path.join(
          process.cwd(), process.env.PUBLISH_DIR,
          'html', `${htmlInfo.fileName}.html`).replace(/\\/g, '/');

        const $ = cheerio.load(fs.readFileSync(htmlPath), {
          decodeEntities: false
        });
        const jsbeautifyConfig = {
          "indent_size": 2
        };
        $('div.wrapper').text(htmlInfo.staticMarkup);
        fs.writeFileSync(htmlPath, beautifyHtml($.html(),
          Object.assign(jsbeautifyConfig, baseConfig.jsbeautify)
        ));
      });
    }
    return utilFs.copyFileSync(
      path.join(__dirname, '../external/react.js'),
      path.join(cwd, process.env.PUBLISH_DIR, 'js/react.js')
    );
  })
  .catch((err) => {
    this.error(err);
  })
}

function checkRouter(config) {
  return new Promise((resolve, reject) => {
    if (!Array.isArray(config.webpack.entry)) resolve(false);
    let hasRouter = false;
    for (let i in config.webpack.entry) {
      let fileName = config.webpack.entry[i];
      let strFile = String(
        fs.readFileSync(path.join(config.webpack.context, `/${fileName}.js`))
      );
      if (strFile.indexOf('react-router') > -1) {
        hasRouter = true;
        break;
      }
    }
    if (hasRouter) {
      resolve(true);
    } else {
      resolve(false);
    }
  })
}

function reactDOMRender(config, fileName, htmlMap) {
  const htmlInfo = { fileName };
  const window = (new JSDOM(`<!DOCTYPE html><html><body></body></html>`)).window;

  global.React = require('react');
  global.ReactDOM = require('react-dom');
  global.ReactDOMServer = require('react-dom/server');

  global.window = window;
  global.document = window.document;

  ReactDOM.render = (dom, selector) => {
    htmlInfo.selector = selector;
    htmlInfo.staticMarkup = ReactDOMServer.renderToStaticMarkup(dom);
    htmlMap.push(htmlInfo);
  }
  try {
    const devDir = config.devDirectory || '_tmp';
    const page = path.join(process.cwd(), devDir, 'ssr', `${fileName}.js`);
    require(page);
  } catch (err) {
    throw err;
  }
}

function webpackPromise(config) {
  return new Promise((resolve, reject) => {
    webpack(config, (err, stats) => {
      if (err) {
        reject(err);
      } else if (stats.hasErrors()) {
        const statsJson = stats.toJson();
        reject(statsJson.errors.toString());
      }
      resolve(stats);
    })
  })
}

function generateRouterTempFile(config) {
  let result = true;
  for (let i in config.webpack.entry) {
    let fileName = config.webpack.entry[i];
    try {
      const routerJsxPath = path.join(config.webpack.context, `/${fileName}.js.jsx`);
      let exists = fs.existsSync(routerJsxPath);
      if (exists) {
        let strJsx = String(fs.readFileSync(routerJsxPath));
        if (strJsx.indexOf('/** generated temporary file **/') < 0) {
          console.error(`error generateRouterTempFile: ${routerJsxPath} 为非系统生成临时文件 请重命名`);
          result = false;
          break;
        }
      }
      var strFile = String(fs.readFileSync(path.join(config.webpack.context, `/${fileName}.js`)));
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
      strFile = `/** generated temporary file **/\r\n${strFile}`;
      fs.writeFileSync(routerJsxPath, strFile);
    } catch (e) {
      result = false;
      console.error(`error generateRouterTempFile: ${e}`);
    }
  }
  return result;
}

module.exports = Build;