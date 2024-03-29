const path = require('path');

module.exports = reco => class Build extends reco.Command {
  constructor(rawArgv) {
    super(rawArgv);

    this.usage = 'Usage: reco build [options]';
    this.name = 'build';
    this.options = {
      prerender: {
        type: 'boolean',
        desc: 'Pre-render static html files',
        default: true,
      }
    };
  }

  get description() {
    return 'Build react code';
  }

  * run() {
    const { cwd } = this.ctx;
    const pkgJson = require(path.join(cwd, 'package.json'));

    if (!pkgJson.template || !pkgJson.template.toolkit) {
      this.error('Current project missing template info, please contact @keithytsai to set up!');
    }

    const build = require('../scripts/build');
    build.call(this, this.ctx);
  }
};
