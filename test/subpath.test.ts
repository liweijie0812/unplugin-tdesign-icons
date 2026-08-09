import { describe, it, expect } from 'vitest'
import {
  TDesignIconsVue,
  TDesignIconsVueNext,
  TDesignIconsReact,
  TDesignIconsWebComponents,
} from '../src/vite'
import { TDesignIconsReact as RollupReact } from '../src/rollup'
import { TDesignIconsReact as RolldownReact } from '../src/rolldown'
import { TDesignIconsVueNext as WebpackVueNext } from '../src/webpack'
import { TDesignIconsReact as RspackReact } from '../src/rspack'
import { TDesignIconsReact as EsbuildReact } from '../src/esbuild'

// 用户要求的用法：从构建工具子路径具名导入框架插件工厂，直接 `TDesignIconsXxx()` 调用。
describe('build-tool subpath entries', () => {
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

  it('no default export remains (generic factory removed, framework is internal)', async () => {
    // The generic factory / default export was removed: every public entry is
    // bound to one framework, so `framework` is no longer a user option.
    for (const mod of [
      await import('../src/vite'),
      await import('../src/rollup'),
      await import('../src/rolldown'),
      await import('../src/webpack'),
      await import('../src/rspack'),
      await import('../src/esbuild'),
    ]) {
      expect((mod as any).default).toBeUndefined()
    }
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

  it('vite: named factories ignore a redundant framework field', async () => {
    // The framework is fixed by the entry, so passing `framework` must not
    // switch it (framework 参数在框架分包入口是多余的).
    const plugin = TDesignIconsVueNext({ framework: 'react' } as any) as any
    const id = '/project/src/App.vue'
    const result = await plugin.transform.call(
      {},
      `import { CloseIcon } from 'tdesign-icons-vue-next'`,
      id,
    )
    // Still bound to vue-next, not react.
    expect(result.code).toContain(`import CloseIcon from 'tdesign-icons-vue-next/esm/components/close.js'`)
    expect(result.code).not.toContain('tdesign-icons-react')
  })

  it('rollup/rolldown/webpack/rspack/esbuild named factories can be called directly', () => {
    expect(typeof (RollupReact as any)({})).toBe('object')
    expect(typeof (RolldownReact as any)({})).toBe('object')
    expect(typeof (WebpackVueNext as any)({})).toBe('object')
    expect(typeof (RspackReact as any)({})).toBe('object')
    const esbuildPlugins = EsbuildReact({})
    expect(Array.isArray(esbuildPlugins) ? esbuildPlugins.length > 0 : !!esbuildPlugins).toBe(true)
  })
})
