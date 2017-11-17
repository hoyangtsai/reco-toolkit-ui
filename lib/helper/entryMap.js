const path = require('path');

const dirname = /(.*?)\/node_modules\/.*/.exec(__dirname.replace(/\\/g, '/')) === null ?
  __dirname : /(.*?)\/node_modules\/.*/.exec(__dirname.replace(/\\/g, '/'))[1];

function getEntryMap(obj, name, absPath) {
  if (process.env.NODE_ENV === 'development') {
    let webpackHotDevServer = dirname === process.cwd().replace(/\\/g, '/') ?
      'webpack/hot/only-dev-server' :
        path.join(process.env.MODULE_PATH, 'webpack/hot/only-dev-server');
    let webpackDevServerClient = dirname === process.cwd().replace(/\\/g, '/') ?
      'webpack-dev-server/client' :
        path.join(process.env.MODULE_PATH, 'webpack-dev-server/client');

    // let webpackHotDevServer =
    //     path.join(__dirname, '../../node_modules/webpack/hot/only-dev-server');
    // let webpackDevServerClient =
    //     path.join(__dirname, '../../node_modules/webpack-dev-server/client');

    obj[name] = [
      webpackHotDevServer,
      `${webpackDevServerClient}?http://localhost:${process.env.SERVER_PORT}`,
      absPath
    ];
  } else {
    obj[name] = [absPath];
  }
}

module.exports = function(baseConfig) {
  let entryObj = {};

  if (Array.isArray(baseConfig.entry)) {
    for (let i in baseConfig.entry) {
      let fileName = baseConfig.entry[i];
      let absPath = path.join(process.cwd(),
        baseConfig.jsPath, baseConfig.path, `${fileName}.js`);
      getEntryMap(entryObj, fileName, absPath);
    }
  } else {
    let j = 0;
    for (let key in baseConfig.entry) {
      for (let i in baseConfig.entry[key]) {
        let fileName = baseConfig.entry[key][i];
        let absPath = path.join(process.cwd(),
          baseConfig.jsPath, baseConfig.path, `${fileName}.js`);
        getEntryMap(entryObj, fileName, absPath);
      }
      j++;
    }
  }
  return entryObj;
}
