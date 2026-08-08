import { defineConfig } from 'rolldown'
// 按框架从 `/rolldown` 子路径具名导入插件工厂，直接 `TDesignIconsReact()` 调用
import { TDesignIconsReact } from 'unplugin-tdesign-icons/rolldown'

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
    TDesignIconsReact(),
  ],
  external: [/^react/, /^react-dom/],
})
