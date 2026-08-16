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

test('read-only cache mode rejects misses except during maintenance', async t => {
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

test('maintenance reuses healthy files and force refreshes them', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'next-img-store-'))
  const cacheDir = path.join(dir, 'resources')
  const first = await createImage('red')
  const second = await createImage('blue')
  const third = await createImage('green')
  let transformations = 0
  const config = {
    dir,
    cache: { mode: 'read-write', dir: 'resources', rebuildSession: null },
  }
  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }))

  const create = data => async () => {
    transformations += 1
    return { data, width: 8, height: 8, format: 'jpeg' }
  }

  await assetStore.cached(create(first), 'stable.jpg', config, 'processing')
  fs.writeFileSync(path.join(cacheDir, 'unused.jpg'), first)

  const maintenanceSession = `maintenance-${process.pid}-${Date.now()}`
  const cached = await assetStore.cached(
    create(second),
    'stable.jpg',
    { ...config, cache: { ...config.cache, rebuildSession: maintenanceSession } },
    'processing',
    { width: 8, format: 'jpeg' },
  )
  await assetStore.gc(maintenanceSession)

  t.deepEqual(cached.data, first)
  t.is(transformations, 1)
  t.deepEqual(fs.readdirSync(cacheDir), ['stable.jpg'])

  const forceSession = `force-${process.pid}-${Date.now()}`
  await assetStore.cached(
    create(second),
    'stable.jpg',
    { ...config, cache: { ...config.cache, rebuildSession: forceSession, force: true } },
    'processing',
    { width: 8, format: 'jpeg' },
  )
  await assetStore.gc(forceSession)

  t.is(transformations, 2)
  t.deepEqual(fs.readFileSync(path.join(cacheDir, 'stable.jpg')), second)

  const currentSession = `current-${process.pid}-${Date.now()}`
  const current = await assetStore.cached(
    create(third),
    'stable.jpg',
    { ...config, cache: { ...config.cache, rebuildSession: currentSession } },
    'processing',
    { width: 8, format: 'jpeg' },
  )
  await assetStore.gc(currentSession)

  t.deepEqual(current.data, second)
  t.is(transformations, 2)
})

test('maintenance repairs invalid or unexpected derivatives', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'next-img-store-'))
  const cacheDir = path.join(dir, 'resources')
  const data = await createImage('green')
  let transformations = 0
  const create = async () => {
    transformations += 1
    return { data, width: 8, height: 8, format: 'jpeg' }
  }
  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }))

  fs.mkdirSync(cacheDir, { recursive: true })
  fs.writeFileSync(path.join(cacheDir, 'invalid.jpg'), 'not an image')
  fs.writeFileSync(path.join(cacheDir, 'wrong-size.jpg'), await createImage('red'))

  const session = `repair-${process.pid}-${Date.now()}`
  const config = {
    dir,
    cache: { mode: 'read-write', dir: 'resources', rebuildSession: session },
  }
  await assetStore.cached(create, 'invalid.jpg', config, 'processing', { width: 8, format: 'jpeg' })
  await assetStore.cached(create, 'wrong-size.jpg', config, 'processing', { width: 16, format: 'jpeg' })
  await assetStore.cached(create, 'invalid.jpg', config, 'processing', { width: 8, format: 'jpeg' })
  await assetStore.gc(session)

  t.is(transformations, 2)
  t.deepEqual(fs.readFileSync(path.join(cacheDir, 'invalid.jpg')), data)
  t.deepEqual(fs.readFileSync(path.join(cacheDir, 'wrong-size.jpg')), data)
})

async function createImage(background) {
  return sharp({
    create: { width: 8, height: 8, channels: 3, background },
  })
    .jpeg()
    .toBuffer()
}
