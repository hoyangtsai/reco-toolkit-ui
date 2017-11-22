const pathFn = require('path');
const entryMap = require('../helper/entryMap');
const fs = require('fs');
const HtmlWebpackPlugin = require('html-webpack-plugin');

module.exports = function(baseConfig) {
  baseConfig.webpack = baseConfig.hasOwnProperty('webpack') ? baseConfig.webpack : {};

  let plugins = [];

  let styLoader = [
    {
      loader: 'cache-loader',
      options: {
        cacheDirectory: pathFn.resolve(process.cwd(), '.cache')
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
    let packageJson = require(pathFn.join(process.cwd(), 'package.json'));
    let browsers = packageJson.browserslist ||
      ['last 4 versions', 'Android >= 4.0', 'Chrome >= 37', 'iOS>=7'];

    styLoader.push({
      loader: 'postcss-loader', options: {
        plugins: (loader) => [
          require('autoprefixer')({ browsers }),
          require('postcss-flexbugs-fixes'),
          require('postcss-gradientfixer')
        ]
      }
    })
  }
  styLoader.push('sass-loader');

  const projHtmlTplPath = baseConfig.webpack.plugins.HtmlWebpackPlugin.template || '';
  const libHtmlTplPath = pathFn.join(__dirname, '../../resources/template/html.dev.ejs');
  const htmlTempl = fs.existsSync(projHtmlTplPath) ? projHtmlTplPath : libHtmlTplPath;

  if (Array.isArray(baseConfig.webpack.entry)) {
    baseConfig.webpack.entry.map((page) => {
      plugins.push(new HtmlWebpackPlugin({
          inject: true,
          chunks: [page],
          template: htmlTempl,
          filename: `${page}.html`,
          title: page,
          reactjs: '/react.js'
        })
      );
    })
  } else {
    Object.keys(baseConfig.webpack.entry).map((key) => {
      baseConfig.webpack.entry[key].map((page) => {
        plugins.push(new HtmlWebpackPlugin({
            inject: true,
            chunks: [page],
            template: htmlTempl,
            filename: `${page}.html`,
            title: page,
            reactjs: '/react.js'
          })
        )
      })
    })
  }

  return {
    entry: entryMap(baseConfig),

    output: {
      publicPath: `http://localhost:${process.env.SERVER_PORT}/`
    },
    module: {
      rules:[
        {
          test: /\.scss$/,
          use: styLoader
        }
      ]
    },
    plugins: plugins,
    devtool: 'eval'
  }
}
