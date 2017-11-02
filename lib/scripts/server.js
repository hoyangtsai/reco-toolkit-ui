// const debug = require('debug')('reco-toolkit-ui');
// const Command = require('@tencent/nodinx-cli/lib/command');

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

// class Server extends Command {
class Server {
  constructor(ctx) {
    this.ctx = ctx;
    this.options = {
      port: {
        type: 'number',
        desc: 'server port'
      },
      open: {
        type: 'string',
        desc: 'open the browser after compilation'
      }
    }

    Object.assign(this.options, ctx.argv);

    process.env.NODE_ENV = 'development';
    process.env.SERVER_PORT = this.options.port;
    process.env.MODULE_PATH = path.join(__dirname, '../../node_modules');
  }

  * run() {
    console.log('server run ...');
    const {
      cwd,
      argv,
      env
    } = this.ctx;

    const ip = argv.i || argv.ip || '0.0.0.0';
    const port = parseInt(argv.port || argv.p) || 8001;

    const baseConfig = require(path.join(cwd, 'config/reco-config.js'));

    const devDir = baseConfig.devDirectory || 'dist';
    let startup = false;

    return this.checkPort(ip, port).then(function() {
      return utilFs.copyFileSync(
        path.join(__dirname, '../external/react_dev.js'),
        path.join(cwd, devDir, 'react.js')
      );
    })
    .then(function() {
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

      const compiler = webpack(serverConfig);
      return compiler;
    })
    .then(function(compiler) {
      const contentBase = path.join(cwd, devDir, baseConfig.path, '/').replace(/\\/g, '/');
      const publicPath = '/';
      return this.startServer(compiler, contentBase, publicPath, ip, port);
    }.bind(this))
    .catch(function(err) {
      switch (err.code) {
        case 'EADDRINUSE':
          console.log('Port %d has been used. Try another port instead.', port);
          break;
      }
      throw err;
    })
  }

  checkPort(ip, port) {
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

  startServer(compiler, contentBase, publicPath, ip, port) {
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

  formatAddress(ip, port, root) {
    if (ip === '0.0.0.0') ip = 'localhost';
    return format('http://%s:%d/%s', ip, port, root);
  }
}

module.exports = Server;