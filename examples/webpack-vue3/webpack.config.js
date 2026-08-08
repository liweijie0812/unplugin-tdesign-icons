const path = require('node:path')
const { VueLoaderPlugin } = require('vue-loader')
// 按框架从 `/webpack` 子路径具名导入插件工厂，直接 `TDesignIconsVueNext()` 调用
const { TDesignIconsVueNext } = require('unplugin-tdesign-icons/webpack')

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
    TDesignIconsVueNext(),
  ],
}
