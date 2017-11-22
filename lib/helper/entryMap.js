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

  if (Array.isArray(baseConfig.webpack.entry)) {
    for (let i in baseConfig.webpack.entry) {
      const fileName = baseConfig.webpack.entry[i];
      const absPath = path.join(baseConfig.webpack.context, `${fileName}.js`);
      getEntryMap(entryObj, fileName, absPath);
    }
  } else {
    let j = 0;
    for (let key in baseConfig.webpack.entry) {
      for (let i in baseConfig.webpack.entry[key]) {
        const fileName = baseConfig.webpack.entry[key][i];
        const absPath = path.join(baseConfig.webpack.context, `${fileName}.js`);
        getEntryMap(entryObj, fileName, absPath);
      }
      j++;
    }
  }
  return entryObj;
}
