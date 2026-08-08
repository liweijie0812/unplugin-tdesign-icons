import { defineConfig } from 'rolldown'
import TDesignIconsReact from 'unplugin-tdesign-icons/TDesignIconsReact'

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
    TDesignIconsReact.rolldown(),
  ],
  external: [/^react/, /^react-dom/],
})
