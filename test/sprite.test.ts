import { afterEach, describe, expect, it, vi } from 'vitest'
import { unpluginFactory } from '../src/core'
import {
  downloadSprite,
  joinPublicPath,
  localizeSprite,
  resolveDefaultSpriteSourceUrl,
} from '../src/core/sprite'

const spriteSource = `(function () {
  var svgCode = '<svg><symbol id="t-icon-close"></symbol><symbol id="t-icon-add"></symbol></svg>'
  document.body.insertAdjacentHTML('afterbegin', svgCode)
})()`

describe('local svg-sprite asset', () => {
  afterEach(() => vi.unstubAllGlobals())

  it('reads the CDN URL from the installed framework packages', () => {
    expect(resolveDefaultSpriteSourceUrl('tdesign-icons-react')).toBe(
      'https://tdesign.gtimg.com/icon/0.4.4/fonts/index.js',
    )
    expect(resolveDefaultSpriteSourceUrl('tdesign-icons-vue-next')).toBe(
      'https://tdesign.gtimg.com/icon/0.4.4/fonts/index.js',
    )
  })

  it('removes the default t-icon prefix so the custom url lookup resolves', () => {
    const localized = localizeSprite(spriteSource, 'https://cdn.test/icons.js')
    expect(localized).toContain('id="close"')
    expect(localized).toContain('id="add"')
    expect(localized).not.toContain('id="t-icon-')
  })

  it('rejects a response that is not a TDesign sprite', () => {
    expect(() => localizeSprite('console.log("not a sprite")', 'https://cdn.test/bad.js')).toThrow(
      'no TDesign symbols found',
    )
  })

  it('downloads each source URL once and reports HTTP failures', async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) =>
      String(url).includes('missing')
        ? new Response('', { status: 404, statusText: 'Not Found' })
        : new Response(spriteSource),
    )
    vi.stubGlobal('fetch', fetchMock)
    const url = 'https://cdn.test/cached-icons.js'
    await Promise.all([downloadSprite(url), downloadSprite(url)])
    expect(fetchMock).toHaveBeenCalledTimes(1)

    await expect(downloadSprite('https://cdn.test/missing-icons.js')).rejects.toThrow(
      '404 Not Found',
    )
  })

  it('emits the localized asset from buildStart', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response(spriteSource)))
    const plugin = unpluginFactory('react', {
      localIcons: {
        sourceUrl: 'https://cdn.test/build-start-icons.js',
        fileName: 'static/icons.js',
      },
    })
    const emitFile = vi.fn()
    await (plugin.buildStart as Function).call({ emitFile })
    expect(emitFile).toHaveBeenCalledWith({
      type: 'asset',
      fileName: 'static/icons.js',
      source: expect.stringContaining('id="close"'),
    })
  })

  it('joins relative and absolute public paths', () => {
    expect(joinPublicPath('./', 'assets/icons.js')).toBe('./assets/icons.js')
    expect(joinPublicPath('/console/', '/assets/icons.js')).toBe('/console/assets/icons.js')
  })
})
