'use strict';

const fs = require('fs');
const utilFs = require('../util/fs');
const pathFn = require('path');
const Promise = require('bluebird');
const format = require('util').format;
const open = require('opn');
const net = require('net');
const webpack = require('webpack');
const webpackMerge = require('webpack-merge');
const WebpackDevServer = require('webpack-dev-server');
const chalk = require('chalk');
const ifaces = require('os').networkInterfaces();
const ProgressBarPlugin = require('progress-bar-webpack-plugin');

module.exports = function(ctx) {
  const {
    cwd,
    argv,
    env
  } = ctx;

  const ip = argv.i || argv.ip || '0.0.0.0';
  const port = parseInt(argv.port || argv.p) || 8001;

  process.env.SERVER_PORT = port;
  process.env.MODULE_PATH = pathFn.join(__dirname, '../../node_modules');

  const baseConfig = require(pathFn.join(cwd, 'config/nodinx.config.js'));

  const devDir = baseConfig.devDirectory || 'dist';
  let startup = false;

  return checkPort(ip, port).then(function() {
    return utilFs.copyFileSync(
      pathFn.join(__dirname, '../external/react_dev.js'),
      pathFn.join(cwd, devDir, 'react.js')
    );
  })
  .then(function() {
    const webpackBasePath = '../webpack/webpack.config.base.js';
    const webpackdevServPath = '../webpack/webpack.config.devServer.js';

    const projWebpackBasePath = pathFn.join(cwd, 'config', webpackBasePath);
    const projWebpackDevServPath = pathFn.join(cwd, 'config', webpackdevServPath);

    const webpackBaseConfig = fs.existsSync(projWebpackBasePath) ?
      require(projWebpackBasePath) : require(webpackBasePath);
    const webpackDevServerConfig = fs.existsSync(projWebpackDevServPath) ?
      require(projWebpackDevServPath) : require(webpackdevServPath);

    const serverConfig = webpackMerge(
      webpackBaseConfig(baseConfig, argv), webpackDevServerConfig(baseConfig));

    // console.log(serverConfig.module.rules[0].use[0].options);
    // console.log(serverConfig);

    if (!argv.silent) {
      serverConfig.plugins.push(
        new ProgressBarPlugin({
          format: 'build [:bar] ' + chalk.green.bold(':percent') +
            ' (:elapsed seconds) ' + chalk.gray(':msg'),
          renderThrottle: 100,
          clear: false,
          summary: false,
          callback: function() {
            console.info(chalk.yellow(
              'Webpack server is running. Press Ctrl+C to stop.'));
            console.info(chalk.yellow('Server listening at:'));

            Object.keys(ifaces).map(key => {
              ifaces[key].map(details => {
                if (details.family === 'IPv4') {
                  console.info(`http://${details.address}:` + chalk.green(`${port}`));
                }
              });
            });
            if ( (argv.o | argv.open) && !startup ) {
              const addr = formatAddress(ip, port, 'webpack-dev-server');
              open(addr);
            }
            startup = true;
          }
        })
      )
    }

    const compiler = webpack(serverConfig);
    return compiler;
  })
  .then(function(compiler) {
    const contentBase = pathFn.join(cwd, devDir, baseConfig.path, '/').replace(/\\/g, '/');
    const publicPath = '/';
    return startServer(compiler, contentBase, publicPath, ip, port);
  })
  .catch(function(err) {
    switch (err.code) {
      case 'EADDRINUSE':
        console.log('Port %d has been used. Try another port instead.', port);
        break;
    }
    throw err;
  })
}

function startServer(compiler, contentBase, publicPath, ip, port) {
  return new Promise(function(resolve, reject) {
    let server = new WebpackDevServer(compiler, {
      contentBase: contentBase,
      publicPath: publicPath,
      hot: true,
      noInfo: true,
      stats: {
        colors: true
      },
      headers: { "Access-Control-Allow-Origin": "*" }
    });

    server.listen(port, ip, function(error) {
      if (error) {
        reject(error);
      }
      resolve(server);
    });
  });
}

function checkPort(ip, port) {
  return new Promise(function(resolve, reject) {
    if (port > 65535 || port < 1) {
      return reject(new Error(
        `Invalid port number of ${port}. Try another port number between 1 and 65535.`));
    }

    let server = net.createServer();
    server.listen(port, ip);

    server.once('error', reject);

    server.once('listening', function() {
      server.close();
      resolve();
    });
  });
}

function formatAddress(ip, port, root) {
  if (ip === '0.0.0.0') ip = 'localhost';

  return format('http://%s:%d/%s', ip, port, root);
}