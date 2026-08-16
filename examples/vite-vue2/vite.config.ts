import vue2 from '@vitejs/plugin-vue2'
import { defineConfig } from 'vite'
import { TDesignIconsVue } from 'unplugin-tdesign-icons/vite'

export default defineConfig({
  server: {
    host: true,
    allowedHosts: true,
  },
  plugins: [
    vue2(),
    TDesignIconsVue({ localIcons: true }),
  ],
})
