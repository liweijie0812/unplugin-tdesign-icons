import { createRequire } from 'node:module'

/**
 * Resolve & load the icon package's manifest. In CJS builds `module.require`
 * is available; in ESM builds we derive a require from our own module URL
 * (which resolves sibling packages inside the consumer's node_modules).
 * We deliberately avoid the bare `require` identifier so bundlers (esbuild/
 * tsup) don't inject their own runtime `require` shim that breaks in ESM.
 */
export const nodeRequire =
  typeof module !== 'undefined' && typeof (module as any).require === 'function'
    ? (module as any).require.bind(module)
    : createRequire(import.meta.url)

export function requireManifest(packageName: string) {
  const candidates = [
    packageName,
    `${packageName}/esm/manifest.js`,
    `${packageName}/lib/manifest.js`,
  ]
  for (const candidate of candidates) {
    try {
      return nodeRequire(candidate)
    } catch {
      // try next
    }
  }
  throw new Error(
    `[unplugin-tdesign-icons] Failed to load manifest from "${packageName}". ` +
      `Please make sure "${packageName}" is installed in your project.`,
  )
}
