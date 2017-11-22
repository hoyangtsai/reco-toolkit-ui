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

function Build(ctx) {
  process.env.NODE_ENV = 'production';
  process.env.MODULE_PATH = path.join(__dirname, '../../../../');
  process.env.PUBLISH_DIR = 'publish';

  const {
    cwd,
    argv
  } = ctx;

  const userConfig = require(path.join(cwd, 'config/reco-config.js'));
  const pageConfig = require(path.join(cwd, userConfig.pageConfig));
  const baseConfig = Object.assign({}, userConfig, pageConfig);

  const webpackBaseConfig = require('../webpack/webpack.config.base');

  let ssrConfig;

  return checkRouter(baseConfig).then((hasRouter) => {
    argv.hasRouter = hasRouter;
    if (argv.hasRouter) {
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

    if (Array.isArray(baseConfig.entry)) {
      return Promise.map(baseConfig.entry, (page) => {
        reactDOMRender(baseConfig, page);
      })
    } else {
      return Promise.map(Object.keys(baseConfig.entry), (key) => {
        return Promise.map(baseConfig.entry[key], (page) => {
          reactDOMRender(baseConfig, page);
        })
      })
    }
  })
  .then(() => {
    if (argv.hasRouter) {
      return Promise.map(Object.keys(ssrConfig.entry), (key) => {
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
    return utilFs.copyFileSync(
      path.join(__dirname, '../external/react.js'),
      path.join(cwd, process.env.PUBLISH_DIR, 'js/react.js')
    );
  })
}

function checkRouter(config) {
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

function reactDOMRender(config, fileName) {
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

function webpackPromise(config) {
  return new Promise((resolve, reject) => {
    webpack(config, (err, stats) => {
      if (err) reject(new Error('Build failed'));
      resolve(stats);
    })
  })
}

module.exports = Build;