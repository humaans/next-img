const fs = require('fs')
const os = require('os')
const path = require('path')
const { default: test } = require('ava')
const runNextBuild = require('../lib/next-cli')

function createNextFixture(t, source) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'next-img-cli-'))
  const nextDir = path.join(dir, 'node_modules', 'next')
  const nextBin = path.join(nextDir, 'dist', 'bin', 'next.js')

  fs.mkdirSync(path.dirname(nextBin), { recursive: true })
  fs.writeFileSync(path.join(nextDir, 'package.json'), JSON.stringify({ name: 'next', version: '16.3.1' }))
  fs.writeFileSync(nextBin, source)

  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }))
  return dir
}

test('runs the target project Next.js CLI with the selected bundler', async t => {
  const capturePath = path.join(os.tmpdir(), `next-img-cli-${process.pid}-${Date.now()}.json`)
  const dir = createNextFixture(
    t,
    `require('fs').writeFileSync(process.env.CAPTURE_PATH, JSON.stringify({
      args: process.argv.slice(2),
      projectDir: process.env.NEXT_IMG_PROJECT_DIR,
      session: process.env.NEXT_IMG_REBUILD,
    }))`,
  )
  t.teardown(() => fs.rmSync(capturePath, { force: true }))

  await runNextBuild({
    dir,
    bundler: 'turbopack',
    env: {
      ...process.env,
      CAPTURE_PATH: capturePath,
      NEXT_IMG_PROJECT_DIR: dir,
      NEXT_IMG_REBUILD: 'test-session',
    },
  })

  t.deepEqual(JSON.parse(fs.readFileSync(capturePath, 'utf8')), {
    args: ['build', dir, '--turbopack'],
    projectDir: dir,
    session: 'test-session',
  })
})

test('rejects when the Next.js CLI build fails', async t => {
  const dir = createNextFixture(t, 'process.exitCode = 7')

  const error = await t.throwsAsync(runNextBuild({ dir, bundler: 'webpack', env: process.env }))

  t.is(error.message, 'Next.js build exited with code 7')
})
