const fs = require('fs');
const utilFs = require('../util/fs');
const path = require('path');
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

function Server(ctx) {
  const {
    cwd,
    argv,
  } = ctx;

  process.env.NODE_ENV = 'development';
  process.env.SERVER_PORT = parseInt(argv.port || argv.p) || 8001;
  process.env.MODULE_PATH = path.join(__dirname, '../../node_modules');

  const ip = argv.i || argv.ip || '0.0.0.0';
  const port = process.env.SERVER_PORT;

  const baseConfig = require(path.join(cwd, 'config/reco-config.js'));

  const devDir = baseConfig.devDirectory || '_tmp';
  const outputPath = path.join(cwd, devDir);

  return checkPort(ip, port).then(() => {
    return utilFs.copyFileSync(
      path.join(__dirname, '../external/react_dev.js'),
      path.join(outputPath, 'react.js')
    );
  }).then(() => {
    const webpackBasePath = '../webpack/webpack.config.base.js';
    const webpackdevServPath = '../webpack/webpack.config.devServer.js';

    const projWebpackBasePath = path.join(cwd, 'config', webpackBasePath);
    const projWebpackDevServPath = path.join(cwd, 'config', webpackdevServPath);

    const webpackBaseConfig = fs.existsSync(projWebpackBasePath) ?
      require(projWebpackBasePath) : require(webpackBasePath);
    const webpackDevServerConfig = fs.existsSync(projWebpackDevServPath) ?
      require(projWebpackDevServPath) : require(webpackdevServPath);

    const serverConfig = webpackMerge(
      webpackBaseConfig(baseConfig, argv), webpackDevServerConfig(baseConfig));

    let startup = false;

    serverConfig.plugins.push(
      new ProgressBarPlugin({
        format: 'build [:bar] ' + chalk.green.bold(':percent') +
          ' (:elapsed seconds) ' + chalk.gray(':msg'),
        renderThrottle: 100,
        clear: false,
        summary: false,
        callback: () => {
          console.info(chalk.yellow(
            'Webpack server is running. Press Ctrl+C to stop.'));
          console.info(chalk.yellow('Server listening at:'));

          Object.keys(ifaces).map((key) => {
            ifaces[key].map((details) => {
              if (details.family === 'IPv4') {
                console.info(`http://${details.address}:${chalk.green(`${port}`)}`);
              }
            });
          });
          if ((argv.o || argv.open) && !startup) {
            const addr = formatAddress(ip, port, 'webpack-dev-server');
            open(addr);
          }
          startup = true;
        },
      })
    );
    const compiler = webpack(serverConfig);
    return compiler;
  }).then((compiler) => {
    const contentBase = path.join(outputPath, '/').replace(/\\/g, '/');
    const publicPath = '/';
    return startServer(compiler, contentBase, publicPath, ip, port);
  }).catch((err) => {
    switch (err.code) {
      case 'EADDRINUSE':
        console.log('Port %d has been used. Try another port instead.', port);
        break;
      default:
        break;
    }
    throw err;
  });
}

function checkPort(ip, port) {
  return new Promise((resolve, reject) => {
    if (port > 65535 || port < 1) {
      return reject(new Error(
        `Invalid port number of ${port}. Try another port number between 1 and 65535.`));
    }
    const server = net.createServer();
    server.listen(port, ip);

    server.once('error', reject);
    server.once('listening', () => {
      server.close();
      resolve();
    });
  });
}

function startServer(compiler, contentBase, publicPath, ip, port) {
  return new Promise((resolve, reject) => {
    const server = new WebpackDevServer(compiler, {
      contentBase: contentBase,
      publicPath: publicPath,
      hot: true,
      noInfo: true,
      stats: {
        colors: true,
      },
      historyApiFallback: true,
      headers: { 'Access-Control-Allow-Origin': '*' },
    });

    server.listen(port, ip, (error) => {
      if (error) {
        reject(error);
      }
      resolve(server);
    });
  });
}

function formatAddress(ip, port, root) {
  if (ip === '0.0.0.0') ip = 'localhost';
  return format('http://%s:%d/%s', ip, port, root);
}

module.exports = Server;
