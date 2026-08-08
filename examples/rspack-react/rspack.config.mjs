import { rspack } from '@rspack/core'
// 按框架从 `/rspack` 子路径具名导入插件工厂，直接 `TDesignIconsReact()` 调用
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
            // Rspack 内置 SWC，零配置编译 TSX（自动 jsx-runtime）
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
    // 把 `import { XxxIcon } from 'tdesign-icons-react'` 改写为单图标深层导入
    TDesignIconsReact(),
  ],
}
