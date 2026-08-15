const { default: test } = require('ava')
const { main, parseCommandLine } = require('../lib/cli')

test('parses the built-in CLI options', t => {
  t.deepEqual(parseCommandLine(['--webpack', './app']), {
    dir: './app',
    webpack: true,
    help: false,
  })
  t.throws(() => parseCommandLine(['one', 'two']), { message: /at most one/ })
})

test('runs and garbage collects a cache rebuild', async t => {
  const builds = []
  const sessions = []
  const code = await main(['--webpack', 'app'], {
    cwd: '/project',
    env: { EXAMPLE: 'yes', TURBOPACK: '1' },
    exists: () => true,
    log: () => {},
    error: t.fail,
    build: async options => builds.push(options),
    gc: async session => sessions.push(session),
  })

  t.is(code, 0)
  t.is(builds[0].dir, '/project/app')
  t.is(builds[0].bundler, 'webpack')
  t.false('TURBOPACK' in builds[0].env)
  t.is(builds[0].env.NEXT_IMG_REBUILD, sessions[0])
})

test('discards rebuild markers when the build fails', async t => {
  const discarded = []
  const code = await main([], {
    cwd: '/project',
    exists: () => true,
    log: () => {},
    error: () => {},
    build: async () => {
      throw new Error('build failed')
    },
    discardGcSession: async session => discarded.push(session),
  })

  t.is(code, 1)
  t.is(discarded.length, 1)
})
