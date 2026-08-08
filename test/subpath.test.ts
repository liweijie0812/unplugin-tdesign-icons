import { describe, it, expect } from 'vitest'
import ViteIcons from '../src/vite'
import RollupIcons from '../src/rollup'
import RolldownIcons from '../src/rolldown'
import WebpackIcons from '../src/webpack'
import RspackIcons from '../src/rspack'
import EsbuildIcons from '../src/esbuild'

// unplugin-icons 风格：子路径默认导出即插件工厂，可直接 `Icons(options)` 调用。
describe('build-tool subpath entries (unplugin-icons style)', () => {
  it('exposes a callable default export (plugin factory)', () => {
    expect(typeof ViteIcons).toBe('function')
    expect(typeof RollupIcons).toBe('function')
    expect(typeof RolldownIcons).toBe('function')
    expect(typeof WebpackIcons).toBe('function')
    expect(typeof RspackIcons).toBe('function')
    expect(typeof EsbuildIcons).toBe('function')
  })

  it('vite: Icons(options) returns a plugin object with name/enforce/transform', () => {
    const plugin = ViteIcons({ framework: 'react' })
    expect(plugin).toBeTruthy()
    expect((plugin as any).name).toBe('unplugin-tdesign-icons')
    expect((plugin as any).enforce).toBe('pre')
    expect(typeof (plugin as any).transform).toBe('function')
  })

  it('rollup: Icons(options) returns a rollup plugin', () => {
    const plugin = RollupIcons({ framework: 'react' })
    expect(plugin).toBeTruthy()
    expect((plugin as any).name).toBe('unplugin-tdesign-icons')
    expect(typeof (plugin as any).transform).toBe('function')
  })

  it('default framework is vue-next', async () => {
    const plugin = ViteIcons({}) as any
    const id = '/project/src/App.vue'
    expect(plugin.transformInclude(id)).toBe(true)
    const result = await plugin.transform.call(
      {},
      `import { CloseIcon } from 'tdesign-icons-vue-next'`,
      id,
    )
    expect(result.code).toContain(`import CloseIcon from 'tdesign-icons-vue-next/esm/components/close.js'`)
  })

  it('webpack/esbuild entries can be called directly as a factory', () => {
    expect(typeof (WebpackIcons as any)({ framework: 'react' })).toBe('object')
    const esbuildPlugins = EsbuildIcons({ framework: 'react' })
    expect(Array.isArray(esbuildPlugins) ? esbuildPlugins.length > 0 : !!esbuildPlugins).toBe(true)
  })
})
