import { build } from 'esbuild'
// unplugin-icons 风格：`/esbuild` 子路径的默认导出就是插件工厂，直接 `Icons()` 调用
import Icons from 'unplugin-tdesign-icons/esbuild'

await build({
  entryPoints: ['src/main.tsx'],
  bundle: true,
  outdir: 'dist',
  format: 'esm',
  jsx: 'automatic',
  // React 作为外部依赖，不打进 bundle
  external: ['react', 'react-dom'],
  // Rewrite `import { CloseIcon } from 'tdesign-icons-react'` into the
  // deep import of the single icon module at build time.
  plugins: [Icons({ framework: 'react' })],
})
