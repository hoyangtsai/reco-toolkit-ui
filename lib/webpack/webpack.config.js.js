const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const entryMap = require('../helper/entryMap');
const commonsChunk = require('../helper/commonsChunk');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CombyStatPlugin = require('@tencent/comby-stat-plugin');
const HtmlWebpackIncludeAssetsPlugin = require('html-webpack-include-assets-plugin');
const HtmlWebpackPathAssetsFix = require('html-webpack-plugin-assets-fix');

module.exports = function(baseConfig, argv) {
  if (Array.isArray(baseConfig.webpack.entry)) return;

  let plugins = [new CombyStatPlugin()];

  let chunkConfig = commonsChunk(baseConfig);
  if (chunkConfig) {
    plugins.push(new webpack.optimize.CommonsChunkPlugin(chunkConfig));
  }

  const htmlPluginConfig = baseConfig.webpack.recoCustom.htmlWebpackPlugin;
  const htmlTemplate = htmlPluginConfig.template || '';
  const libHtmlTempl = path.join(__dirname, '../template/index.ejs');
  let commonHtmlTmpl = libHtmlTempl;
  const htmlTemplMap = [];

  if (htmlTemplate && typeof htmlTemplate === 'string' && fs.existsSync(htmlTemplate)) {
    commonHtmlTmpl = htmlTemplate;
  } else if (Array.isArray(htmlTemplate) && htmlTemplate.length > 0) {
    htmlTemplate.forEach((entry) => {
      if (typeof entry === 'string' && fs.existsSync(entry)) {
        commonHtmlTmpl = entry;
      } else if (entry instanceof Object) {
        Object.keys(entry).forEach((key) => {
          if (fs.existsSync(entry[key])) {
            htmlTemplMap[key] = entry[key];
          }
        });
      }
    });
  }

  Object.keys(baseConfig.webpack.entry).forEach((key) => {
    baseConfig.webpack.entry[key].forEach((page) => {
      plugins.push(new HtmlWebpackPlugin({
          inject: true,
          chunks: chunkConfig ? [chunkConfig.name, page] : [page],
          template: htmlTemplMap[page] ? htmlTemplMap[page] : commonHtmlTmpl,
          filename: `html/${page}.html`,
          title: page,
          css: path.relative(path.dirname(`html/${page}`), `css/${key}.css`)
        })
      );
    })
  })

  plugins.push(
    new HtmlWebpackIncludeAssetsPlugin({
      assets: ['js/react.js'],
      append: false
    })
  );

  plugins.push(new HtmlWebpackPathAssetsFix());

  return {
    context: path.join(process.cwd(), 'client'),
    entry: entryMap(baseConfig),
    output: Object.assign({
        path: path.join(process.cwd(), process.env.PUBLISH_DIR),
        filename: 'js/[name].js',
        publicPath: '/'
      },
      baseConfig.webpack.output
    ),
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
