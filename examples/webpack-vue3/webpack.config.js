const path = require('node:path')
const { VueLoaderPlugin } = require('vue-loader')
// Import the framework-bound plugin factory from the Webpack subpath.
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
    // Named icons stay as deep imports; Icon/t-icon use the emitted local sprite.
    TDesignIconsVueNext({ localIcons: { publicPath: './dist/' } }),
  ],
}
