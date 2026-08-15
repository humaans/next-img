const fs = require('fs')
const os = require('os')
const path = require('path')
const { default: test } = require('ava')
const createNextBuild = require('../lib/next-build')

function createNextFixture(t, { bundler } = {}) {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'next-img-'))
  const dist = path.join(base, 'dist')

  fs.mkdirSync(path.join(dist, 'lib'), { recursive: true })
  fs.writeFileSync(path.join(dist, 'build.js'), 'module.exports.default = (...args) => args')

  if (bundler) {
    fs.writeFileSync(path.join(dist, 'lib/bundler.js'), `exports.Bundler = ${JSON.stringify(bundler)}`)
  }

  t.teardown(() => fs.rmSync(base, { recursive: true, force: true }))
  return base
}

test('defaults to webpack when Next.js exposes its bundler API', t => {
  const base = createNextFixture(t, { bundler: { Turbopack: 0, Webpack: 1 } })
  const nextBuild = createNextBuild(base)

  t.deepEqual(nextBuild('/app'), ['/app', undefined, undefined, undefined, undefined, undefined, undefined, 1])
  t.deepEqual(nextBuild('/app', 'turbopack'), [
    '/app',
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    undefined,
    0,
  ])
})

test('supports Next.js versions without the bundler API', t => {
  const base = createNextFixture(t)
  const nextBuild = createNextBuild(base)

  t.deepEqual(nextBuild('/app'), ['/app'])
})
