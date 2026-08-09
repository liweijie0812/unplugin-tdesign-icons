import type { IconUsage, IconUsageCollection } from './types.ts'

/**
 * 匹配标签属性字符串中的 `name="..."` / `name='...'` 属性值，
 * 返回带引号的原始值（例如 `sneer`）。
 */
const NAME_ATTR_RE = /(?:^|\s)name\s*=\s*['"]([^'"]+)['"]/

/** 首字母小写：`Icon` → `icon`，`TIcon` → `tIcon`。 */
export function lowerFirst(s: string) {
  return s ? s[0]!.toLowerCase() + s.slice(1) : s
}

/**
 * 返回 `code` 的一份副本（长度相同），其中字符串字面量、模板字符串、
 * 行/块注释以及 HTML 注释的内容会被替换为空格。这样标签扫描器就不会把
 * 出现在字符串或注释里的 `<Icon ...>` 误当成真实的组件用法。
 *
 * `<tag ...>` 内的引号会被当作属性分隔符（原样保留），因此 `name="sneer"`
 * 能保留下来 —— 调用方会通过匹配到的下标从原始 `code` 中重新提取真实属性文本。
 */
export function maskStringsAndComments(code: string): string {
  const chars = code.split('')
  const n = chars.length
  let i = 0
  let inTag = false
  let inString: string | null = null
  let inLineComment = false
  let inBlockComment = false
  let inHtmlComment = false

  // 把 [start, end) 区间内的字符（换行符除外）替换为空格
  const maskRange = (start: number, end: number) => {
    for (let j = Math.max(0, start); j < Math.min(n, end); j++) {
      if (chars[j] !== '\n') chars[j] = ' '
    }
  }

  while (i < n) {
    const c = chars[i]
    const next = i + 1 < n ? chars[i + 1] : ''
    const after2 = i + 2 < n ? chars[i + 2] : ''
    const after3 = i + 3 < n ? chars[i + 3] : ''

    if (!inString) {
      // 行注释 `// ...`
      if (inLineComment) {
        if (c === '\n') inLineComment = false
        else chars[i] = ' '
        i++
        continue
      }
      // 块注释 `/* ... */`
      if (inBlockComment) {
        if (c === '*' && next === '/') {
          chars[i] = ' '
          chars[i + 1] = ' '
          inBlockComment = false
          i += 2
        } else {
          chars[i] = ' '
          i++
        }
        continue
      }
      // HTML 注释 `<!-- ... -->`（Vue SFC 模板）
      if (inHtmlComment) {
        if (c === '-' && next === '-' && after2 === '>') {
          maskRange(i, i + 3)
          inHtmlComment = false
          i += 3
        } else {
          chars[i] = ' '
          i++
        }
        continue
      }
      if (c === '/' && next === '/') {
        chars[i] = ' '
        chars[i + 1] = ' '
        inLineComment = true
        i += 2
        continue
      }
      if (c === '/' && next === '*') {
        chars[i] = ' '
        chars[i + 1] = ' '
        inBlockComment = true
        i += 2
        continue
      }
      if (c === '<' && next === '!' && after2 === '-' && after3 === '-') {
        inHtmlComment = true
        i += 4
        continue
      }
    }

    // 字符串 / 模板字面量（在标签属性区域之外）
    if (!inString && !inTag && (c === '"' || c === "'" || c === '`')) {
      inString = c
      chars[i] = ' '
      i++
      continue
    }
    if (inString) {
      chars[i] = ' '
      // 跳过转义字符（如 `\"`）
      if (c === '\\' && i + 1 < n) {
        chars[i + 1] = ' '
        i += 2
        continue
      }
      if (c === inString) inString = null
      i++
      continue
    }

    // 跟踪 `<tag ...>` 区域，让其中的引号按属性处理而不是字符串
    if (c === '<' && /[A-Za-z!/]/.test(next || ' ')) {
      inTag = true
      i++
      continue
    }
    if (c === '>' && inTag) {
      inTag = false
      i++
      continue
    }
    i++
  }

  return chars.join('')
}

/**
 * 决定新的 `import` 行插入到哪里：
 * - `.vue` SFC 的 `<script>` 块内（在其开标签之后）；
 * - 否则在最后一条已有 import 语句之后；
 * - 都没有则放在文件最开头。
 */
export function findInjectPosition(code: string, stmts: { start: number; end: number }[]): number {
  const scriptMatch = /<script[^>]*>/g.exec(code)
  if (scriptMatch) {
    return scriptMatch.index + scriptMatch[0].length
  }
  if (stmts.length) {
    let end = -1
    for (const stmt of stmts) {
      if (stmt.end > end) end = stmt.end
    }
    return end
  }
  return 0
}

/**
 * 扫描代码，收集所有可转换为深层单图标组件的 `<Icon ...>` / `<t-icon ...>` 用法。
 *
 * @param code 原始代码
 * @param localNames 桶 `Icon` 组件在本文件中的本地名（含别名）
 * @param aliases 额外封装标签映射（如 `{ 't-icon': 'Icon' }`）
 * @param byName 图标名 → 深层组件名的查找表
 * @returns 收集到的用法列表，以及仍保留引用的本地名集合
 */
export function collectIconUsages(
  code: string,
  localNames: string[],
  aliases: Record<string, string>,
  byName: Map<string, string>,
): IconUsageCollection {
  const usages: IconUsage[] = []
  // 本地名初始为「仍在使用」，只有当它的一处具体 `<Xxx name="...">` 用法
  // 被改写成深层组件后才被清除。
  const stillUsed = new Set<string>(localNames)

  // 在 Vue 模板中，导入的 PascalCase 组件可写作 `<Icon>`、`<icon>` 或 `<t-icon>`，
  // 为每个本地名接受这些变体，确保标签无论如何大小写都能被改写。
  const accepted = new Set<string>()
  const canonicalOf = new Map<string, string>()
  for (const name of localNames) {
    accepted.add(name)
    accepted.add(lowerFirst(name))
    // PascalCase → kebab-case（`Icon` → `icon`，`MyIcon` → `my-icon`）
    accepted.add(
      name
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
        .toLowerCase(),
    )
    for (const variant of accepted) canonicalOf.set(variant, name)
  }

  // 包装桶 `Icon` 组件的额外便捷标签 —— 例如组件库把 TDesign `Icon`
  // 用短别名再导出后形成的 `<t-icon name="sneer" />`。标签映射到桶本地名
  //（通常为 `Icon`）。
  //
  // 如果本地绑定已经以 kebab-case 变体的形式产生了该标签
  //（例如 `import { Icon as TIcon }` → `<t-icon>`），则不会被覆盖，
  // 这样「仍在使用」的跟踪仍然挂在真实的本地绑定上。
  for (const [tag, barrelLocal] of Object.entries(aliases ?? {})) {
    if (!canonicalOf.has(tag)) {
      accepted.add(tag)
      canonicalOf.set(tag, barrelLocal)
    }
  }

  // 匹配任意 `<Icon ...>` / `<icon ...>` / `<Icon ... />` 开标签。
  // 分组 1 = 标签名，分组 2 = 属性字符串（不含末尾的 `>`）。
  // 我们在字符串/模板/注释已被置空的「掩码」副本上扫描，因此字符串或注释里
  // 的 `<Icon name="..." />` 绝不会被误认为真实组件用法。
  const tagRe = /<([A-Za-z][\w-]*)\b([^>]*)>/g
  const masked = maskStringsAndComments(code)
  let m: RegExpExecArray | null
  while ((m = tagRe.exec(masked))) {
    const tagName = m[1]
    if (!accepted.has(tagName)) continue
    const canonical = canonicalOf.get(tagName)!

    // 从原始代码重新提取真实属性文本（掩码副本置空了字符串内容，但下标不变）
    const attrStart = m.index + (m[0].length - m[2].length)
    const attrsRaw = code.slice(attrStart, m.index + m[0].length - 1)
    const nameMatch = NAME_ATTR_RE.exec(attrsRaw)
    if (!nameMatch) {
      // 没有静态 `name="..."` —— 例如 `<Icon />` 或 `:name`/`name={expr}`。
      stillUsed.add(canonical)
      continue
    }
    const iconName = nameMatch[1]
    const component = byName.get(iconName)
    if (!component) {
      // 图标名不在 manifest 中，无法转换
      stillUsed.add(canonical)
      continue
    }
    // 该用法可转换 —— 本地名可能因此不再被使用
    stillUsed.delete(canonical)
    const selfClosing = /\/>\s*$/.test(m[0]) || /\/\s*>$/.test(m[0])
    const openTagStart = m.index
    const openTagEnd = m.index + m[0].length

    // 从标签中移除 `name="..."` 属性，保留其它 props（如 `size`、`onClick`）。
    // 自闭合标签的结尾 ` /` 也会被移除（转换时会重新追加）。
    let attrs = attrsRaw.replace(NAME_ATTR_RE, '').replace(/\s*\/\s*$/, '')
    // 规整多余空白（例如 `  size="x"` → ` size="x"`）
    attrs = attrs.replace(/^\s+/, ' ').replace(/\s+$/, '')

    let closeTagStart = -1
    let closeTagEnd = -1
    if (!selfClosing) {
      // 寻找匹配的闭合标签 `</Icon>`（或 `</icon>`）—— 在掩码副本上查找，
      // 这样字符串/注释里的 `</Icon>` 不会被匹配到。
      const closeRe = new RegExp(`</${tagName}\s*>`, 'g')
      closeRe.lastIndex = openTagEnd
      const closeMatch = closeRe.exec(masked)
      if (closeMatch) {
        closeTagStart = closeMatch.index
        closeTagEnd = closeMatch.index + closeMatch[0].length
      }
    }

    usages.push({
      component,
      stem: iconName,
      attrs,
      selfClosing,
      openTagStart,
      openTagEnd,
      closeTagStart,
      closeTagEnd,
    })
  }

  return { usages, stillUsed }
}
