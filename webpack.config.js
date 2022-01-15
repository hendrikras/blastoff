'use strict';
// var webpack = require('webpack');
// var definitions = {
//   DEBUG: process.env.DEBUG === 'true',
//   FULL: process.env.FULL === 'true',
//   NATIVE: process.env.NATIVE === 'true'
// };
// var config = {
//   target: 'web',
//   plugins: [new webpack.DefinePlugin(definitions)],
//   resolveLoader: {modulesDirectories: ['node_modules', 'tools']},
//   module: {
//     loaders: [{
//       test: /index\.html$/,
//       loader: 'copy'
//     }, {test: /\.svg$|\.woff$|\.ttf$|\.wav$|\.mp3|\.fnt|\.ogg|\.wav$/, loader: 'file'}, {
//       test: /\.json$/,
//       loader: 'file!mapEntityIdGenerator'
//     }, {test: /\.jpe?g$|\.gif$|\.png$/, loader: 'file!image'}, {test: /phaser.js/, loader: 'script'}]
//   },
//   entry: {game: './src/game.js'},
//   output: {path: './dist', publicPath: '', filename: 'game.js'}
// };
// if (definitions.NATIVE) {
//   config.target = 'node-webkit';
//   config.resolveLoader.moduleTemplates = ["*-webpack-loader", "*-web-loader", "*-loader", "*"];
// }
// module.exports = config;



const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');

module.exports = {
  entry: {
    app: './src/main.ts',
    vendors: ['phaser']
  },

  module: {
    rules: [
      // {
      //   test: /\.tsx?$/,
      //   use: 'ts-loader',
      //   exclude: /node_modules/
      // }
      {
        test: /\.tsx?$/,
        use: 'ts-loader',
        exclude: path.resolve(__dirname, '/node_modules')
    }
    ]
  },

  devtool: 'no-source-map',

  resolve: {
    extensions: [ '.ts', '.tsx', '.js' ]
  },

  output: {
    filename: 'app.bundle.js',
    path: path.resolve(__dirname, 'dist')
  },

  mode: 'development',

  devServer: {
    contentBase: path.resolve(__dirname, 'dist'),
    https: true
  },

  plugins: [
    new CopyWebpackPlugin([
      {
        from: path.resolve(__dirname, 'index.html'),
        to: path.resolve(__dirname, 'dist')
      },
      {
        from: path.resolve(__dirname, 'assets', '**', '*'),
        to: path.resolve(__dirname, 'dist')
      }
    ]),
    new webpack.DefinePlugin({
      'typeof CANVAS_RENDERER': JSON.stringify(true),
      'typeof WEBGL_RENDERER': JSON.stringify(true)
    }),
  ],

  optimization: {
    splitChunks: {
      cacheGroups: {
        commons: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    }
  }
};
