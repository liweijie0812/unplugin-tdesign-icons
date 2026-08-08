import { defineConfig } from 'tsup'

export default defineConfig({
  entry: ['src/index.ts', 'src/vue.ts', 'src/react.ts'],
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  target: 'es2020',
  cjsInterop: true,
  external: ['unplugin', 'es-module-lexer', 'magic-string'],
})
