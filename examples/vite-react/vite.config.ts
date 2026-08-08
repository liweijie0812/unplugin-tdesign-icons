import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import TdesignIcons from 'unplugin-tdesign-icons/vite'

export default defineConfig({
  plugins: [
    react(),
    // Rewrite `import { CloseIcon } from 'tdesign-icons-react'` into the
    // deep import of the single icon module at build time.
    TdesignIcons({ framework: 'react' }),
  ],
})
