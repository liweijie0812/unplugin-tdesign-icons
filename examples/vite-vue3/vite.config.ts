import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
// Import the framework-bound plugin factory from the Vite subpath.
import { TDesignIconsVueNext } from 'unplugin-tdesign-icons/vite'

export default defineConfig({
  server: {
    // Allow proxied development environments to reach the Vite server.
    host: true,
    allowedHosts: true,
  },
  plugins: [
    vue(),
    // Rewrite `import { CloseIcon } from 'tdesign-icons-vue-next'` into the
    // deep import of the single icon module at build time.
    // Download the package's CDN sprite and inject its local URL into Icon/t-icon.
    TDesignIconsVueNext({ localIcons: true }),
  ],
})
