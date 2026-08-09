import { init } from 'es-module-lexer'
import type { Framework, FrameworkConfig, Options, ResolvedOptions } from '../types.ts'
import { createTransformer } from './transformer.ts'

const frameworkConfigs: Record<
  Framework,
  Omit<FrameworkConfig, 'includeSource' | 'localIcons' | 'aliases'>
> = {
  vue: {
    framework: 'vue',
    packageName: 'tdesign-icons-vue',
    componentDir: 'esm/components',
  },
  'vue-next': {
    framework: 'vue-next',
    packageName: 'tdesign-icons-vue-next',
    componentDir: 'esm/components',
  },
  react: {
    framework: 'react',
    packageName: 'tdesign-icons-react',
    componentDir: 'esm/components',
  },
  'web-components': {
    framework: 'web-components',
    packageName: 'tdesign-icons-web-components',
    componentDir: 'esm/components',
  },
}

export const unpluginFactory = (framework: Framework, options: Options = {}) => {
  const resolved: ResolvedOptions = {
    framework,
    localIcons: options.localIcons ?? false,
    // TDesign Vue 组件库把 `Icon` 封装为 `<t-icon>`（全局注册），默认识别它；
    // 用户可传入 `aliases` 自定义其它封装标签。React/Web Components 无此约定。
    aliases:
      options.aliases ??
      (framework === 'vue' || framework === 'vue-next'
        ? { 't-icon': 'Icon' }
        : {}),
    includeSource: options.includeSource ?? [],
    exclude: options.exclude ?? [/node_modules/],
  }

  const frameworks: Framework[] = [resolved.framework]

  const transformers = frameworks.map((framework) => {
    const base = frameworkConfigs[framework]
    const config: FrameworkConfig = {
      ...base,
      includeSource: resolved.includeSource,
      localIcons: resolved.localIcons,
      aliases: resolved.aliases,
    }
    return createTransformer(config)
  })

  const fileExtensionRe = /\.(j|t)sx?$|\.vue$|\.mjs$/

  return {
    name: 'unplugin-tdesign-icons',
    enforce: 'pre' as const,
    transformInclude(id: string) {
      if (!fileExtensionRe.test(id)) return false
      if (resolved.exclude.some((re) => (re instanceof RegExp ? re.test(id) : id.includes(re)))) {
        return false
      }
      if (
        resolved.includeSource.length &&
        !resolved.includeSource.some((s) => id.includes(s))
      ) {
        return false
      }
      return true
    },
    async transform(code: string, id: string) {
      await init
      for (const transformer of transformers) {
        const result = await transformer.transform(code, id)
        if (result) return result
      }
      return null
    },
  }
}
