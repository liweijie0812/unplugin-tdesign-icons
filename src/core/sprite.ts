import fs from 'node:fs'
import path from 'node:path'
import type { LocalIconsOptions, ResolvedLocalIconsOptions } from '../types.ts'
import { nodeRequire } from './module-require.ts'

export const DEFAULT_SPRITE_FILE_NAME = 'assets/tdesign-icons.js'

const spriteCache = new Map<string, Promise<string>>()

export function joinPublicPath(publicPath: string, fileName: string) {
  const normalizedFileName = fileName.replace(/^\/+/, '')
  if (!publicPath) return normalizedFileName
  return `${publicPath.replace(/\/+$/, '')}/${normalizedFileName}`
}

export function resolveLocalIconsOptions(
  localIcons: boolean | LocalIconsOptions | undefined,
  defaultSourceUrl?: string,
): false | ResolvedLocalIconsOptions {
  if (!localIcons) return false
  const options = typeof localIcons === 'object' ? localIcons : {}
  const sourceUrl = options.sourceUrl ?? defaultSourceUrl
  const fileName = options.fileName ?? DEFAULT_SPRITE_FILE_NAME
  const publicPath = options.publicPath ?? './'

  if (!sourceUrl) throw new Error('[unplugin-tdesign-icons] localIcons.sourceUrl cannot be empty')
  if (!fileName || fileName.endsWith('/') || fileName.split(/[\\/]/).includes('..')) {
    throw new Error('[unplugin-tdesign-icons] localIcons.fileName must be a file path')
  }

  return {
    icons: options.icons,
    sourceUrl,
    fileName: fileName.replace(/^\/+/, ''),
    publicPath,
    url: joinPublicPath(publicPath, fileName),
  }
}

export function resolveDefaultSpriteSourceUrl(packageName: string) {
  let packageRoot: string
  try {
    packageRoot = path.dirname(nodeRequire.resolve(`${packageName}/package.json`))
  } catch (error) {
    throw new Error(
      `[unplugin-tdesign-icons] Failed to resolve svg-sprite URL from "${packageName}": ${error instanceof Error ? error.message : String(error)}`,
    )
  }

  const candidates = [
    path.join(packageRoot, 'esm/svg-sprite/svg-sprite.js'),
    path.join(packageRoot, 'lib/svg-sprite/svg-sprite.js'),
  ]
  for (const candidate of candidates) {
    if (!fs.existsSync(candidate)) continue
    const source = fs.readFileSync(candidate, 'utf8')
    const match = /\b(?:CDN_ICONFONT_URL|CDN_SVGSPRITE_URL)\s*=\s*['"]([^'"]+)['"]/.exec(source)
    if (match) return match[1]!
  }

  throw new Error(
    `[unplugin-tdesign-icons] No CDN svg-sprite URL found in "${packageName}". Set localIcons.sourceUrl explicitly.`,
  )
}

export function localizeSprite(source: string, sourceUrl: string) {
  const symbolIdRe = /\bid=(['"])t-icon-/g
  const matches = source.match(symbolIdRe)
  if (!matches?.length || !source.includes('insertAdjacentHTML')) {
    throw new Error(
      `[unplugin-tdesign-icons] Invalid svg-sprite response from ${sourceUrl}: no TDesign symbols found`,
    )
  }
  return source.replace(symbolIdRe, 'id=$1')
}

/** 只保留配置的图标 symbol；未配置时保留完整 sprite。 */
export function filterSprite(source: string, icons?: string[]) {
  if (icons === undefined) return source

  const allowed = new Set(icons)
  const symbolRe = /<symbol\b[^>]*\bid=(['"])([^'"]+)\1[^>]*>[\s\S]*?<\/symbol\s*>/g
  return source.replace(symbolRe, (symbol, _quote: string, id: string) =>
    allowed.has(id) ? symbol : '',
  )
}

export async function downloadSprite(sourceUrl: string) {
  let pending = spriteCache.get(sourceUrl)
  if (!pending) {
    pending = (async () => {
      let response: Response
      try {
        response = await fetch(sourceUrl)
      } catch (error) {
        throw new Error(
          `[unplugin-tdesign-icons] Failed to download svg-sprite from ${sourceUrl}: ${error instanceof Error ? error.message : String(error)}`,
        )
      }
      if (!response.ok) {
        throw new Error(
          `[unplugin-tdesign-icons] Failed to download svg-sprite from ${sourceUrl}: ${response.status} ${response.statusText}`,
        )
      }
      return localizeSprite(await response.text(), sourceUrl)
    })()
    spriteCache.set(sourceUrl, pending)
    pending.catch(() => spriteCache.delete(sourceUrl))
  }
  return pending
}
