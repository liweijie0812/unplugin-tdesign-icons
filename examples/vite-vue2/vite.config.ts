import vue2 from '@vitejs/plugin-vue2'
import { defineConfig } from 'vite'
// Import the framework-bound plugin factory from the Vite subpath.
import { TDesignIconsVue } from 'unplugin-tdesign-icons/vite'

export default defineConfig({
  server: {
    // Allow proxied development environments to reach the Vite server.
    host: true,
    allowedHosts: true,
  },
  plugins: [
    vue2(),
    // Named icons stay as deep imports; Icon uses the emitted local sprite.
    TDesignIconsVue({ localIcons: true }),
  ],
})
