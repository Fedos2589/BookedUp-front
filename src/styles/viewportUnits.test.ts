import { readdirSync, readFileSync } from 'node:fs'
import { join, relative } from 'node:path'

import { expect, test } from 'vitest'

const SRC = join(__dirname, '..')

function* sourceFiles(dir: string): Generator<string> {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name)
    if (entry.isDirectory()) yield* sourceFiles(path)
    else if (/\.(scss|tsx)$/.test(entry.name)) yield path
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
      .forEach((line, index) => {
        if (/(?<![a-z])\d*\.?\d+vh\b/.test(line))
          offenders.push(`${relative(SRC, file)}:${index + 1}: ${line.trim()}`)
      })
  }
  expect(offenders).toEqual([])
})
