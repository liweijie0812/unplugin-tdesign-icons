const path = require('node:path')
const { VueLoaderPlugin } = require('vue-loader')
// unplugin-icons 风格：`/webpack` 子路径的默认导出就是插件工厂，直接 `Icons()` 调用
const Icons = require('unplugin-tdesign-icons/webpack')

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
    Icons({ framework: 'vue-next' }),
  ],
}
