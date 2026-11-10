// @vitest-environment node
// Lives outside src/ under tsconfig.node.json: it reads the app's sources from
// disk with Node, which the app's own code never gets types for.
import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

import { expect, test } from 'vitest'

const SRC = fileURLToPath(new URL('../src', import.meta.url))

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* sourceFiles(path)
    else if (/\.(s?css|tsx?)$/.test(entry.name)) yield path
  }
}

// `vh` is the height with the browser bars hidden: on a phone a 100vh box is
// taller than the screen while they show, and ignores the on-screen keyboard.
// Use dvh (follows both, with interactive-widget=resizes-content in
// index.html), svh or lvh — the same rule TedUI holds itself to.
test('no plain vh units in the app', () => {
  const offenders: string[] = []
  for (const file of sourceFiles(SRC)) {
    readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line: string, index: number) => {
        if (/(?<![a-z])\d*\.?\d+vh\b/.test(line))
          offenders.push(`${relative(SRC, file)}:${index + 1}: ${line.trim()}`)
      })
  }
  expect(offenders).toEqual([])
})
