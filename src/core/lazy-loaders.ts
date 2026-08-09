import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { nodeRequire } from './module-require.ts'
import type { SFCParse } from './types.ts'

let cachedSfcParse: SFCParse | null = null
/**
 * 懒加载并缓存 `@vue/compiler-sfc` 的 `parse` 函数。
 * 首次调用时动态 import，后续直接复用缓存；加载失败返回 null。
 */
export async function getSfcParse(): Promise<SFCParse | null> {
  if (cachedSfcParse) return cachedSfcParse
  try {
    cachedSfcParse = (await import(/* @vite-ignore */ '@vue/compiler-sfc')).parse
  } catch {
    cachedSfcParse = null
  }
  return cachedSfcParse
}

// 懒加载 `@babel/parser` —— 用于在经典 `<script>`（Options API）代码块中定位
// `components` 选项，从而确认模板里的 `<Icon>` 绑定关系，并在标签被改写后更新注册项。
// `@babel/parser` 是 `@vue/compiler-sfc` 的硬依赖，因此从该包的位置解析它
//（与上面同样的懒加载、永不打包策略）。
let cachedBabelParse: ((code: string, opts?: Record<string, unknown>) => any) | null = null
export async function getBabelParse() {
  if (cachedBabelParse) return cachedBabelParse
  try {
    // 先解析出 @vue/compiler-sfc 的入口路径，再从它所在位置解析 @babel/parser
    const sfcEntry = nodeRequire.resolve('@vue/compiler-sfc')
    const sfcRequire = createRequire(sfcEntry)
    const babelEntry = sfcRequire.resolve('@babel/parser')
    const mod: any = await import(pathToFileURL(babelEntry).href)
    cachedBabelParse = mod.parse ?? mod.default?.parse
  } catch {
    cachedBabelParse = null
  }
  return cachedBabelParse
}
