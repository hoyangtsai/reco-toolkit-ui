module.exports = (env, options = {}) => ({
  cacheDirectory: '.cache',
  presets: [
    [require.resolve('babel-preset-env'), {
      "targets": {
        "browsers": ["last 2 versions", "safari >= 7"]
      },
      "useBuiltIns": true,
    }],
    require.resolve('babel-preset-react')
  ],
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
