const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const archiver = require('archiver');
const request = require('request');
const del = require('del');

function Upload(ctx) {
  const {
    cwd,
    argv,
  } = ctx;
  const self = this;

  const pkgInfo = require(path.join(cwd, 'package.json'));

  const userName = pkgInfo.name;
  const projectName = pkgInfo.author;
  self.info(chalk.yellow('Begin compressing'));

  const zipPath = path.join(cwd, 'publish.zip');
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', {
    zlib: { level: 9 }
  });
  archive.pipe(output);
  archive.directory(path.join(cwd, 'publish'), false);
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
      to: `/data/wapstatic/${userName}/${projectName}`
    }
    formData['file'] = fs.createReadStream(zipPath)
    const reqData = {
      formData: formData,
      timeout: 60000
    }
    request.post('http://wapstatic.kf0309.3g.qq.com/upload', reqData, function (err, xhr, body) {
      err && self.error(chalk.red(`request Error: ${err}`));
      if (xhr && xhr.statusCode === 200) {
        del.sync([zipPath]);
        self.info(chalk.green('Upload successfully'));
        self.info(chalk.green(`Serve at: http://wapstatic.kf0309.3g.qq.com/${userName}/${projectName}/`));
      } else {
        xhr && self.error(chalk.red(`request xhr.statusCode: ${xhr.statusCode}`));
        self.error(chalk.red('request fail'));
      }
    })
  });
  return archive;
}

module.exports = Upload;