import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import TdesignIcons from 'unplugin-tdesign-icons/vite'

export default defineConfig({
  plugins: [
    vue(),
    // Rewrite `import { CloseIcon } from 'tdesign-icons-vue-next'` into the
    // deep import of the single icon module at build time.
    TdesignIcons({ framework: 'vue' }),
  ],
})
