import { describe, it, expect } from 'vitest'
import ViteIcons, {
  TDesignIconsVue,
  TDesignIconsVueNext,
  TDesignIconsReact,
  TDesignIconsWebComponents,
} from '../src/vite'
import RollupIcons, { TDesignIconsReact as RollupReact } from '../src/rollup'
import RolldownIcons, { TDesignIconsReact as RolldownReact } from '../src/rolldown'
import WebpackIcons, { TDesignIconsVueNext as WebpackVueNext } from '../src/webpack'
import RspackIcons, { TDesignIconsReact as RspackReact } from '../src/rspack'
import EsbuildIcons, { TDesignIconsReact as EsbuildReact } from '../src/esbuild'

// 用户要求的用法：从构建工具子路径具名导入框架插件工厂，直接 `TDesignIconsXxx()` 调用。
describe('build-tool subpath entries', () => {
  it('default export is a callable plugin factory (unplugin-icons style)', () => {
    expect(typeof ViteIcons).toBe('function')
    expect(typeof RollupIcons).toBe('function')
    expect(typeof RolldownIcons).toBe('function')
    expect(typeof WebpackIcons).toBe('function')
    expect(typeof RspackIcons).toBe('function')
    expect(typeof EsbuildIcons).toBe('function')
  })

  it('named framework factories are exported from every subpath', () => {
    // /vite
    expect(typeof TDesignIconsVue).toBe('function')
    expect(typeof TDesignIconsVueNext).toBe('function')
    expect(typeof TDesignIconsReact).toBe('function')
    expect(typeof TDesignIconsWebComponents).toBe('function')
    // /rollup
    expect(typeof RollupReact).toBe('function')
    // /rolldown
    expect(typeof RolldownReact).toBe('function')
    // /webpack
    expect(typeof WebpackVueNext).toBe('function')
    // /rspack
    expect(typeof RspackReact).toBe('function')
    // /esbuild
    expect(typeof EsbuildReact).toBe('function')
  })

  it('vite: TDesignIconsVueNext() returns a plugin bound to vue-next', async () => {
    const plugin = TDesignIconsVueNext() as any
    expect(plugin).toBeTruthy()
    expect(plugin.name).toBe('unplugin-tdesign-icons')
    expect(plugin.enforce).toBe('pre')
    expect(typeof plugin.transform).toBe('function')

    const id = '/project/src/App.vue'
    expect(plugin.transformInclude(id)).toBe(true)
    const result = await plugin.transform.call(
      {},
      `import { CloseIcon } from 'tdesign-icons-vue-next'`,
      id,
    )
    expect(result.code).toContain(`import CloseIcon from 'tdesign-icons-vue-next/esm/components/close.js'`)
  })

  it('vite: TDesignIconsReact() rewrites tdesign-icons-react imports', async () => {
    const plugin = TDesignIconsReact() as any
    const id = '/project/src/App.tsx'
    expect(plugin.transformInclude(id)).toBe(true)
    const result = await plugin.transform.call(
      {},
      `import { CloseIcon } from 'tdesign-icons-react'`,
      id,
    )
    expect(result.code).toContain(`import CloseIcon from 'tdesign-icons-react/esm/components/close.js'`)
  })

  it('vite: default export Icons({ framework }) still works', async () => {
    const plugin = ViteIcons({ framework: 'react' }) as any
    const id = '/project/src/App.tsx'
    expect(plugin.transformInclude(id)).toBe(true)
    const result = await plugin.transform.call(
      {},
      `import { CloseIcon } from 'tdesign-icons-react'`,
      id,
    )
    expect(result.code).toContain(`import CloseIcon from 'tdesign-icons-react/esm/components/close.js'`)
  })

  it('rollup/rolldown/webpack/rspack/esbuild named factories can be called directly', () => {
    expect(typeof (RollupReact as any)({})).toBe('object')
    expect(typeof (RolldownReact as any)({})).toBe('object')
    expect(typeof (WebpackVueNext as any)({})).toBe('object')
    expect(typeof (RspackReact as any)({})).toBe('object')
    const esbuildPlugins = EsbuildReact({})
    expect(Array.isArray(esbuildPlugins) ? esbuildPlugins.length > 0 : !!esbuildPlugins).toBe(true)
  })

  it('framework factories are also attached onto the default export (CJS interop)', () => {
    // `require('unplugin-tdesign-icons/webpack')` returns the default factory
    // (via `module.exports` interop), and the framework factories are attached
    // onto it so `const { TDesignIconsVueNext } = require(...)` also works.
    expect(typeof (ViteIcons as any).TDesignIconsVueNext).toBe('function')
    expect(typeof (ViteIcons as any).TDesignIconsReact).toBe('function')
    expect(typeof (RollupIcons as any).TDesignIconsReact).toBe('function')
    expect(typeof (WebpackIcons as any).TDesignIconsVueNext).toBe('function')
    expect(typeof (RspackIcons as any).TDesignIconsReact).toBe('function')
    expect(typeof (EsbuildIcons as any).TDesignIconsReact).toBe('function')
  })
})
