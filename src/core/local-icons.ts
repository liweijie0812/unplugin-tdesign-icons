import type { IconTagUsage } from './types.ts'

const REGEX_PREFIX_CHARS = new Set('([{:;,=!?&|+-*%^~<>')
const REGEX_PREFIX_KEYWORDS = new Set([
  'await',
  'case',
  'delete',
  'do',
  'else',
  'in',
  'instanceof',
  'return',
  'throw',
  'typeof',
  'void',
  'yield',
])

function canStartRegex(code: string, index: number) {
  let end = index - 1
  while (end >= 0 && /\s/.test(code[end]!)) end--
  if (end < 0 || REGEX_PREFIX_CHARS.has(code[end]!)) return true

  let start = end
  while (start >= 0 && /[\w$]/.test(code[start]!)) start--
  return REGEX_PREFIX_KEYWORDS.has(code.slice(start + 1, end + 1))
}

/** 首字母小写：`Icon` → `icon`，`TIcon` → `tIcon`。 */
export function lowerFirst(s: string) {
  return s ? s[0]!.toLowerCase() + s.slice(1) : s
}

interface OpeningTag {
  tagName: string
  openTagStart: number
  openTagEnd: number
}

/** 单次扫描源码，跳过字符串、正则、模板文本与注释，只返回真实的目标标签。 */
function collectOpeningTags(code: string, accepted: Set<string>): OpeningTag[] {
  const tags: OpeningTag[] = []
  const n = code.length
  let i = 0
  let inTag = false
  let braceDepth = 0
  let inAttrString: string | null = null
  let inString: string | null = null
  let inRegex = false
  let inRegexCharClass = false
  let inTemplateText = false
  const templateExpressionDepths: number[] = []
  let inLineComment = false
  let inBlockComment = false
  let inHtmlComment = false

  while (i < n) {
    const c = code[i]!
    const next = code[i + 1] ?? ''
    const after2 = code[i + 2] ?? ''
    const after3 = code[i + 3] ?? ''

    if (inLineComment) {
      if (c === '\n') inLineComment = false
      i++
      continue
    }
    if (inBlockComment) {
      if (c === '*' && next === '/') {
        inBlockComment = false
        i += 2
      } else {
        i++
      }
      continue
    }
    if (inHtmlComment) {
      if (c === '-' && next === '-' && after2 === '>') {
        inHtmlComment = false
        i += 3
      } else {
        i++
      }
      continue
    }

    if (inAttrString) {
      if (c === '\\') {
        i += 2
        continue
      }
      if (c === inAttrString) inAttrString = null
      i++
      continue
    }

    if (inString) {
      if (c === '\\' && i + 1 < n) {
        i += 2
        continue
      }
      if (c === inString) inString = null
      i++
      continue
    }

    if (inRegex) {
      if (c === '\\' && i + 1 < n) {
        i += 2
        continue
      }
      if (c === '[') inRegexCharClass = true
      else if (c === ']') inRegexCharClass = false
      else if (c === '/' && !inRegexCharClass) {
        inRegex = false
        i++
        while (i < n && /[A-Za-z]/.test(code[i]!)) i++
        continue
      }
      i++
      continue
    }

    if (inTemplateText) {
      if (c === '\\' && i + 1 < n) {
        i += 2
      } else if (c === '`') {
        inTemplateText = false
        i++
      } else if (c === '$' && next === '{') {
        templateExpressionDepths.push(1)
        inTemplateText = false
        i += 2
      } else {
        i++
      }
      continue
    }

    if (c === '/' && next === '/') {
      inLineComment = true
      i += 2
      continue
    }
    if (c === '/' && next === '*') {
      inBlockComment = true
      i += 2
      continue
    }
    if (c === '<' && next === '!' && after2 === '-' && after3 === '-') {
      inHtmlComment = true
      i += 4
      continue
    }

    if (c === '`') {
      inTemplateText = true
      i++
      continue
    }

    if (c === '"' || c === "'") {
      if (inTag) inAttrString = c
      else {
        inString = c
      }
      i++
      continue
    }

    if (c === '/' && (!inTag || braceDepth > 0) && canStartRegex(code, i)) {
      inRegex = true
      inRegexCharClass = false
      i++
      continue
    }

    if (templateExpressionDepths.length) {
      const top = templateExpressionDepths.length - 1
      if (c === '{') templateExpressionDepths[top] = templateExpressionDepths[top]! + 1
      else if (c === '}') {
        templateExpressionDepths[top] = templateExpressionDepths[top]! - 1
        if (templateExpressionDepths[top] === 0) {
          templateExpressionDepths.pop()
          inTemplateText = true
          i++
          continue
        }
      }
    }

    if (c === '<' && /[A-Za-z!/]/.test(next || ' ')) {
      if (/[A-Za-z]/.test(next)) {
        let nameEnd = i + 2
        while (nameEnd < n && /[\w-]/.test(code[nameEnd]!)) nameEnd++
        const tagName = code.slice(i + 1, nameEnd)
        if (accepted.has(tagName)) {
          const openTagEnd = findOpeningTagEnd(code, nameEnd)
          if (openTagEnd >= 0) {
            tags.push({ tagName, openTagStart: i, openTagEnd })
            i = openTagEnd
            inTag = false
            braceDepth = 0
            continue
          }
        }
      }
      inTag = true
      i++
      continue
    }
    if (inTag) {
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

  return tags
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
  const jsxScriptRanges = isVueSfc ? collectVueJsxScriptRanges(code) : []
  for (const { tagName, openTagStart, openTagEnd } of collectOpeningTags(code, accepted)) {
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
