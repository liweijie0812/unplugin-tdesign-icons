import { defineConfig } from 'vite'
// Import the framework-bound plugin factory from the Vite subpath.
import { TDesignIconsWebComponents } from 'unplugin-tdesign-icons/vite'

export default defineConfig({
  server: {
    host: true,
    allowedHosts: true,
  },
  plugins: [
    TDesignIconsWebComponents(),
  ],
})
