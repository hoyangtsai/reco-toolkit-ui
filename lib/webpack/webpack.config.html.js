const fs = require('fs');
const pathFn = require('path');
const webpack = require('webpack');
const entryMap = require('../helper/entryMap');

module.exports = function(baseConfig, argv) {
  let plugins = [
    new webpack.DefinePlugin({
      PRODUCTION: JSON.stringify(process.env.NODE_ENV),
      NODE_ENV: JSON.stringify(process.env.NODE_ENV)
    })
  ];

  const devDir = baseConfig.devDirectory || '_tmp';
  const entries = entryMap(baseConfig);

  if (argv.hasRouter) {
    for (let key in entries) {
      entries[key] += '.jsx';
    }
  }

  return {
    entry: entries,
    output: {
      path: pathFn.join(process.cwd(), devDir, 'ssr')
    },
    module: {
      rules:[
        {
          test: /\.s?css$/,
          loader: 'null-loader'
        },
        {
          test: /\.(jpe?g|png|gif|ttf|eot|woff2?)$/,
          loader: 'file-loader',
          options: {
            name: '[path][name].[ext]'
          }
        }
      ]
    },
    plugins: plugins,
    target: 'node'
  }
}
