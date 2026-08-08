import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import TDesignIconsReact from 'unplugin-tdesign-icons/TDesignIconsReact'

export default defineConfig({
  plugins: [
    react(),
    // Rewrite `import { CloseIcon } from 'tdesign-icons-react'` into the
    // deep import of the single icon module at build time.
    TDesignIconsReact.vite(),
  ],
})
