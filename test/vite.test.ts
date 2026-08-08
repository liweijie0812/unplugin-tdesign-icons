import { describe, it, expect } from 'vitest'
import path from 'node:path'
import { build } from 'vite'
import reactPlugin from '../src/react'

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
      plugins: [reactPlugin.vite({ framework: 'react' })],
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
