import { defineConfig } from 'tsdown'

const entries = [
  'src/index.ts',
  'src/TDesignIconsVue.ts',
  'src/TDesignIconsVueNext.ts',
  'src/TDesignIconsReact.ts',
  'src/TDesignIconsWebComponents.ts',
  'src/vite.ts',
  'src/rollup.ts',
  'src/rolldown.ts',
  'src/webpack.ts',
  'src/rspack.ts',
  'src/esbuild.ts',
]

// 短别名 → 正式子路径：保持与旧版手写 exports 的兼容
const ALIASES: Record<string, string> = {
  './vue': './TDesignIconsVue',
  './vue-next': './TDesignIconsVueNext',
  './react': './TDesignIconsReact',
  './web-components': './TDesignIconsWebComponents',
}

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
    neverBundle: ['unplugin', 'es-module-lexer', 'magic-string'],
    dts: {
      neverBundle: true,
    },
  },
  exports: {
    // devExports：开发期 exports 直接指向 src 源码，无需 build 即可本地联调
    devExports: true,
    customExports(exports, { isPublish }) {
      const result: Record<string, any> = { ...exports }
      // 补上短别名（dev 模式指向源码；publish 模式指向真实产物文件）
      for (const [alias, target] of Object.entries(ALIASES)) {
        if (result[target] === undefined) continue
        if (isPublish) {
          const t = result[target] as any
          const pick = (v: any) => (typeof v === 'string' ? v : v?.default)
          result[alias] = pick(t?.import) ?? pick(t?.require)
        } else {
          result[alias] = result[target]
        }
      }
      if (isPublish) {
        // 发布产物：为每个子路径补上 types 条件（import→d.mts / require→d.cts）
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
      }
      return result
    },
  },
})
