const fs = require('fs')
const os = require('os')
const path = require('path')
const { default: test } = require('ava')
const sharp = require('sharp')
const assetStore = require('../lib/asset-store')

test('garbage collection uses filesystem markers from build workers', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'next-img-store-'))
  const session = `test-${process.pid}-${Date.now()}`
  const cacheDir = path.join(dir, 'resources')
  const stageDir = path.join(dir, 'stage')
  const data = await sharp({
    create: {
      width: 8,
      height: 8,
      channels: 3,
      background: { r: 20, g: 40, b: 60 },
    },
  })
    .jpeg()
    .toBuffer()

  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }))

  await assetStore.cached(
    async () => ({ data, width: 8, height: 8, format: 'jpeg' }),
    'used.jpg',
    {
      dir,
      cache: { mode: 'read-write', dir: 'resources', rebuildSession: session },
      assetStageDir: stageDir,
    },
    'processing test image',
  )
  fs.writeFileSync(path.join(cacheDir, 'unused.jpg'), 'unused')
  await assetStore.stage('used.jpg', data, {
    assetStageDir: stageDir,
    cache: { mode: 'read-write', dir: 'resources', rebuildSession: session },
  })
  fs.writeFileSync(path.join(stageDir, 'unused.jpg'), 'unused')

  await assetStore.gc(session)

  t.deepEqual(fs.readdirSync(cacheDir), ['used.jpg'])
  t.deepEqual(fs.readdirSync(stageDir), ['used.jpg'])
})

test('coalesces concurrent transformations for the same cache entry', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'next-img-store-'))
  const data = await sharp({
    create: { width: 8, height: 8, channels: 3, background: 'red' },
  })
    .jpeg()
    .toBuffer()
  let transformations = 0
  const config = {
    dir,
    distDir: '.next',
    cacheDir: path.join('cache', 'next-img'),
    cache: { mode: 'off', dir: 'resources', rebuildSession: null },
  }
  const create = async () => {
    transformations += 1
    await new Promise(resolve => setTimeout(resolve, 10))
    return { data, width: 8, height: 8, format: 'jpeg' }
  }
  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }))

  await Promise.all([
    assetStore.cached(create, 'same.jpg', config, 'processing'),
    assetStore.cached(create, 'same.jpg', config, 'processing'),
  ])

  t.is(transformations, 1)
})

test('read-only cache mode rejects misses except during rebuilds', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'next-img-store-'))
  const session = `read-only-${process.pid}-${Date.now()}`
  const data = await createImage('red')
  const config = {
    dir,
    cache: { mode: 'read-only', dir: 'resources', rebuildSession: null },
  }
  const create = async () => ({ data, width: 8, height: 8, format: 'jpeg' })
  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }))

  await t.throwsAsync(assetStore.cached(create, 'missing.jpg', config, 'processing'), {
    message: /Missing an optimised image/,
  })

  await assetStore.cached(
    create,
    'missing.jpg',
    { ...config, cache: { ...config.cache, rebuildSession: session } },
    'processing',
  )
  await assetStore.discardGcSession(session)
  t.true(fs.existsSync(path.join(dir, 'resources', 'missing.jpg')))
})

test('refreshes processing changes in place during cleanup builds', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'next-img-store-'))
  const cacheDir = path.join(dir, 'resources')
  const first = await createImage('red')
  const second = await createImage('blue')
  const warnings = []
  let transformations = 0
  const config = {
    dir,
    cache: { mode: 'read-write', dir: 'resources', rebuildSession: null },
    processing: { pipelineVersion: 2, toolchain: { sharp: 'one', vips: 'one' } },
    warn: warning => warnings.push(warning),
  }
  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }))

  const create = data => async () => {
    transformations += 1
    return { data, width: 8, height: 8, format: 'jpeg' }
  }

  const firstSession = `first-${process.pid}-${Date.now()}`
  await assetStore.cached(
    create(first),
    'stable.jpg',
    { ...config, cache: { ...config.cache, rebuildSession: firstSession } },
    'processing',
  )
  await assetStore.gc(firstSession)

  const changed = {
    ...config,
    processing: { pipelineVersion: 2, toolchain: { sharp: 'two', vips: 'two' } },
  }
  const cached = await assetStore.cached(create(second), 'stable.jpg', changed, 'processing')
  t.deepEqual(cached.data, first)
  t.is(transformations, 1)
  t.is(warnings.length, 1)

  const secondSession = `second-${process.pid}-${Date.now()}`
  await assetStore.cached(
    create(second),
    'stable.jpg',
    { ...changed, cache: { ...changed.cache, rebuildSession: secondSession } },
    'processing',
  )
  await assetStore.gc(secondSession)

  t.is(transformations, 2)
  t.deepEqual(fs.readFileSync(path.join(cacheDir, 'stable.jpg')), second)
  t.deepEqual(fs.readdirSync(cacheDir).sort(), ['.next-img-cache.json', 'stable.jpg'])
  t.deepEqual(JSON.parse(fs.readFileSync(path.join(cacheDir, '.next-img-cache.json'))).processing, changed.processing)
})

async function createImage(background) {
  return sharp({
    create: { width: 8, height: 8, channels: 3, background },
  })
    .jpeg()
    .toBuffer()
}
