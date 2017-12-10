const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const entryMap = require('../helper/entryMap');
const commonsChunk = require('../helper/commonsChunk');

module.exports = function(baseConfig) {
  let plugins = [];

  let chunkConfig = commonsChunk(baseConfig);
  if (chunkConfig) {
    plugins.push(new webpack.optimize.CommonsChunkPlugin(chunkConfig));
  }

  return {
    context: path.join(process.cwd(), 'client'),
    entry: entryMap(baseConfig),
    output: {
      path: path.join(process.cwd(), process.env.PUBLISH_DIR),
      filename: 'js/[name].js'
    },
    module: {
      rules:[
        {
          test: /\.s?css$/,
          loader: 'null-loader'
        },
        {
          test: /\.(jpe?g|png|gif|ttf|eot|woff2?)(\?.*)?$/,
          loader: 'file-loader',
          options: {
            name: '[path][name].[ext]'
          }
        }
      ]
    },
    plugins: plugins
  }
}
