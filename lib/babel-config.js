module.exports = (env, options = {}) => ({
  cacheDirectory: '.cache',
  presets: [
    'babel-preset-react',
    'babel-preset-es2015',
    'babel-preset-stage-0'
  ].map(require.resolve),
  plugins: [],
  env: {
    development: {
      presets: ['babel-preset-react-hmre'].map(require.resolve),
      plugins: ['react-hot-loader/babel'].map(require.resolve)
    },
    production: {
      compact: false,
      comments: false,
      plugins: [
        'babel-plugin-transform-runtime'
      ].map(require.resolve)
    }
  }
});
