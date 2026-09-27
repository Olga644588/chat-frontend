const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');


module.exports = merge(common, {
  mode: 'development',
  devServer: {
    static: './dist',
    compress: true,
    port: 8080,
    open: true,
  },
});
