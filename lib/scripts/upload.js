const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const archiver = require('archiver');
const request = require('request');
const rimraf = require('rimraf');

function Upload(ctx) {
  const {
    cwd,
    argv,
  } = ctx;
  const self = this;

  const recoConfig = require(path.join(cwd, 'config/reco-config.js'));
  const pkgInfo = require(path.join(cwd, 'package.json'));

  const userName = recoConfig.upload.user || pkgInfo.author;
  const projectName = recoConfig.upload.project || pkgInfo.name;
  const uploadUrl = recoConfig.upload.host || '';
  const directory = recoConfig.upload.dir || 'publish';

  self.info(chalk.yellow('Begin compressing'));

  const zipPath = path.join(cwd, `${directory}.zip`);
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', {
    zlib: { level: 9 }
  });
  archive.pipe(output);
  archive.directory(path.join(cwd, directory), false);
  archive.finalize();
  archive.on('warning', function(err) {
    if (err.code === 'ENOENT') {
      self.warn(chalk.yellow(`archive compress: ${err.code}`));
    }
    throw err;
  });
  archive.on('error', function(err) {
    throw err;
  });

  output.on('close', function() {
    argv.debug && self.log(archive.pointer() + ' total bytes');
    argv.debug && self.log('archiver has been finalized and the output file descriptor has closed.');
    self.info(chalk.yellow('End of compression'));
    self.info(chalk.yellow('Start uploading'));
    const formData = {
      type: 'zip',
      to: `/data/wapstatic/${userName}/${projectName}`,
      file: fs.createReadStream(zipPath)
    };
    const reqData = {
      formData: formData,
      timeout: recoConfig.upload.timeout || 30000
    };
    request.post(uploadUrl, reqData, function(err, xhr, body) {
      err && self.error(chalk.red(`request Error: ${err}`));
      if (xhr && xhr.statusCode === 200) {
        rimraf.sync(zipPath);
        self.info(chalk.green('Upload successfully'));
        self.info(chalk.green(`Serve at: http://wapstatic.sparta.html5.qq.com/${userName}/${projectName}/`));
      } else {
        xhr && self.error(chalk.red(`request xhr.statusCode: ${xhr.statusCode}`));
        self.error(chalk.red('request fail'));
      }
    });
  });

  return archive;
}

module.exports = Upload;