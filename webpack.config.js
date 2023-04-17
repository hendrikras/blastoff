"use strict";

const path = require("path");
const CopyPlugin = require("copy-webpack-plugin");
const webpack = require("webpack");

module.exports = {
  entry: {
    app: "./src/main.ts"
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "app.bundle.js"
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        include: path.resolve(__dirname, "src"),
        loader: "ts-loader"
      },
      {
        test: require.resolve("Phaser"),
        loader: "expose-loader",
        options: { exposes: { globalName: "Phaser", override: true } }
      }
    ]
  },
  devServer: {
    static: path.resolve(__dirname, "./"),
    host: "localhost",
    port: 8080,
    open: false
  },
  resolve: {
    extensions: [".ts", ".js"],
    fallback: {
      buffer: require.resolve("buffer/")
    }
  },
  plugins: [
    new CopyPlugin({
      patterns: [
        {
          from: path.resolve(__dirname, "index.html"),
          to: path.resolve(__dirname, "dist")
        },
        {
          from: path.resolve(__dirname, "assets", "**", "*"),
          to: path.resolve(__dirname, "dist")
        }
      ]
    }),
    new webpack.DefinePlugin({
      "typeof CANVAS_RENDERER": JSON.stringify(true),
      "typeof WEBGL_RENDERER": JSON.stringify(true)
    }),
    new webpack.ProvidePlugin({
      Buffer: ["buffer", "Buffer"]
    })
  ]
};
