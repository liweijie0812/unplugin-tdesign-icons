import { build } from 'esbuild'
// 按框架从 `/esbuild` 子路径具名导入插件工厂，直接 `TDesignIconsReact()` 调用
import { TDesignIconsReact } from 'unplugin-tdesign-icons/esbuild'

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
  plugins: [TDesignIconsReact()],
})
