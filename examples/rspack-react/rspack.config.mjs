import { rspack } from '@rspack/core'
// Import the framework-bound plugin factory from the Rspack subpath.
import { TDesignIconsReact } from 'unplugin-tdesign-icons/rspack'

export default {
  mode: 'production',
  entry: './src/main.tsx',
  output: {
    path: new URL('./dist', import.meta.url).pathname,
    filename: 'main.js',
  },
  resolve: {
    extensions: ['.tsx', '.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.tsx$/,
        use: [
          {
            // Use Rspack's built-in SWC loader for TSX.
            loader: 'builtin:swc-loader',
            options: {
              jsc: {
                parser: { syntax: 'typescript', tsx: true },
              },
            },
          },
        ],
      },
    ],
  },
  plugins: [
    // index.html is above dist, so the public sprite URL includes ./dist.
    TDesignIconsReact({ localIcons: { publicPath: './dist/' } }),
  ],
}
