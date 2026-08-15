import { build } from 'esbuild'
// Import the framework-bound plugin factory from the esbuild subpath.
import { TDesignIconsReact } from 'unplugin-tdesign-icons/esbuild'

await build({
  entryPoints: ['src/main.tsx'],
  bundle: true,
  outdir: 'dist',
  format: 'esm',
  jsx: 'automatic',
  // index.html is above dist, so the public sprite URL includes ./dist.
  plugins: [TDesignIconsReact({ localIcons: { publicPath: './dist/' } })],
})
