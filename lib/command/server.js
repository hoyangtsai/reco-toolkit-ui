const Command = require('@tencent/reco-bin');
const path = require('path');

class ServerCommand extends Command {
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
        desc: 'whethe open the browser',
        alias: 'o',
        type: 'boolean',
        default: false,
      },
    };
    this.ctx = super.context;
  }

  get description() {
    return 'Run webpack dev server';
  }

  * run() {
    const { cwd } = this.ctx;
    const pkgJson = require(path.join(cwd, 'package.json'));

    if (!pkgJson.template || !pkgJson.template.toolkit) {
      this.error('Current project missing template info, please contact @allanyu to setting it!');
    }

    const server = require('../scripts/server');
    server(this.ctx);
  }
}

module.exports = ServerCommand;
