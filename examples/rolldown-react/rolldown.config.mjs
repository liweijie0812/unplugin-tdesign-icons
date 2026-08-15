import { defineConfig } from 'rolldown'
// Import the framework-bound plugin factory from the Rolldown subpath.
import { TDesignIconsReact } from 'unplugin-tdesign-icons/rolldown'

export default defineConfig({
  input: 'src/main.tsx',
  output: {
    dir: 'dist',
    format: 'esm',
  },
  plugins: [
    // Rolldown handles TSX natively; Icon uses the sprite emitted to dist.
    TDesignIconsReact({ localIcons: { publicPath: './dist/' } }),
  ],
})
