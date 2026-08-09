import type { IconUsage, IconUsageCollection } from './types.ts'

/**
 * Match a `name="..."` / `name='...'` attribute value inside a tag's
 * attribute string. Returns the raw quoted value (e.g. `sneer`).
 */
const NAME_ATTR_RE = /(?:^|\s)name\s*=\s*['"]([^'"]+)['"]/

/** Lowercase the first letter: `Icon` → `icon`, `TIcon` → `tIcon`. */
export function lowerFirst(s: string) {
  return s ? s[0]!.toLowerCase() + s.slice(1) : s
}

/**
 * Return a copy of `code` (same length) where the contents of string literals,
 * template literals, line/block comments and HTML comments are replaced with
 * spaces. This lets the tag scanner skip `<Icon ...>` that appears inside a
 * string or comment instead of being a real component usage.
 *
 * Quotes inside a `<tag ...>` are treated as attribute delimiters (kept as-is)
 * so `name="sneer"` survives — the caller re-extracts the real attribute
 * text from the original `code` via the matched indices.
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
      // Line comment `// ...`
      if (inLineComment) {
        if (c === '\n') inLineComment = false
        else chars[i] = ' '
        i++
        continue
      }
      // Block comment `/* ... */`
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
      // HTML comment `<!-- ... -->` (Vue SFC templates)
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

    // String / template literal (outside of a tag's attribute area)
    if (!inString && !inTag && (c === '"' || c === "'" || c === '`')) {
      inString = c
      chars[i] = ' '
      i++
      continue
    }
    if (inString) {
      chars[i] = ' '
      if (c === '\\' && i + 1 < n) {
        chars[i + 1] = ' '
        i += 2
        continue
      }
      if (c === inString) inString = null
      i++
      continue
    }

    // Track `<tag ...>` regions so quotes inside are treated as attributes.
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
 * Decide where to inject new `import` lines:
 * - inside the `<script>` block of a `.vue` SFC (after its opening tag);
 * - otherwise after the last existing import statement;
 * - else at the very start of the file.
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

export function collectIconUsages(
  code: string,
  localNames: string[],
  aliases: Record<string, string>,
  byName: Map<string, string>,
): IconUsageCollection {
  const usages: IconUsage[] = []
  // A local name starts out "used" and is only cleared when a concrete
  // `<Xxx name="...">` usage of it is rewritten to a deep component.
  const stillUsed = new Set<string>(localNames)

  // In Vue templates an imported PascalCase component can be used as
  // `<Icon>`, `<icon>` or `<t-icon>` — accept those variants for each local
  // name so the tag gets rewritten regardless of casing.
  const accepted = new Set<string>()
  const canonicalOf = new Map<string, string>()
  for (const name of localNames) {
    accepted.add(name)
    accepted.add(lowerFirst(name))
    // PascalCase → kebab-case (`Icon` → `icon`, `MyIcon` → `my-icon`)
    accepted.add(
      name
        .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
        .replace(/([A-Z])([A-Z][a-z])/g, '$1-$2')
        .toLowerCase(),
    )
    for (const variant of accepted) canonicalOf.set(variant, name)
  }

  // Extra convenience tags that wrap the barrel `Icon` component — e.g.
  // `<t-icon name="sneer" />` from a component library that re-exports
  // TDesign `Icon` under a short alias. The tag maps to the barrel local
  // name (usually `Icon`).
  //
  // A tag is NOT overridden if a local binding already produces it as a
  // kebab-case variant (e.g. `import { Icon as TIcon }` → `<t-icon>`), so the
  // still-used tracking stays attached to the real local binding.
  for (const [tag, barrelLocal] of Object.entries(aliases ?? {})) {
    if (!canonicalOf.has(tag)) {
      accepted.add(tag)
      canonicalOf.set(tag, barrelLocal)
    }
  }

  // Match any `<Icon ...>` / `<icon ...>` / `<Icon ... />` opening tag.
  // Group 1 = tag name, group 2 = attribute string (excluding the final `>`).
  // We scan a "masked" copy of the code where string literals, template
  // literals and comments are blanked out, so `<Icon name="..." />` inside a
  // string/comment is never mistaken for a real component usage.
  const tagRe = /<([A-Za-z][\w-]*)\b([^>]*)>/g
  const masked = maskStringsAndComments(code)
  let m: RegExpExecArray | null
  while ((m = tagRe.exec(masked))) {
    const tagName = m[1]
    if (!accepted.has(tagName)) continue
    const canonical = canonicalOf.get(tagName)!

    // Re-extract the real attribute text from the original code (the masked
    // copy blanked out the string contents, but the indices are unchanged).
    const attrStart = m.index + (m[0].length - m[2].length)
    const attrsRaw = code.slice(attrStart, m.index + m[0].length - 1)
    const nameMatch = NAME_ATTR_RE.exec(attrsRaw)
    if (!nameMatch) {
      // No static `name="..."` — e.g. `<Icon />` or `:name`/`name={expr}`.
      stillUsed.add(canonical)
      continue
    }
    const iconName = nameMatch[1]
    const component = byName.get(iconName)
    if (!component) {
      stillUsed.add(canonical)
      continue
    }
    // This usage is convertible — the local name may become unused.
    stillUsed.delete(canonical)
    const selfClosing = /\/>\s*$/.test(m[0]) || /\/\s*>$/.test(m[0])
    const openTagStart = m.index
    const openTagEnd = m.index + m[0].length

    // Strip the `name="..."` attribute from the tag so the component keeps
    // its remaining props (e.g. `size`, `onClick`). For self-closing tags the
    // trailing ` /` is removed too (the transform re-appends it).
    let attrs = attrsRaw.replace(NAME_ATTR_RE, '').replace(/\s*\/\s*$/, '')
    // Normalize leftover whitespace (e.g. `  size="x"` → ` size="x"`).
    attrs = attrs.replace(/^\s+/, ' ').replace(/\s+$/, '')

    let closeTagStart = -1
    let closeTagEnd = -1
    if (!selfClosing) {
      // Find the matching closing tag `</Icon>` (or `</icon>`) — search the
      // masked copy so a `</Icon>` inside a string/comment is not matched.
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
