import vue from '@vitejs/plugin-vue'
import { defineConfig } from 'vite'
import TDesignIconsVueNext from 'unplugin-tdesign-icons/TDesignIconsVueNext'

export default defineConfig({
  plugins: [
    vue(),
    // Rewrite `import { CloseIcon } from 'tdesign-icons-vue-next'` into the
    // deep import of the single icon module at build time.
    TDesignIconsVueNext.vite(),
  ],
})
