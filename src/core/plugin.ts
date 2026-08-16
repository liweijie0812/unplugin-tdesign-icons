import { init } from 'es-module-lexer'
import type { IncomingMessage, ServerResponse } from 'node:http'
import type { UnpluginBuildContext } from 'unplugin'
import type { Framework, FrameworkConfig, Options, ResolvedOptions } from '../types.ts'
import {
  downloadSprite,
  filterSprite,
  resolveDefaultSpriteSourceUrl,
  resolveLocalIconsOptions,
} from './sprite.ts'
import { createTransformer } from './transformer.ts'

// 各框架对应的图标包配置：包名与组件深层目录。
// 公共 API 的「目录结构」被固定为 `esm/components`（TDesign 图标包的内部布局）。
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

/**
 * unplugin 工厂函数：生成插件对象并绑定到指定框架。
 * 每个公共入口（TDesignIconsVue 等）都会调用它，框架在入口处已固定。
 */
export const unpluginFactory = (framework: Framework, options: Options = {}) => {
  // Web Components 的 Icon 已内置本地图标 JSON，不使用 CDN svg-sprite。
  const packageName = frameworkConfigs[framework].packageName
  const configuredSourceUrl =
    typeof options.localIcons === 'object' ? options.localIcons.sourceUrl : undefined
  const needsDefaultSourceUrl =
    options.localIcons === true ||
    (typeof options.localIcons === 'object' && options.localIcons.sourceUrl === undefined)
  const sourceUrl =
    framework !== 'web-components' && needsDefaultSourceUrl
      ? resolveDefaultSpriteSourceUrl(packageName)
      : configuredSourceUrl
  const localIcons =
    framework === 'web-components'
      ? false
      : resolveLocalIconsOptions(options.localIcons, sourceUrl)
  let localSpriteSource: string | undefined
  const getLocalSprite = async (): Promise<string> => {
    if (!localIcons) throw new Error('[unplugin-tdesign-icons] localIcons is not enabled')
    if (!localSpriteSource) {
      localSpriteSource = filterSprite(
        await downloadSprite(localIcons.sourceUrl),
        localIcons.icons,
      )
    }
    return localSpriteSource
  }
  // 合并默认值与用户选项，得到解析后的配置
  const resolved: ResolvedOptions = {
    framework,
    localIcons,
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

  // 当前仅支持单一框架（后续若要支持多框架可扩展为数组）
  const frameworks: Framework[] = [resolved.framework]

  // 为每个框架创建独立的转换器，并注入解析后的配置
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

  const viteLocalIcons = resolved.localIcons
  const viteHooks = viteLocalIcons
    ? {
        configureServer(server: {
          middlewares: {
            use: (
              handler: (
                req: IncomingMessage,
                res: ServerResponse,
                next: (error?: unknown) => void,
              ) => void,
            ) => void
          }
        }) {
          const spritePath = new URL(viteLocalIcons.url, 'http://localhost/').pathname
          server.middlewares.use(async (req, res, next) => {
            if (req.url?.split('?', 1)[0] !== spritePath) return next()
            try {
              res.statusCode = 200
              res.setHeader('Content-Type', 'application/javascript; charset=utf-8')
              res.end(await getLocalSprite())
            } catch (error) {
              next(error)
            }
          })
        },
      }
    : undefined

  // 只处理 JS/TS（含 JSX/TSX）、Vue SFC 与 ESM 后缀的文件
  const fileExtensionRe = /\.(j|t)sx?$|\.vue$|\.mjs$/

  return {
    name: 'unplugin-tdesign-icons',
    // 在其它插件之前执行，优先改写图标导入
    enforce: 'pre' as const,
    async buildStart(this: UnpluginBuildContext) {
      if (!resolved.localIcons) return
      const source = await getLocalSprite()
      this.emitFile({
        type: 'asset',
        fileName: resolved.localIcons.fileName,
        source,
      })
    },
    vite: viteHooks,
    // 判断某个文件是否需要进入转换流程
    transformInclude(id: string) {
      // 1. 后缀不在白名单内，跳过
      if (!fileExtensionRe.test(id)) return false
      // 2. 命中 exclude 规则（RegExp 或字符串片段），跳过
      if (resolved.exclude.some((re) => (re instanceof RegExp ? re.test(id) : id.includes(re)))) {
        return false
      }
      // 3. 配置了 includeSource 时，路径必须包含其中某个片段
      if (
        resolved.includeSource.length &&
        !resolved.includeSource.some((s) => id.includes(s))
      ) {
        return false
      }
      return true
    },
    // 对命中的文件执行转换：依次尝试各框架的转换器，拿到第一个非空结果即返回
    async transform(code: string, id: string) {
      // es-module-lexer 是异步初始化的（WASM），先确保初始化完成
      await init
      for (const transformer of transformers) {
        const result = await transformer.transform(code, id)
        if (result) return result
      }
      return null
    },
  }
}
