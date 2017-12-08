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
const del = require('del');

function Build(ctx) {
  process.env.NODE_ENV = 'production';
  process.env.MODULE_PATH = path.join(__dirname, '../../node_modules');
  process.env.PUBLISH_DIR = 'publish';

  const {
    cwd,
    argv
  } = ctx;

  const baseConfig = require(path.join(cwd, 'config/reco-config.js'));
  baseConfig.webpack = baseConfig.hasOwnProperty('webpack') ? baseConfig.webpack : {};

  const webpackBaseConfig = require('../webpack/webpack.config.base');

  let ssrConfig;
  const htmlInfoList = [];
  
  return checkRouter(baseConfig).then((hasRouter) => {
    argv.hasRouter = hasRouter;
    if (argv.outputHtml && argv.hasRouter) {
      return generateRouterTempFile(baseConfig);
    }
  })
  .then(() => {
    if (!argv.outputHtml) return;

    let webpackHtmlConfig = require('../webpack/webpack.config.html');
    ssrConfig = webpackMerge(
      webpackBaseConfig(baseConfig, argv), webpackHtmlConfig(baseConfig, argv)
    );
    return webpackPromise(ssrConfig);
  })
  .then(() => {
    if (!argv.outputHtml) return;

    if (Array.isArray(baseConfig.webpack.entry)) {
      return Promise.map(baseConfig.webpack.entry, (page) => {
        reactDOMRender(baseConfig, page, htmlInfoList);
      })
    } else {
      return Promise.map(Object.keys(baseConfig.webpack.entry), (key) => {
        return Promise.map(baseConfig.webpack.entry[key], (page) => {
          reactDOMRender(baseConfig, page, htmlInfoList);
        })
      })
    }
  })
  .then(() => {
    if (argv.outputHtml && argv.hasRouter) {
      return Promise.map(Object.keys(ssrConfig.entry), (key) => {
        rimraf.sync(ssrConfig.entry[key])
      })
    }
  })
  .then(() => {
    if (Array.isArray(baseConfig.webpack.entry)) {
      let webpackConfig = require('../webpack/webpack.config');
      let buildConfig = webpackMerge(
        webpackBaseConfig(baseConfig, argv), webpackConfig(baseConfig)
      );
      return webpackPromise(buildConfig);
    } else {
      let webpackJsConfig = require('../webpack/webpack.config.js.js');
      let jsConfig = webpackMerge(
        webpackBaseConfig(baseConfig, argv), webpackJsConfig(baseConfig)
      );
      let webpackCssConfig = require('../webpack/webpack.config.css');
      let cssConfig = webpackMerge(
        webpackBaseConfig(baseConfig, argv), webpackCssConfig(baseConfig)
      );
      return webpackPromise(jsConfig).then((stats) => {
        return webpackPromise(cssConfig);
      }).then((stats) => {
        return Promise.map(Object.keys(cssConfig.entry), (entry) => {
          rimraf.sync(path.join(cwd, process.env.PUBLISH_DIR, 'css', `${entry}.js`))
        })
      })
    }
  })
  .then(() => {
    if (argv.outputHtml) {
      // 直出内容插入到html
      htmlInfoList.forEach((htmlInfo, index) => {
        let reg;
        if (htmlInfo.place.indexOf(".") >= 0) {
          let str = htmlInfo.place.slice((htmlInfo.place.indexOf(".") + 1));
          reg = new RegExp("<.+class=.+" + str + "[^<]+>", "i");
        } else if (htmlInfo.place.indexOf("#") >= 0) {
          let str = htmlInfo.place.slice((htmlInfo.place.indexOf("#") + 1));
          reg = new RegExp("<.+id=.+" + str + "[^<]+>", "i");
        }
        let htmlPath = path.join(process.cwd(),
          process.env.PUBLISH_DIR, `${htmlInfo.fileName}.html`);
        htmlPath = htmlPath.replace(/\\/g, '/');
        const content = String(fs.readFileSync(htmlPath))
          .replace(/\.\/\.\/css\//g, '../../css/') // TODO
          .replace(/\.\/\.\/js\//g, '../../js/') // TODO
          .replace(reg, match => { return match + htmlInfo.html })
        const distHtmlPath = path.join(htmlPath.replace('/container/', '/html/container/')); // TODO

        mkdirp.sync(path.join(process.cwd(),
          process.env.PUBLISH_DIR, 'html/container'));
        fs.writeFileSync(distHtmlPath, content);
      });
    } else {
      baseConfig.webpack.entry.forEach((fileName) => {
        let htmlPath = path.join(process.cwd(),
          process.env.PUBLISH_DIR, `${fileName}.html`);
        htmlPath = htmlPath.replace(/\\/g, '/');
        const content = String(fs.readFileSync(htmlPath))
          .replace(/\.\/\.\/css\//g, '../../css/') // TODO
          .replace(/\.\/\.\/js\//g, '../../js/') // TODO
        const distHtmlPath = path.join(htmlPath.replace('/container/', '/html/container/')); // TODO

        mkdirp.sync(path.join(process.cwd(),
          process.env.PUBLISH_DIR, 'html/container'));
        fs.writeFileSync(distHtmlPath, content);
      });
    }
    // TODO
    del.sync([path.join(process.cwd(), process.env.PUBLISH_DIR, 'container')]);
    return utilFs.copyFileSync(
      path.join(__dirname, '../external/react.js'),
      path.join(cwd, process.env.PUBLISH_DIR, 'js/react.js')
    );
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

function reactDOMRender(config, fileName, htmlInfoList) {
  global.React = require('react');
  global.ReactDOM = require('react-dom');
  global.ReactDOMServer = require('react-dom/server');

  global.document = {
    querySelector: function(x) { return x; },
    getElementById: function(x) { return '#' + x; },
    getElementsByTagName: function() { return [] }
  };

  let devDir = config.devDirectory || '_tmp';
  const htmlInfo = {
    fileName,
  }

  ReactDOM.render = (dom, place) => {
    // let reg;
    // if (place.indexOf(".") >= 0) {
    //   let str = place.slice((place.indexOf(".") + 1));
    //   reg = new RegExp("<.+class=.+" + str + "[^<]+>", "i");
    // } else if (place.indexOf("#") >= 0) {
    //   let str = place.slice((place.indexOf("#") + 1));
    //   reg = new RegExp("<.+id=.+" + str + "[^<]+>", "i");
    // }
    // let htmlPath = path.join(config.webpack.context, `${fileName}.html`);
    // let html = ReactDOMServer.renderToStaticMarkup(dom);
    htmlInfo.place = place
    htmlInfo.html = ReactDOMServer.renderToStaticMarkup(dom);
    htmlInfoList.push(htmlInfo)
    // let content = String(fs.readFileSync(htmlPath))
    //   .replace(reg, match => { return match + html })
    // let distHtmlPath = path.join(process.cwd(),
    //   process.env.PUBLISH_DIR, 'html', `${fileName}.html`);

    // mkdirp.sync(path.join(process.cwd(),
    //   process.env.PUBLISH_DIR, 'html'));
    // mkdirp.sync(path.join(process.cwd(),
    //   process.env.PUBLISH_DIR, 'container'));
    // fs.writeFileSync(distHtmlPath, content);
  }

  try {
    let page = path.join(process.cwd(),
      devDir, 'ssr', `${fileName}.js`);
    require(page);
  } catch (err) {
    throw err;
  }
}

function webpackPromise(config) {
  return new Promise((resolve, reject) => {
    webpack(config, (err, stats) => {
      if (err) reject(new Error('Build failed'));
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