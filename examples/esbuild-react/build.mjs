import { build } from 'esbuild'
import { TDesignIconsReact } from 'unplugin-tdesign-icons/esbuild'

await build({
  entryPoints: ['src/main.tsx'],
  bundle: true,
  outdir: 'dist',
  format: 'esm',
  jsx: 'automatic',
  plugins: [TDesignIconsReact({ localIcons: { publicPath: './dist/' } })],
})
