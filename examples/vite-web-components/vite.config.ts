import { defineConfig } from 'vite'
// Import the framework-bound plugin factory from the Vite subpath.
import { TDesignIconsWebComponents } from 'unplugin-tdesign-icons/vite'

export default defineConfig({
  server: {
    // Allow proxied development environments to reach the Vite server.
    host: true,
    allowedHosts: true,
  },
  plugins: [
    // The generic Web Components Icon already includes local JSON data.
    TDesignIconsWebComponents(),
  ],
})
