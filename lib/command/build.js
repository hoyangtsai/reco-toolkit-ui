const Command = require('@tencent/reco-bin');
const path = require('path');

class ServerCommand extends Command {
  constructor(rawArgv) {
    super(rawArgv);

    this.usage = 'Usage: reco build [options]';
    this.name = 'build';
    this.options = {
      hasRouter: {
        type: 'boolean',
        desc: 'using react-router',
        default: false,
      },
      outputHtml: {
        type: 'boolean',
        desc: 'Pre-render static html files',
        default: true,
      }
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

    const build = require('../scripts/build');
    build(this.ctx);
  }
}

module.exports = ServerCommand;
