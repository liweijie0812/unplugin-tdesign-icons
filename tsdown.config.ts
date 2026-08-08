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

export default defineConfig({
  entry: entries,
  format: ['esm', 'cjs'],
  dts: {
    // 与 tsup 的 dts 行为一致：同时产出 index.d.mts / index.d.cts，
    // CJS 侧用一行 `export type * from './index.d.mts'` 复用 ESM 类型声明，
    // 避免双份 .d.cts/.d.mts 各自的声明不一致（TS 双模块隐患）。
    cjsReexport: true,
  },
  clean: true,
  sourcemap: true,
  // 关闭产物 hash（保持与 tsup 时代一致的稳定输出文件名）。
  hash: false,
  // CJS 保持 es2020；ESM 需 esnext 才能输出 `export { x as 'module.exports' }`
  //（与 unplugin-icons 一致，靠 require(esm) 互操作让 CJS 消费方能直接 require 到插件函数）。
  target: ['esnext'],
  // 运行时依赖保持 external，不打包进产物。
  deps: {
    neverBundle: ['unplugin', 'es-module-lexer', 'magic-string'],
    // 生成 .d.ts 时 unplugin 的类型会引用 webpack / tapable 等 CJS 类型定义，
    // rolldown-plugin-dts 无法打包这些 CommonJS .d.ts。这里让 dts 阶段把所有
    // npm 包都 external，产物 .d.ts 直接保留 `import type ... from 'unplugin'`，
    // 由消费方（unplugin 是 dependencies）自行解析，与 tsup 时代行为一致。
    dts: {
      neverBundle: true,
    },
  },
})
