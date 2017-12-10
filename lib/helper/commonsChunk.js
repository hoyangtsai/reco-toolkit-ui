const _ = require('lodash');

module.exports = function(config) {
  if ( config.webpack && config.webpack.plugins && config.webpack.plugins.commonsChunk ) {
    const commonsChunk = config.webpack.plugins.commonsChunk;
    if ( commonsChunk.minChunks === null ||
      commonsChunk.minChunks === 0 ||
      parseInt(commonsChunk.minChunks)
    ) {
      let comName = commonsChunk.name || 'common';
      let chunkObj = {
        name: comName,
        filename: `js/${comName}.js`
      };

      if (commonsChunk.minChunks) {
        chunkObj.minChunks = commonsChunk.minChunks;
      }

      if (Array.isArray(commonsChunk.exclude) &&
          commonsChunk.exclude.length > 0) {
        chunkObj.chunks = config.entry.slice();
        chunkObj.chunks = _.pullAll(chunkObj.chunks, commonsChunk.exclude);
      }

      return chunkObj;
    }
  }

  return;
}
