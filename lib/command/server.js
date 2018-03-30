const path = require('path');

module.exports = reco => class Server extends reco.Command {
  constructor(rawArgv) {
    super(rawArgv);

    this.usage = 'Usage: reco server [env] [options]';
    this.name = 'server';
    this.options = {
      port: {
        desc: 'http port',
        alias: 'p',
        type: 'number',
        default: 8080,
      },
      open: {
        desc: 'whether open the browser',
        alias: 'o',
        type: 'boolean',
        default: false,
      },
    };
  }

  get description() {
    return 'Run webpack dev server';
  }

  * run() {
    const { cwd } = this.ctx;
    const pkgJson = require(path.join(cwd, 'package.json'));

    if (!pkgJson.template || !pkgJson.template.toolkit) {
      this.error('Current project missing template info, please contact @keithytsai to set up!');
    }

    const server = require('../scripts/server');
    server.call(this, this.ctx);
  }
};