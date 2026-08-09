import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { build } from 'vite'
import reactPlugin from '../src/TDesignIconsReact'

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
      plugins: [reactPlugin.vite({})],
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

describe('vite integration — localIcons (offline <Icon name>)', () => {
  it('rewrites <Icon name="xxx" /> to deep components and bundles SVG locally (no CDN)', async () => {
    const localEntry = path.resolve(__dirname, 'fixtures/local-icons.tsx')
    const result = await build({
      root: __dirname,
      logLevel: 'silent',
      build: {
        write: false,
        minify: false,
        rollupOptions: { input: localEntry },
      },
      plugins: [reactPlugin.vite({ localIcons: true })],
    })

    const output = Array.isArray(result) ? result[0] : result
    const chunks = (output as any).output.filter((o: { type: string }) => o.type === 'chunk')
    const code = chunks.map((c: { code: string }) => c.code).join('\n')

    // Sneer & unhappy icon SVG path data are bundled locally
    expect(code).toContain('M17 10H15M9 10H7M15.5 14.5')
    expect(code).toContain('M8.53516 16C9.22678 14.8044')
    // No CDN svg-sprite URL is loaded at runtime
    expect(code).not.toContain('tdesign.gtimg.com')
    // No barrel import of the icon package remains
    expect(code).not.toMatch(/from ['"]tdesign-icons-react['"]/)
  })
})
