import type { IconTagUsage } from './types.ts'

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
  let braceDepth = 0
  let inAttrString: string | null = null
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
    if (inTag) {
      // 标签属性值里可能出现 `{...}` 对象/表达式（例如 `:popup-props="{...}"`、
      // `@change="(v) => handler(v)"` 或 `:prop={foo}`）。其中可能包含 `=>` 的
      // `>` 或嵌套的 `>`，若不加跟踪会在闭合引号之前提前退出 `inTag`，导致
      // 后续的真实标签（如 `<t-icon>`）被误当作字符串内容掩码掉。
      if (inAttrString) {
        // 属性值字符串：跳过转义，遇到配对引号后结束
        if (c === '\\') {
          i++
          continue
        }
        if (c === inAttrString) inAttrString = null
        i++
        continue
      }
      if (c === '"' || c === "'" || c === '`') {
        inAttrString = c
        i++
        continue
      }
      if (c === '{') {
        braceDepth++
        i++
        continue
      }
      if (c === '}' && braceDepth > 0) {
        braceDepth--
        i++
        continue
      }
      if (c === '>' && braceDepth === 0) {
        inTag = false
        i++
        continue
      }
      i++
      continue
    }
    i++
  }

  return chars.join('')
}

function kebabCase(name: string) {
  return name
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
    .toLowerCase()
}

function isManagedAttribute(name: string) {
  const normalized = name.replace(/^:|^v-bind:/, '').replace(/-/g, '').toLowerCase()
  return normalized === 'url' || normalized === 'loaddefaulticons'
}

/** 移除已有的 url/loadDefaultIcons，确保 localIcons 的本地地址最终生效。 */
function stripManagedAttributes(attrs: string) {
  const ranges: [number, number][] = []
  let i = 0
  while (i < attrs.length) {
    const rangeStart = i
    while (/\s/.test(attrs[i] ?? '')) i++
    if (i >= attrs.length || attrs[i] === '/') break

    const nameStart = i
    while (i < attrs.length && !/[\s=/>]/.test(attrs[i]!)) i++
    const name = attrs.slice(nameStart, i)
    while (/\s/.test(attrs[i] ?? '')) i++
    if (attrs[i] === '=') {
      i++
      while (/\s/.test(attrs[i] ?? '')) i++
      const quote = attrs[i]
      if (quote === '"' || quote === "'") {
        i++
        while (i < attrs.length) {
          if (attrs[i] === '\\') i += 2
          else if (attrs[i++] === quote) break
        }
      } else if (quote === '{') {
        let depth = 0
        let stringQuote = ''
        while (i < attrs.length) {
          const char = attrs[i++]!
          if (stringQuote) {
            if (char === '\\') i++
            else if (char === stringQuote) stringQuote = ''
          } else if (char === '"' || char === "'" || char === '`') {
            stringQuote = char
          } else if (char === '{') depth++
          else if (char === '}' && --depth === 0) break
        }
      } else {
        while (i < attrs.length && !/[\s/>]/.test(attrs[i]!)) i++
      }
    }
    if (isManagedAttribute(name)) ranges.push([rangeStart, i])
  }

  if (!ranges.length) return attrs
  let result = ''
  let last = 0
  for (const [start, end] of ranges) {
    result += attrs.slice(last, start)
    last = end
  }
  return result + attrs.slice(last)
}

function escapeAttribute(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

function findOpeningTagEnd(code: string, start: number) {
  let quote = ''
  let braceDepth = 0
  for (let i = start; i < code.length; i++) {
    const char = code[i]!
    if (quote) {
      if (char === '\\') i++
      else if (char === quote) quote = ''
      continue
    }
    if (char === '"' || char === "'" || char === '`') {
      quote = char
    } else if (char === '{') {
      braceDepth++
    } else if (char === '}') {
      if (braceDepth > 0) braceDepth--
    } else if (char === '>' && braceDepth === 0) {
      return i + 1
    }
  }
  return -1
}

/** 收集 Vue SFC 中允许 JSX 的 script 内容范围。 */
function collectVueJsxScriptRanges(code: string) {
  const ranges: [number, number][] = []
  const scriptRe = /<script\b([^>]*)>/gi
  let match: RegExpExecArray | null
  while ((match = scriptRe.exec(code))) {
    if (!/\blang\s*=\s*(['"])(?:tsx|jsx)\1/i.test(match[1]!)) continue
    const end = code.indexOf('</script>', scriptRe.lastIndex)
    if (end < 0) continue
    ranges.push([scriptRe.lastIndex, end])
    scriptRe.lastIndex = end + '</script>'.length
  }
  return ranges
}

/** 收集静态和动态 name 的图标标签，并让它们统一加载构建产物中的 sprite。 */
export function collectLocalIconTags(
  code: string,
  localNames: string[],
  aliases: Record<string, string>,
  spriteUrl: string,
  isVueSfc: boolean,
): IconTagUsage[] {
  const accepted = new Set<string>(Object.keys(aliases ?? {}))
  for (const name of localNames) {
    accepted.add(name)
    accepted.add(lowerFirst(name))
    accepted.add(kebabCase(name))
  }
  if (!accepted.size) return []

  const usages: IconTagUsage[] = []
  const tagRe = /<([A-Za-z][\w-]*)\b/g
  const masked = maskStringsAndComments(code)
  const jsxScriptRanges = isVueSfc ? collectVueJsxScriptRanges(code) : []
  let match: RegExpExecArray | null
  while ((match = tagRe.exec(masked))) {
    const tagName = match[1]!
    if (!accepted.has(tagName)) continue
    const openTagStart = match.index
    const openTagEnd = findOpeningTagEnd(code, tagRe.lastIndex)
    if (openTagEnd < 0) continue
    tagRe.lastIndex = openTagEnd
    const attrStart = openTagStart + 1 + tagName.length
    const attrsRaw = code.slice(attrStart, openTagEnd - 1)
    const selfClosing = /\/\s*$/.test(attrsRaw)
    const attrsWithoutSlash = attrsRaw.replace(/\s*\/\s*$/, '')
    const attrs = stripManagedAttributes(attrsWithoutSlash).trimEnd()
    const usesVueTemplateSyntax =
      isVueSfc && !jsxScriptRanges.some(([start, end]) => openTagStart >= start && openTagStart < end)
    const localAttrs = usesVueTemplateSyntax
      ? ` url="${escapeAttribute(spriteUrl)}" :load-default-icons="false"`
      : ` url="${escapeAttribute(spriteUrl)}" loadDefaultIcons={false}`
    usages.push({
      openTagStart,
      openTagEnd,
      replacement: `<${tagName}${attrs}${localAttrs}${selfClosing ? ' /' : ''}>`,
    })
  }
  return usages
}
