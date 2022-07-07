const path = require('path');

module.exports = {
  entry: './src/index.ts',
  module: {
      rules: [
          {
              test: /\.tsx?$/,
              exclude: [/node_modules/],
              loader: 'ts-loader'
          },
      ],
  },
  plugins: [],
  optimization: {
      minimize: false,
  },
  mode: 'development',
  target: "web",
  resolve: {
      extensions: ['.tsx', '.ts', '.js']
  },
  devServer: {
    static: {
      directory: path.join(__dirname, 'public'),
    },
    compress: true,
    port: 9000,
  },
  output: {
      filename: 'build.js',
      path: path.resolve(__dirname, 'build'),
  },
};