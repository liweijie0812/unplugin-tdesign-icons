import { build } from 'esbuild'
// 按框架从 `/esbuild` 子路径具名导入插件工厂，直接 `TDesignIconsReact()` 调用
import { TDesignIconsReact } from 'unplugin-tdesign-icons/esbuild'

await build({
  entryPoints: ['src/main.tsx'],
  bundle: true,
  outdir: 'dist',
  format: 'esm',
  jsx: 'automatic',
  // 根目录 index.html 加载 dist/main.js，因此 sprite URL 也指向 ./dist。
  plugins: [TDesignIconsReact({ localIcons: { publicPath: './dist/' } })],
})
