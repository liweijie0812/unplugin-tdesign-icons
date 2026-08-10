import { defineConfig } from 'tsdown'

const entries = [
  'src/index.ts',
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
  dts: {
    cjsReexport: true,
  },
  clean: true,
  sourcemap: true,
  hash: false,
  target: ['esnext'],
  deps: {
    neverBundle: ['unplugin', 'es-module-lexer', 'magic-string', '@vue/compiler-sfc'],
    dts: {
      neverBundle: true,
    },
  },
  exports: {
    customExports(exports) {
      const result: Record<string, any> = { ...exports }
      // 为每个子路径补上 types 条件（import -> d.mts / require -> d.cts）。
      for (const [name, value] of Object.entries(result)) {
        if (name === './package.json' || typeof value !== 'object' || value === null) continue
        const file = name === '.' ? 'index' : name.replace(/^\.\//, '')
        const entry: any = {}
        for (const cond of ['import', 'require']) {
          const target = (value as any)[cond]
          if (typeof target === 'string') {
            entry[cond] = {
              types: `./dist/${file}.d.${cond === 'require' ? 'cts' : 'mts'}`,
              default: target,
            }
          } else if (target && typeof target === 'object') {
            entry[cond] = { ...target }
          }
        }
        result[name] = entry
      }
      return result
    },
  },
})
