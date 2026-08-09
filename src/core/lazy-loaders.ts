import { createRequire } from 'node:module'
import { pathToFileURL } from 'node:url'
import { nodeRequire } from './module-require.ts'
import type { SFCParse } from './types.ts'

let cachedSfcParse: SFCParse | null = null
export async function getSfcParse(): Promise<SFCParse | null> {
  if (cachedSfcParse) return cachedSfcParse
  try {
    cachedSfcParse = (await import(/* @vite-ignore */ '@vue/compiler-sfc')).parse
  } catch {
    cachedSfcParse = null
  }
  return cachedSfcParse
}

// Lazy `@babel/parser` loader — used to locate the `components` option inside a
// classic `<script>` (Options API) block so the template `<Icon>` binding can be
// confirmed and the registration updated once the tag is rewritten.
// `@babel/parser` is a hard dependency of `@vue/compiler-sfc`, so it is resolved
// from that package's location (same lazy, never-bundled strategy as above).
let cachedBabelParse: ((code: string, opts?: Record<string, unknown>) => any) | null = null
export async function getBabelParse() {
  if (cachedBabelParse) return cachedBabelParse
  try {
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
