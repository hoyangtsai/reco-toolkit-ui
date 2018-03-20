const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const extractSCSS = new ExtractTextPlugin('css/[name].css');
const entryMap = require('../helper/entryMap');
const commonsChunk = require('../helper/commonsChunk');
const CombyStatPlugin = require('@tencent/comby-stat-plugin');
const HtmlWebpackIncludeAssetsPlugin = require('html-webpack-include-assets-plugin');

module.exports = function(baseConfig, argv) {
  let plugins = [extractSCSS, new CombyStatPlugin()];

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

  if (Array.isArray(baseConfig.webpack.entry)) {
    baseConfig.webpack.entry.forEach((page) => {
      const htmlPluginConf = {
        inject: true,
        chunks: chunkConfig ? [chunkConfig.name, page] : [page],
        template: htmlTemplMap[page] ? htmlTemplMap[page] : commonHtmlTmpl,
        filename: `html/${page}.html`,
        title: page
      }
      plugins.push( new HtmlWebpackPlugin(htmlPluginConf) );
    })
  } else {
    Object.keys(baseConfig.webpack.entry).forEach((key) => {
      baseConfig.webpack.entry[key].forEach((page) => {
        const htmlPluginConf = {
          inject: true,
          chunks: chunkConfig ? [chunkConfig.name, page] : [page],
          template: htmlTemplMap[page] ? htmlTemplMap[page] : commonHtmlTmpl,
          filename: `html/${page}.html`,
          title: page
        }
        plugins.push( new HtmlWebpackPlugin(htmlPluginConf) );
      })
    })
  }

  plugins.push(
    new HtmlWebpackIncludeAssetsPlugin({
      assets: ['js/react.js'],
      append: false
    })
  );

  let sassLoaders = [
    {
      loader: 'cache-loader',
      options: {
        cacheDirectory: path.resolve(process.cwd(), '.cache')
      }
    },
    {
      loader: 'css-loader',
      options: {
        importLoaders: 1,
        sourceMap: true,
        minimize: argv.m || argv.minify ?
          { discardComments: { removeAll: true } } : false
      }
    }
  ];

  if (baseConfig.postcss) {
    const packageJson = require(path.join(process.cwd(), 'package.json'));
    let browsers = packageJson.browserslist ||
      ['last 4 versions', 'Android >= 4.0', 'Chrome >= 37', 'iOS>=7'];

    sassLoaders.push({
      loader: 'postcss-loader', options: {
        plugins: (loader) => [
          require('autoprefixer')({ browsers }),
          require('postcss-flexbugs-fixes'),
          require('postcss-gradientfixer')
        ]
      }
    });
  }
  sassLoaders.push('sass-loader');

  return {
    context: path.join(process.cwd(), 'client'),
    entry: entryMap(baseConfig),
    output: Object.assign({
        path: path.join(process.cwd(), process.env.PUBLISH_DIR),
        filename: 'js/[name].js',
        publicPath: '../'
      },
      baseConfig.webpack.output
    ),
    module: {
      rules: [
        {
          test: /\.scss$/,
          use: extractSCSS.extract({
            fallback: 'style-loader',
            use: sassLoaders,
            publicPath: '../'
          })
        },
        {
          test: /\.css$/,
          use: extractSCSS.extract({
            fallback: 'style-loader',
            use: [
              {
                loader: 'css-loader',
                options: {
                  importLoaders: 1,
                  sourceMap: true,
                  minimize: argv.m || argv.minify ?
                    { discardComments: { removeAll: true } } : false
                }
              }
            ]
          })
        }
      ]
    },
    plugins: plugins
  }
}
