import { afterEach, describe, it, expect, vi } from 'vitest'
import path from 'node:path'
import { build, createServer } from 'vite'
import { TDesignIconsReact } from '../src/vite'

const entry = path.resolve(__dirname, 'fixtures/entry.ts')

describe('vite integration', () => {
  it('rewrites icons on-demand and only bundles the used icon', async () => {
    const result = await build({
      root: __dirname,
      logLevel: 'silent',
      build: {
        write: false,
        minify: false,
        rollupOptions: { input: entry },
      },
      plugins: [TDesignIconsReact({})],
    })

    const output = Array.isArray(result) ? result[0] : result
    const chunks = (output as any).output.filter((o: { type: string }) => o.type === 'chunk')
    const code = chunks.map((c: { code: string }) => c.code).join('\n')

    // The deep icon module is bundled (contains the close icon SVG path data)
    expect(code).toContain('M16.9503 7.05029L12.0005 12')
    // No barrel import left behind
    expect(code).not.toMatch(/from ['"]tdesign-icons-react['"]/)
    // Only a small number of modules (not all 2354 icons)
    expect(chunks.length).toBeLessThan(5)
  })
})

describe('vite integration — localIcons (local svg-sprite)', () => {
  afterEach(() => vi.unstubAllGlobals())

  const TIMEOUT = 60_000

  it('emits the CDN sprite locally and injects its URL for static and dynamic names', { timeout: TIMEOUT }, async () => {
    const sprite = `(function(){var svgCode='<svg><symbol id="t-icon-sneer"></symbol></svg>';document.body.insertAdjacentHTML('afterbegin',svgCode)})()`
    vi.stubGlobal('fetch', vi.fn(async () => new Response(sprite)))
    const localEntry = path.resolve(__dirname, 'fixtures/local-icons.tsx')
    const result = await build({
      root: __dirname,
      logLevel: 'silent',
      build: {
        write: false,
        minify: false,
        rollupOptions: { input: localEntry },
      },
      plugins: [
        TDesignIconsReact({
          localIcons: { sourceUrl: 'https://cdn.test/vite-icons.js' },
        }),
      ],
    })

    const output = Array.isArray(result) ? result[0] : result
    const chunks = (output as any).output.filter((o: { type: string }) => o.type === 'chunk')
    const code = chunks.map((c: { code: string }) => c.code).join('\n')
    const assets = (output as any).output.filter((o: { type: string }) => o.type === 'asset')

    expect(code).toContain('/assets/tdesign-icons.js')
    expect(code).toContain('loadDefaultIcons: false')
    expect(code).not.toContain('SneerIcon')
    expect(assets).toEqual([
      expect.objectContaining({
        fileName: 'assets/tdesign-icons.js',
        source: expect.stringContaining('id="sneer"'),
      }),
    ])
    expect(String(assets[0].source)).not.toContain('id="t-icon-sneer"')
  })

  it('follows the vite base when publicPath is not configured', { timeout: TIMEOUT }, async () => {
    const sprite = `(function(){var svgCode='<svg><symbol id="t-icon-sneer"></symbol></svg>';document.body.insertAdjacentHTML('afterbegin',svgCode)})()`
    vi.stubGlobal('fetch', vi.fn(async () => new Response(sprite)))
    const localEntry = path.resolve(__dirname, 'fixtures/local-icons.tsx')
    const result = await build({
      root: __dirname,
      base: '/my-app/',
      logLevel: 'silent',
      build: {
        write: false,
        minify: false,
        rollupOptions: { input: localEntry },
      },
      plugins: [
        TDesignIconsReact({
          localIcons: { sourceUrl: 'https://cdn.test/vite-icons.js' },
        }),
      ],
    })

    const output = Array.isArray(result) ? result[0] : result
    const chunks = (output as any).output.filter((o: { type: string }) => o.type === 'chunk')
    const code = chunks.map((c: { code: string }) => c.code).join('\n')
    expect(code).toContain('"/my-app/assets/tdesign-icons.js"')
    expect(code).not.toContain('"./assets/tdesign-icons.js"')
  })

  it('injects an absolute root URL in dev mode so history routes cannot break it', { timeout: TIMEOUT }, async () => {
    const realFetch = globalThis.fetch
    const sprite = `(function(){var svgCode='<svg><symbol id="t-icon-add"></symbol></svg>';document.body.insertAdjacentHTML('afterbegin',svgCode)})()`
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      if (String(input) === 'https://cdn.test/vite-dev-default-icons.js') return new Response(sprite)
      return realFetch(input, init)
    }))

    // 纯默认配置：不传 publicPath / fileName / base，等价于用户开箱即用的 dev 场景
    const server = await createServer({
      configFile: false,
      root: __dirname,
      logLevel: 'silent',
      server: { host: '127.0.0.1', port: 0 },
      plugins: [
        TDesignIconsReact({
          localIcons: { sourceUrl: 'https://cdn.test/vite-dev-default-icons.js' },
        }),
      ],
    })

    try {
      await server.listen()
      const address = server.httpServer?.address()
      if (!address || typeof address === 'string') throw new Error('Vite did not bind a TCP port')

      // dev 转换注入的是绝对路径：无论浏览器当前停在哪个 history 路由（/xx），
      // 请求都会落在 /assets/tdesign-icons.js，而不会按文档 URL 拼出 /xx/assets/...
      const result = await server.transformRequest('/fixtures/local-icons.tsx')
      expect(result?.code).toContain('"/assets/tdesign-icons.js"')
      expect(result?.code).not.toContain('./assets/tdesign-icons.js')
      expect(result?.code).toContain('loadDefaultIcons: false')

      const response = await realFetch(`http://127.0.0.1:${address.port}/assets/tdesign-icons.js`)
      expect(response.status).toBe(200)
      const source = await response.text()
      expect(source).toContain('id="add"')
      expect(source).not.toContain('id="t-icon-add"')
    } finally {
      // Vite dev 下直接调用 transformRequest 后，server.close() 在测试环境可能
      // 永不结束（零插件同样复现，属 Vite×vitest 环境问题）；限时放弃，不影响断言。
      await Promise.race([
        server.close().catch(() => {}),
        new Promise((resolve) => setTimeout(resolve, 1_000)),
      ])
    }
  })

  it('serves the same localized sprite in Vite dev mode', async () => {
    const realFetch = globalThis.fetch
    const sprite = `(function(){var svgCode='<svg><symbol id="t-icon-close"></symbol></svg>';document.body.insertAdjacentHTML('afterbegin',svgCode)})()`
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      if (String(input) === 'https://cdn.test/vite-dev-icons.js') return new Response(sprite)
      return realFetch(input, init)
    }))

    const server = await createServer({
      configFile: false,
      root: __dirname,
      logLevel: 'silent',
      server: { host: '127.0.0.1', port: 0 },
      plugins: [
        TDesignIconsReact({
          localIcons: {
            sourceUrl: 'https://cdn.test/vite-dev-icons.js',
            fileName: 'local/icons.js',
            publicPath: '/',
          },
        }),
      ],
    })

    try {
      await server.listen()
      const address = server.httpServer?.address()
      if (!address || typeof address === 'string') throw new Error('Vite did not bind a TCP port')
      const response = await realFetch(`http://127.0.0.1:${address.port}/local/icons.js`)
      expect(response.status).toBe(200)
      const source = await response.text()
      expect(source).toContain('id="close"')
      expect(source).not.toContain('id="t-icon-close"')
    } finally {
      await server.close()
    }
  })

  it('serves the sprite under the vite base without publicPath configured', async () => {
    const realFetch = globalThis.fetch
    const sprite = `(function(){var svgCode='<svg><symbol id="t-icon-add"></symbol></svg>';document.body.insertAdjacentHTML('afterbegin',svgCode)})()`
    vi.stubGlobal('fetch', vi.fn(async (input: string | URL | Request, init?: RequestInit) => {
      if (String(input) === 'https://cdn.test/vite-base-icons.js') return new Response(sprite)
      return realFetch(input, init)
    }))

    const server = await createServer({
      configFile: false,
      root: __dirname,
      base: '/my-app/',
      logLevel: 'silent',
      server: { host: '127.0.0.1', port: 0 },
      plugins: [
        TDesignIconsReact({
          localIcons: {
            sourceUrl: 'https://cdn.test/vite-base-icons.js',
            fileName: 'local/icons.js',
          },
        }),
      ],
    })

    try {
      await server.listen()
      const address = server.httpServer?.address()
      if (!address || typeof address === 'string') throw new Error('Vite did not bind a TCP port')
      const response = await realFetch(`http://127.0.0.1:${address.port}/my-app/local/icons.js`)
      expect(response.status).toBe(200)
      const source = await response.text()
      expect(source).toContain('id="add"')
    } finally {
      await server.close()
    }
  })
})
