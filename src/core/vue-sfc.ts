import { parse } from 'es-module-lexer'
import { MagicString } from 'magic-string'
import type { FrameworkConfig, TransformResult } from '../types.ts'
import { getBabelParse, getSfcParse } from './lazy-loaders.ts'
import { loadManifest } from './manifest.ts'
import type { ComponentRegistrations, SFCAstNode } from './types.ts'

/**
 * Locate the `components` option inside a classic `<script>` (Options API) and
 * return the entries that map a template tag to an icon-barrel local (`Icon`),
 * plus the offsets needed to update the object once tags are rewritten.
 * Returns `null` when there is no `components` object to speak of.
 */
export async function getComponentRegistrations(
  scriptCode: string,
  iconLocals: Set<string>,
): Promise<ComponentRegistrations | null> {
  const parse = await getBabelParse()
  if (!parse) return null
  let ast: any
  try {
    ast = parse(scriptCode, { sourceType: 'module', errorRecovery: true })
  } catch {
    return null
  }
  const defaultExport = ast.program.body.find(
    (n: any) => n.type === 'ExportDefaultDeclaration',
  )
  if (!defaultExport || defaultExport.declaration.type !== 'ObjectExpression') return null
  const componentsProp = defaultExport.declaration.properties.find(
    (p: any) => p.type === 'ObjectProperty' && p.key?.name === 'components',
  )
  if (!componentsProp || componentsProp.value.type !== 'ObjectExpression') return null
  const regs: { tag: string; local: string; start: number; end: number }[] = []
  const props: { start: number; end: number; raw: string }[] = []
  for (const prop of componentsProp.value.properties) {
    if (prop.type !== 'ObjectProperty' && prop.type !== 'ObjectMethod') continue
    props.push({
      start: prop.start,
      end: prop.end,
      raw: scriptCode.slice(prop.start, prop.end),
    })
    const keyName = prop.key?.name ?? prop.key?.value
    if (!keyName) continue
    const valueName = prop.shorthand ? keyName : prop.value?.name
    if (!valueName || !iconLocals.has(valueName)) continue
    regs.push({ tag: keyName, local: valueName, start: prop.start, end: prop.end })
  }
  return {
    valueStart: componentsProp.value.start,
    valueEnd: componentsProp.value.end,
    props,
    regs,
  }
}

/**
 * Vue SFC re-writing — supports both `<script setup>` (Vue 2.7+/Vue 3) and
 * classic `<script>` (Options API, Vue 2 classic SFC):
 *
 *   <script setup>
 *   import { Icon } from 'tdesign-icons-vue-next'
 *   </script>
 *   <template>
 *     <Icon name="sneer" size="large" />
 *   </template>
 *
 * becomes
 *
 *   <script setup>
 *   import SneerIcon from 'tdesign-icons-vue-next/esm/components/sneer.js'
 *   </script>
 *   <template>
 *     <SneerIcon size="large" />
 *   </template>
 *
 * For a classic `<script>` the binding is confirmed via the `components`
 * option (`components: { Icon }`) and the registration is updated to point at
 * the introduced deep component once every usage of that tag is rewritten.
 *
 * Only static `<Icon name="...">` tags (no dynamic `:name`) whose icon exists
 * are rewritten; anything else keeps the original `Icon` binding intact.
 */
export async function transformSfc(code: string, id: string, config: FrameworkConfig): Promise<TransformResult> {
  const parseSfc = await getSfcParse()
  if (!parseSfc) return null

  // `@vue/compiler-sfc`'s `parse` is non-throwing: errors accumulate in
  // `errors` (a plain JS file yields "At least one <template> or <script> is
  // required"). Bail out without touching the code.
  const { descriptor, errors } = parseSfc(code, { filename: id })
  if (errors.length || !descriptor.template?.ast) return null

  // `<script setup>` (Vue 2.7+/Vue 3) or classic `<script>` (Options API,
  // Vue 2 classic SFC). Classic mode needs the `components` registration to
  // confirm the template `<Icon>` binding.
  const isSetup = Boolean(descriptor.scriptSetup)
  const scriptBlock = descriptor.scriptSetup ?? descriptor.script
  if (!scriptBlock) return null

  const { template } = descriptor
  // `loc` spans the *content* (between the `<script ...>` opening and the
  // `</script>` closing tags) in both compiler-sfc v2 and v3.
  const setupStart = scriptBlock.loc.start.offset
  const setupEnd = scriptBlock.loc.end.offset
  const { exportMap, nameToStem, stemToIcon } = loadManifest(config.packageName)

  const setupCode = code.slice(setupStart, setupEnd)
  let setupImports: readonly import('es-module-lexer').ImportSpecifier[]
  try {
    ;[setupImports] = parse(setupCode)
  } catch {
    // Unparseable <script> body (unusual TS/decorator syntax) — leave
    // the whole file untouched rather than risk corrupting it.
    return null
  }

  // Collect the icon-barrel import statements inside the <script> block.
  const pkgImports: {
    ss: number
    se: number
    statement: string
    specifiers: { original: string; local: string; raw: string }[]
  }[] = []
  for (const imp of setupImports) {
    if (imp.n !== config.packageName) continue
    const statement = setupCode.slice(imp.ss, imp.se)
    // Re-exports / type-only imports don't introduce a usable local binding.
    if (/^export\b/.test(statement)) continue
    if (/^import\s+type\b/.test(statement)) continue
    const specifierMatch = statement.match(/\{([\s\S]*)\}/)
    if (!specifierMatch) continue
    const specifiers = specifierMatch[1]!
      .split(',')
      .map((n) => n.trim())
      .filter(Boolean)
      .map((raw) => {
        const [original, alias] = raw.split(/\s+as\s+/)
        return { original: original!.trim(), local: (alias ? alias.trim() : original!.trim()), raw }
      })
    pkgImports.push({ ss: imp.ss, se: imp.se, statement, specifiers })
  }

  // The template re-write only applies when `<Icon>` is explicitly bound to
  // the icon barrel (`import { Icon } from 'tdesign-icons-xxx'`):
  // - `<script setup>`: an import specifier `{ Icon }` (or an alias) exists;
  // - classic `<script>`: the icon-barrel `Icon` local must also be
  //   registered in `components: { Icon }` (otherwise `<Icon>` is likely a
  //   global/custom component — leave untouched).
  const iconLocals = new Set(
    pkgImports.flatMap((p) =>
      p.specifiers
        .filter((s) => s.original === 'Icon')
        .map((s) => s.local),
    ),
  )
  let registrations: ComponentRegistrations | null = null
  if (isSetup) {
    if (!iconLocals.size) return null
  } else {
    registrations = await getComponentRegistrations(setupCode, iconLocals)
    if (!registrations || !registrations.regs.length) return null
  }

  // Scan the <template> AST for static `<Icon name="...">` tags.
  const rewrites: {
    tagStart: number
    tagEnd: number
    newTag: string
    nameStart: number
    nameEnd: number
    stem: string
  }[] = []
  const sfcImports: { local: string; stem: string }[] = []
  let templateChanged = false
  // Per registered tag: how many usages were rewritable vs not. A
  // registration is only dropped when *every* usage of that tag was
  // rewritten (a remaining dynamic/unknown `<Icon>` keeps the binding).
  const rewritableCount = new Map<string, number>()
  const unrewritableCount = new Map<string, number>()
  const walk = (node: SFCAstNode) => {
    if (!node || typeof node !== 'object') return
    if (node.type === 1) {
      const tagBound = isSetup
        ? iconLocals.has(node.tag)
        : registrations!.regs.some((r) => r.tag === node.tag)
      if (tagBound) {
        const staticNames = (node.props || []).filter(
          (p: any) => p.type === 6 && p.name === 'name',
        )
        const dynamicName = (node.props || []).some(
          (p: any) => p.type === 7 && (p.arg?.content === 'name' || !p.arg),
        )
        if (staticNames.length === 1 && !dynamicName) {
          const name = staticNames[0].value.content
          const stem = nameToStem.get(name)
          if (stem) {
            const iconName = stemToIcon.get(stem) ?? name
            const local = `${iconName}Icon`
            const tagStart = node.loc.start.offset
            const tagEnd = tagStart + 1 + node.tag.length
            const nameProp = staticNames[0]
            let nameStart = nameProp.loc.start.offset
            const nameEnd = nameProp.loc.end.offset
            // Absorb the whitespace before `name="..."` so the rename
            // (`<Icon name=... />` → `<SneerIcon />`) stays clean.
            if (nameStart > 0 && /\s/.test(code[nameStart - 1])) nameStart -= 1
            rewrites.push({ tagStart, tagEnd, newTag: local, nameStart, nameEnd, stem })
            // Dedup: the same `<Icon name>` may appear multiple times.
            if (!sfcImports.some((i) => i.local === local)) {
              sfcImports.push({ local, stem })
            }
            rewritableCount.set(node.tag, (rewritableCount.get(node.tag) ?? 0) + 1)
          } else {
            // Un-rewritable `<Icon>` → the original `Icon` binding must stay.
            unrewritableCount.set(node.tag, (unrewritableCount.get(node.tag) ?? 0) + 1)
            templateChanged = true
          }
        } else {
          // Un-rewritable `<Icon>` → the original `Icon` binding must stay.
          unrewritableCount.set(node.tag, (unrewritableCount.get(node.tag) ?? 0) + 1)
          templateChanged = true
        }
      }
      for (const child of node.children || []) walk(child)
    } else if (node.children) {
      for (const child of node.children) walk(child)
    }
  }
  walk(template.ast)

  // Nothing to rewrite.
  if (!sfcImports.length) return null

  // A registration is dropped only when every usage of its tag was rewritten.
  for (const r of registrations?.regs ?? []) {
    const rew = rewritableCount.get(r.tag) ?? 0
    const unrew = unrewritableCount.get(r.tag) ?? 0
    if (rew > 0 && unrew === 0) r.removed = true
  }

  const s = new MagicString(code)
  for (const rw of rewrites) {
    // Replace only the tag *name* (`Icon` → `SneerIcon`), keeping the `<`.
    s.overwrite(rw.tagStart + 1, rw.tagEnd, rw.newTag)
    s.overwrite(rw.nameStart, rw.nameEnd, '')
  }

  const sfcLocals = new Set(sfcImports.map((i) => i.local))
  // All package import ranges (setup-relative), used for the "Icon used
  // elsewhere in the script body?" reference check.
  const pkgRanges: [number, number][] = pkgImports.map((p) => [p.ss, p.se])
  // Registrations that were dropped (their tag fully rewritten) must not
  // count as a script-body reference — otherwise the `Icon` import would
  // never be removed even though `components: { Icon }` is gone.
  const removedRegRanges: [number, number][] = (registrations?.regs ?? [])
    .filter((r) => r.removed)
    .map((r) => [r.start, r.end])
  const isReferencedOutside = (name: string) => {
    const re = new RegExp(`\\b${name}\\b`, 'g')
    let m: RegExpExecArray | null
    while ((m = re.exec(setupCode))) {
      const idx = m.index
      if (pkgRanges.some(([s, e]) => idx >= s && idx < e)) continue
      if (removedRegRanges.some(([s, e]) => idx >= s && idx < e)) continue
      return true
    }
    return false
  }

  // Classic `<script>` (Options API): the rewritten `<XxxIcon />` tags are
  // compiled by Vue 2 into `_c("XxxIcon")`, which Vue resolves at runtime from
  // the `components` option. So instead of dropping the registration we rebuild
  // the `components` object to register every introduced deep icon component
  // (plus any non-icon registrations that were already there).
  if (registrations) {
    const stillBound = registrations.regs.filter((r) => !r.removed)
    // Non-icon registrations (e.g. `MyButton`) keep their raw source.
    const nonIconProps = registrations.props.filter(
      (p) => !registrations.regs.some((r) => r.start === p.start && r.end === p.end),
    )
    const entries: string[] = []
    const pushEntry = (e: string) => {
      if (!entries.includes(e)) entries.push(e)
    }
    for (const imp of sfcImports) pushEntry(imp.local) // deep icon components
    for (const r of stillBound) {
      // Re-emit the raw source of a still-bound registration (e.g. `Icon`).
      const prop = registrations.props.find((p) => p.start === r.start && p.end === r.end)
      pushEntry(prop ? prop.raw : r.local)
    }
    for (const p of nonIconProps) pushEntry(p.raw) // unrelated components
    const newValue = `{ ${entries.join(', ')} }`
    s.overwrite(
      setupStart + registrations.valueStart,
      setupStart + registrations.valueEnd,
      newValue,
    )
  }

  const lines: string[] = []
  // Host the generated deep imports in the import statement that carries the
  // `Icon` specifier (guaranteed to exist by the `hasIconBinding` gate).
  let hostPkg = pkgImports.find((p) => p.specifiers.some((s) => s.local === 'Icon'))
  if (!hostPkg) hostPkg = pkgImports[0]
  for (const pkg of pkgImports) {
    const kept: string[] = []
    const deep: { local: string; stem: string }[] = []
    for (const spec of pkg.specifiers) {
      const { original, local, raw } = spec
      if (sfcLocals.has(local)) continue // introduced by the template rewrite
      if (exportMap.has(original)) {
        // Regular icon import (e.g. `CloseIcon`) → deep import.
        deep.push({ local, stem: exportMap.get(original)! })
        continue
      }
      if (original === 'Icon') {
        // The dynamic `<Icon name>` component. Drop it only when every
        // `<Icon>` in the template was rewritten AND it isn't referenced in
        // the script body. Classic mode additionally needs the registration
        // to be gone (a template `components: { Icon }` with an un-rewritten
        // `<Icon>` must keep the binding).
        if (!templateChanged && !isReferencedOutside(local) && (!registrations || !registrations.regs.some((r) => r.local === local && !r.removed))) {
          continue
        }
      }
      kept.push(raw)
    }
    const stmtLines: string[] = []
    if (kept.length) stmtLines.push(`import { ${kept.join(', ')} } from '${config.packageName}'`)
    for (const d of deep) {
      stmtLines.push(`import ${d.local} from '${config.packageName}/${config.componentDir}/${d.stem}.js'`)
    }
    if (pkg === hostPkg) {
      for (const imp of sfcImports) {
        stmtLines.push(`import ${imp.local} from '${config.packageName}/${config.componentDir}/${imp.stem}.js'`)
      }
    }
    if (stmtLines.length) {
      s.overwrite(setupStart + pkg.ss, setupStart + pkg.se, stmtLines.join('\n'))
      lines.push(...stmtLines)
    }
  }

  if (!rewrites.length && !lines.length) return null

  return { code: s.toString(), map: s.generateMap({ hires: true }) }
}
