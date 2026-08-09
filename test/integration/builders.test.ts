import { describe, it, expect } from 'vitest'
import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { TDesignIconsReact as vitePlugin } from '../../src/vite'
import { TDesignIconsReact as rollupPlugin } from '../../src/rollup'
import { TDesignIconsReact as rolldownPlugin } from '../../src/rolldown'
import { TDesignIconsReact as webpackPlugin } from '../../src/webpack'
import { TDesignIconsReact as rspackPlugin } from '../../src/rspack'
import { TDesignIconsReact as esbuildPlugin } from '../../src/esbuild'

const require = createRequire(import.meta.url)
const fixture = path.resolve(__dirname, 'fixture-react.ts')

// The bundle output of an on-demand build must contain the real Close icon SVG
// path data but no barrel import of `tdesign-icons-react`.
const CLOSE_SVG = 'M16.9503 7.05029L12.0005 12'
const hasBarrel = (code: string) => /from\s*['"]tdesign-icons-react['"]/.test(code)

describe('multi-bundler integration (Vite / Rollup / Rolldown / Webpack / Rspack / esbuild)', () => {
  const TIMEOUT = 60_000

  it('vite: rewrites on-demand and bundles only used icons', { timeout: TIMEOUT }, async () => {
    const { build } = await import('vite')
    const result = await build({
      root: __dirname,
      logLevel: 'silent',
      build: { write: false, minify: false, rollupOptions: { input: fixture } },
      plugins: [vitePlugin({})],
    })
    if (Array.isArray(result) || !('output' in result)) throw new Error('unexpected build result')
    const out = result
    const code = out.output.filter((o: any) => o.type === 'chunk').map((c: any) => c.code).join('\n')
    expect(code).toContain(CLOSE_SVG)
    expect(hasBarrel(code)).toBe(false)
    expect(out.output.filter((o: any) => o.type === 'chunk').length).toBeLessThan(5)
  })

  it('rollup: rewrites on-demand and bundles only used icons', { timeout: TIMEOUT }, async () => {
    const { rollup } = await import('rollup')
    const { default: nodeResolve } = await import('@rollup/plugin-node-resolve')
    const b = await rollup({
      input: fixture,
      plugins: [
        nodeResolve({ extensions: ['.ts', '.js', '.mjs'] }),
        rollupPlugin({}),
      ],
      external: [/^react/],
      onwarn: () => {},
    })
    const { output } = await b.generate({ format: 'esm' })
    const code = output.map((c: any) => c.code || '').join('\n')
    expect(code).toContain(CLOSE_SVG)
    expect(hasBarrel(code)).toBe(false)
    await b.close()
  })

  it('rolldown: rewrites on-demand and bundles only used icons', { timeout: TIMEOUT }, async () => {
    const { rolldown } = await import('rolldown')
    const b = await rolldown({
      input: fixture,
      plugins: [rolldownPlugin({})],
      external: [/^react/],
    })
    const { output } = await b.generate({ format: 'esm' })
    const code = output.map((c: any) => c.code || '').join('\n')
    expect(code).toContain(CLOSE_SVG)
    expect(hasBarrel(code)).toBe(false)
    await b.close()
  })

  it('webpack: rewrites on-demand and bundles only used icons', { timeout: TIMEOUT }, async () => {
    const webpack = (await import('webpack')).default
    const outDir = path.resolve('/tmp/wp-integration-dist')
    fs.rmSync(outDir, { recursive: true, force: true })
    const compiler = webpack({
      mode: 'production',
      entry: fixture,
      output: { path: outDir, filename: 'bundle.js', library: { type: 'commonjs2' } },
      resolve: { extensions: ['.ts', '.js'] },
      module: {
        rules: [
          {
            test: /\.ts$/,
            exclude: /node_modules/,
            use: { loader: require.resolve('ts-loader'), options: { transpileOnly: true } },
          },
        ],
      },
      plugins: [webpackPlugin({})],
      stats: 'errors-only',
    })

    const code = await new Promise<string>((resolve, reject) => {
      compiler.run((err: any, stats: any) => {
        if (err) return reject(err)
        if (stats.hasErrors()) return reject(new Error(stats.toString()))
        resolve(fs.readFileSync(path.join(outDir, 'bundle.js'), 'utf-8'))
      })
    })
    expect(code).toContain(CLOSE_SVG)
    expect(hasBarrel(code)).toBe(false)
  })

  it('rspack: rewrites on-demand and bundles only used icons', { timeout: TIMEOUT }, async () => {
    const { rspack } = await import('@rspack/core')
    const outDir = path.resolve('/tmp/rs-integration-dist')
    fs.rmSync(outDir, { recursive: true, force: true })
    const compiler = rspack({
      mode: 'production',
      entry: fixture,
      output: { path: outDir, filename: 'bundle.js', library: { type: 'commonjs2' } },
      resolve: { extensions: ['.ts', '.js'] },
      module: {
        rules: [
          {
            test: /\.ts$/,
            exclude: /node_modules/,
            use: { loader: require.resolve('ts-loader'), options: { transpileOnly: true } },
          },
        ],
      },
      plugins: [rspackPlugin({})],
      stats: 'errors-only',
    })

    const code = await new Promise<string>((resolve, reject) => {
      compiler.run((err: any, stats: any) => {
        if (err) return reject(err)
        if (stats.hasErrors()) return reject(new Error(stats.toString()))
        resolve(fs.readFileSync(path.join(outDir, 'bundle.js'), 'utf-8'))
      })
    })
    expect(code).toContain(CLOSE_SVG)
    expect(hasBarrel(code)).toBe(false)
  })

  it('esbuild: rewrites on-demand and bundles only used icons', { timeout: TIMEOUT }, async () => {
    const esbuild = await import('esbuild')
    const plugin = esbuildPlugin({})
    const esbuildPlugins = Array.isArray(plugin) ? plugin : [plugin]
    const result = await esbuild.build({
      entryPoints: [fixture],
      bundle: true,
      write: false,
      format: 'esm',
      plugins: esbuildPlugins,
      logLevel: 'silent',
    })
    const code = result.outputFiles[0].text
    expect(code).toContain(CLOSE_SVG)
    expect(hasBarrel(code)).toBe(false)
  })
})
