import { defineConfig } from 'rolldown'
import { TDesignIconsReact } from 'unplugin-tdesign-icons/rolldown'

export default defineConfig({
  input: 'src/main.tsx',
  output: {
    dir: 'dist',
    format: 'esm',
  },
  plugins: [
    TDesignIconsReact({ localIcons: { publicPath: './dist/' } }),
  ],
})
