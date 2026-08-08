import { defineConfig } from 'rolldown'
// unplugin-icons 风格：`/rolldown` 子路径的默认导出就是插件工厂，直接 `Icons()` 调用
import Icons from 'unplugin-tdesign-icons/rolldown'

export default defineConfig({
  input: 'src/main.tsx',
  output: {
    dir: 'dist',
    format: 'esm',
  },
  plugins: [
    // Rolldown 原生支持 TSX（自动 jsx-runtime），无需额外插件
    // Rewrite `import { CloseIcon } from 'tdesign-icons-react'` into the
    // deep import of the single icon module at build time.
    Icons({ framework: 'react' }),
  ],
  external: [/^react/, /^react-dom/],
})
