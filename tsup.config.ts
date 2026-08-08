import { defineConfig } from 'tsup'

const entries = [
  'src/index.ts',
  'src/vue.ts',
  'src/react.ts',
  'src/vite.ts',
  'src/rollup.ts',
  'src/rolldown.ts',
  'src/webpack.ts',
  'src/rspack.ts',
  'src/esbuild.ts',
]

export default defineConfig({
  entry: entries,
  format: ['esm', 'cjs'],
  dts: true,
  clean: true,
  sourcemap: true,
  // CJS 保持 es2020；ESM 需 esnext 才能输出 `export { x as 'module.exports' }`
  //（与 unplugin-icons 一致，靠 require(esm) 互操作让 CJS 消费方能直接 require 到插件函数）。
  target: 'es2020',
  esbuildOptions(options, context) {
    if (context.format === 'esm')
      options.target = 'esnext'
  },
  cjsInterop: true,
  external: ['unplugin', 'es-module-lexer', 'magic-string'],
})
