const fs = require('fs');
const path = require('path');
const webpack = require('webpack');
const ProgressBarPlugin = require('progress-bar-webpack-plugin');
const babelConfig = require('../babel-config');
const chalk = require('chalk');

function readJson(file) {
  if (file in readJson.cache) return readJson.cache[file];
  let ret;
  try {
    ret = JSON.parse(fs.readFileSync(file));
  } catch (e) {
    console.log(e);
    process.exit();
  }
  return readJson.cache[file] = ret;
}
readJson.cache = {};

module.exports = function(baseConfig, argv) {
  baseConfig.webpack = baseConfig.hasOwnProperty('webpack') ? baseConfig.webpack : {};

  const packageJson = require(path.resolve(process.cwd(), 'package.json'));

  const babelrc = fs.existsSync(path.resolve(process.cwd(), '.babelrc')) ?
    readJson(path.resolve(process.cwd(), '.babelrc')) || {} :
    packageJson.babel || {};

  let plugins = [
    new webpack.DefinePlugin({
      'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
    })
  ];

  if (process.env.NODE_ENV === 'development') {
    plugins = [
      new webpack.optimize.OccurrenceOrderPlugin(),
      new webpack.HotModuleReplacementPlugin(),
      new webpack.NoEmitOnErrorsPlugin()
    ];
  } else {
    plugins = [
      new ProgressBarPlugin({
        format: 'build [:bar] ' + chalk.green.bold(':percent') +
          ' (:elapsed seconds) ' + chalk.gray(':msg'),
        renderThrottle: 100,
        clear: false
      })
    ];

    if (argv.m || argv.minify) {
      plugins.push(
        new webpack.optimize.UglifyJsPlugin({
          compress: {
            warnings: false
          },
          output: {
            comments: false
          }
        })
      );
    }
  }

  const baseConfigPlugins = baseConfig.webpack.plugins || [];

  let config = {
    context: baseConfig.webpack.context || path.join(process.cwd(), 'client'),
    cache: true,

    output: {
      publicPath: '/',
      filename: '[name].js'
    },

    module: {
      rules: [
        {
          test: /\.jsx?$/,
          exclude: /node_modules/,
          use: [
            {
              loader: 'babel-loader',
              options: Object.assign(
                babelConfig(process.env.NODE_ENV),
                babelrc
              )
            }
          ]
        }
      ]
    },

    externals: Object.assign({
      'react': 'React',
      'react-dom': 'ReactDOM'
    }, baseConfig.webpack.externals || {}),

    resolve: {
      extensions: ['.js', '.jsx', '.json', '.scss', '.sass', '.css'],
      alias: baseConfig.webpack.resolve && baseConfig.webpack.resolve.alias || {},
      symlinks: false,
      modules: [
        'node_modules',
        process.env.MODULE_PATH
      ]
    },

    resolveLoader: {
      modules: [
        'node_modules',
        process.env.MODULE_PATH,
        path.resolve(process.cwd(), 'node_modules')
      ]
    },

    plugins: plugins.concat(baseConfigPlugins),

    stats: process.env.NODE_ENV === 'production' ? {} : {
      hash: false,
      chunks: false,
      chunkModules: false,
      children: false
    },
  };

  if (baseConfig.webpack.module && Array.isArray(baseConfig.webpack.module.rules)) {
    baseConfig.webpack.module.rules.map((loader) => {
      config.module.rules.push(loader);
    });
  }

  return config;
}
