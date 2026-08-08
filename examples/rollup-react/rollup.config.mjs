import { defineConfig } from 'rollup'
import esbuild from 'rollup-plugin-esbuild'
import nodeResolve from '@rollup/plugin-node-resolve'
// unplugin-icons 风格：`/rollup` 子路径的默认导出就是插件工厂，直接 `Icons()` 调用
import Icons from 'unplugin-tdesign-icons/rollup'

export default defineConfig({
  input: 'src/main.tsx',
  output: {
    dir: 'dist',
    format: 'esm',
  },
  plugins: [
    // 编译 TSX：把 `.tsx` 编译为 JS（自动 jsx-runtime）
    esbuild({ tsconfig: 'tsconfig.json', jsx: 'automatic' }),
    nodeResolve({ extensions: ['.tsx', '.ts', '.js', '.mjs'] }),
    // Rewrite `import { CloseIcon } from 'tdesign-icons-react'` into the
    // deep import of the single icon module at build time.
    Icons({ framework: 'react' }),
  ],
  external: [/^react/, /^react-dom/],
})
