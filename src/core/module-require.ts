import { createRequire } from 'node:module'

/**
 * 解析并加载图标包的 manifest。在 CJS 构建中可以直接使用 `module.require`；
 * 在 ESM 构建中则基于自身模块 URL 派生出一个 require
 *（它会在使用方 node_modules 内解析同级的图标包）。
 * 我们刻意避免使用裸的 `require` 标识符，防止打包器（esbuild/tsup）
 * 注入自己的运行时 `require` shim 而导致 ESM 环境下出错。
 */
const fallbackRequire = createRequire(import.meta.url)

export const nodeRequire = (
  typeof module !== 'undefined' && typeof (module as any).require === 'function'
    ? (module as any).require.bind(module)
    : fallbackRequire
) as NodeJS.Require

// Function#bind does not copy require.resolve/cache. Keep resolution anchored to
// this package for both ESM and the generated CJS bundle.
nodeRequire.resolve = fallbackRequire.resolve

/**
 * 加载指定图标包的 manifest。依次尝试几种常见的 manifest 入口路径，
 * 只要其中一种能成功加载就返回；全部失败则抛出明确错误。
 */
export function requireManifest(packageName: string) {
  // 候选的 manifest 模块路径：包根、esm 构建、lib 构建
  const candidates = [
    packageName,
    `${packageName}/esm/manifest.js`,
    `${packageName}/lib/manifest.js`,
  ]
  for (const candidate of candidates) {
    try {
      return nodeRequire(candidate)
    } catch {
      // 当前候选加载失败，继续尝试下一个
    }
  }
  throw new Error(
    `[unplugin-tdesign-icons] Failed to load manifest from "${packageName}". ` +
      `Please make sure "${packageName}" is installed in your project.`,
  )
}
