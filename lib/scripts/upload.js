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
  
  const [userName, projectName] = ['damon', 'recotoolkitui'];   // TODO
  console.info(chalk.yellow('begin compress'));
  const zipPath = path.join(cwd, 'publish.zip');
  const output = fs.createWriteStream(zipPath);
  const archive = archiver('zip', {
    zlib: { level: 9 }
  });
  output.on('close', function() {
    argv.debug && console.log(archive.pointer() + ' total bytes');
    argv.debug && console.log('archiver has been finalized and the output file descriptor has closed.');
    console.info(chalk.yellow('end compress'));
    console.info(chalk.yellow('begin upload'));
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
      err && console.error(chalk.red(`request Error: ${err}`));
      if (xhr && xhr.statusCode === 200) {
        console.info(chalk.yellow('end upload'));
        del.sync([zipPath]);
        console.info(chalk.green('upload success'));
        console.info(chalk.green(`upload path: http://wapstatic.kf0309.3g.qq.com/${userName}/${projectName}/`));
      } else {
        xhr && console.error(chalk.red(`request xhr.statusCode: ${xhr.statusCode}`));
        console.error(chalk.red('request fail'));
      }
    })
  });
  archive.on('warning', function(err) {
    if (err.code === 'ENOENT') {
      console.warn(chalk.yellow(`archive compress: ${err.code}`));
    } else {
      throw err;
    }
  });
  archive.on('error', function(err) {
    throw err;
  });
  archive.pipe(output);
  archive.directory(path.join(cwd, 'publish'), false);
  archive.finalize();
  return archive;
}

module.exports = Upload;
