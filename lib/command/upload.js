const path = require('path');

module.exports = reco => class Server extends reco.Command {
  constructor(rawArgv) {
    super(rawArgv);

    this.usage = 'Usage: reco upload';
    this.name = 'upload';
  }

  get description() {
    return 'Run reco upload';
  }

  * run() {
    const { cwd } = this.ctx;
    const pkgJson = require(path.join(cwd, 'package.json'));

    if (!pkgJson.template || !pkgJson.template.toolkit) {
      this.error('Current project missing template info, please contact @allanyu to setting it!');
    }

    const upload = require('../scripts/upload');
    upload(this.ctx);
  }
};