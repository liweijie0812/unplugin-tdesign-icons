import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { TDesignIconsReact } from 'unplugin-tdesign-icons/vite'

export default defineConfig({
  server: {
    host: true,
    allowedHosts: true,
  },
  plugins: [
    react(),
    TDesignIconsReact({ localIcons: true }),
  ],
})
