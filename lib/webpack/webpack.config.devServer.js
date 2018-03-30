const path = require('path');
const entryMap = require('../helper/entryMap');
const fs = require('fs');
const glob = require('glob');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const HtmlWebpackIncludeAssetsPlugin = require('html-webpack-include-assets-plugin');

function Y() {
  return require('../util/y18n')
}

module.exports = function(baseConfig) {
  baseConfig.webpack = baseConfig.hasOwnProperty('webpack') ? baseConfig.webpack : {};

  const devDir = baseConfig.devDirectory || '_tmp';
  const plugins = [];

  const sassLoaders = [
    {
      loader: 'cache-loader',
      options: {
        cacheDirectory: path.join(process.cwd(), '.cache')
      }
    },
    'style-loader',
    {
      loader: 'css-loader',
      options: {
        importLoaders: 1
      }
    }
  ];

  if (baseConfig.postcss) {
    const pkgJson = require(path.join(process.cwd(), 'package.json'));
    const browsers = pkgJson.browserslist ||
      ['last 4 versions', 'Android >= 4.0', 'Chrome >= 37', 'iOS>=7'];

    sassLoaders.push({
      loader: 'postcss-loader', options: {
        plugins: (loader) => [
          require('autoprefixer')({ browsers }),
          require('postcss-flexbugs-fixes'),
          require('postcss-gradientfixer')
        ]
      }
    })
  }
  sassLoaders.push('sass-loader');

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
          } else {
            this.warn(Y()`${key} defined template ${entry[key]} not found.`);
          }
        });
      }
    });
  }

  if (Array.isArray(baseConfig.webpack.entry)) {
    baseConfig.webpack.entry.forEach((page) => {
      plugins.push(new HtmlWebpackPlugin({
          inject: true,
          chunks: [page],
          template: htmlTemplMap.hasOwnProperty(page) ?
            htmlTemplMap[page] : commonHtmlTmpl,
          filename: `${page}.html`,
          title: page
        })
      );
    })
  } else if (baseConfig.webpack.entry instanceof Object) {
    Object.keys(baseConfig.webpack.entry).forEach((key) => {
      baseConfig.webpack.entry[key].forEach((page) => {
        plugins.push(new HtmlWebpackPlugin({
            inject: true,
            chunks: [page],
            template: htmlTemplMap.hasOwnProperty(page) ?
              htmlTemplMap[page] : commonHtmlTmpl,
            filename: `${page}.html`,
            title: page
          })
        )
      })
    })
  }

  plugins.push(
    new HtmlWebpackIncludeAssetsPlugin({
      assets: ['react.js'],
      append: false
    })
  );

  return {
    entry: entryMap(baseConfig),

    output: {
      path: path.join(process.cwd(), devDir),
      publicPath: `http://localhost:${process.env.SERVER_PORT}/`
    },
    module: {
      rules:[
        {
          test: /\.scss$/,
          use: sassLoaders
        },
        {
          test: /\.css$/,
          use: [
            'style-loader',
            {
              loader: 'css-loader',
              options: {
                importLoaders: 1
              }
            }
          ]
        }
      ]
    },
    plugins: plugins,
    devtool: 'eval'
  }
}
