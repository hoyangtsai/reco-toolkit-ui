const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require('extract-text-webpack-plugin');
const extractSCSS = new ExtractTextPlugin('css/[name].css');
const entryMap = require('../helper/entryMap');
const commonsChunk = require('../helper/commonsChunk');

module.exports = function(baseConfig) {
  let plugins = [extractSCSS];

  let chunkConfig = commonsChunk(baseConfig);
  if (chunkConfig) {
    plugins.push(new webpack.optimize.CommonsChunkPlugin(chunkConfig));
  }

  const projHtmlTplPath = baseConfig.webpack.plugins.HtmlWebpackPlugin.template || '';
  const libHtmlTplPath = path.join(__dirname, '../../resources/template/html.dev.ejs');
  const htmlTempl = fs.existsSync(projHtmlTplPath) ? projHtmlTplPath : libHtmlTplPath;

  if (Array.isArray(baseConfig.webpack.entry)) {
    baseConfig.webpack.entry.map((page) => {
      const conf = {
        inject: true,
        chunks: chunkConfig ? [chunkConfig.name, page] : [page],
        template: htmlTempl,
        filename: `html/${page}.html`,
        title: page,
        reactjs: '../js/react.js'
      }
      plugins.push( new HtmlWebpackPlugin(conf) );
    })
  } else {
    Object.keys(baseConfig.webpack.entry).map((key) => {
      baseConfig.webpack.entry[key].map((page) => {
        const conf = {
          inject: true,
          chunks: chunkConfig ? [chunkConfig.name, page] : [page],
          template: htmlTempl,
          filename: `html/${page}.html`,
          title: page,
          reactjs: '../js/react.js'
        }
        plugins.push( new HtmlWebpackPlugin(conf) );
      })
    })
  }

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
        sourceMap: true
      }
    }
  ];

  if (baseConfig.postcss) {
    let packageJson = require(path.join(process.cwd(), 'package.json'));
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
    })
  }
  sassLoaders.push('sass-loader');

  return {
    context: path.join(process.cwd(), 'client'),
    entry: entryMap(baseConfig),
    output: {
      path: path.join(process.cwd(), process.env.PUBLISH_DIR),
      filename: 'js/[name].js',
      publicPath: '../',
    },
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
                  sourceMap: true
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
