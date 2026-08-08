const path = require('node:path')
const { VueLoaderPlugin } = require('vue-loader')
// CJS + Webpack：直接 require 子路径入口（等价于 require('unplugin-tdesign-icons/webpack')）
const TdesignIcons = require('unplugin-tdesign-icons/webpack')

module.exports = {
  mode: 'production',
  entry: path.resolve(__dirname, 'src/main.js'),
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'main.js',
  },
  resolve: {
    extensions: ['.js', '.vue'],
  },
  module: {
    rules: [
      {
        test: /\.vue$/,
        loader: 'vue-loader',
        options: {
          experimentalInlineMatchResource: true,
        },
      },
    ],
  },
  experiments: {
    css: true,
  },
  plugins: [
    new VueLoaderPlugin(),
    // 把 `import { XxxIcon } from 'tdesign-icons-vue-next'` 改写为单图标深层导入
    TdesignIcons({ framework: 'vue' }),
  ],
}
