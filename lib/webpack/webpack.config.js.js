const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const entryMap = require('../helper/entryMap');
const commonsChunk = require('../helper/commonsChunk');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = function(baseConfig) {
  if (Array.isArray(baseConfig.webpack.entry)) return;

  let plugins = [];

  let chunkConfig = commonsChunk(baseConfig);
  if (chunkConfig) {
    plugins.push(new webpack.optimize.CommonsChunkPlugin(chunkConfig));
  }

  const projHtmlTplPath = baseConfig.webpack.plugins.HtmlWebpackPlugin.template || '';
  const libHtmlTplPath = path.join(__dirname, '../../resources/template/html.dev.ejs');
  const htmlTempl = fs.existsSync(projHtmlTplPath) ? projHtmlTplPath : libHtmlTplPath;

  Object.keys(baseConfig.webpack.entry).map((key) => {
    baseConfig.webpack.entry[key].map((page) => {
      const conf = {
        inject: true,
        chunks: chunkConfig ? [chunkConfig.name, page] : [page],
        template: htmlTempl,
        filename: `html/${page}.html`,
        title: page,
        reactjs: '../js/react.js',
        css: `../css/${key}.css`
      }
      plugins.push( new HtmlWebpackPlugin(conf) );
    })
  })

  return {
    context: path.join(process.cwd(), 'client'),
    entry: entryMap(baseConfig),
    output: {
      path: path.join(process.cwd(), process.env.PUBLISH_DIR),
      filename: 'js/[name].js',
      publicPath: '../',
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
