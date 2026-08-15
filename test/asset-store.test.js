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
      persistentCache: true,
      persistentCacheDir: 'resources',
      rebuildSession: session,
      failOnCacheMiss: false,
      assetStageDir: stageDir,
    },
    'processing test image',
  )
  fs.writeFileSync(path.join(cacheDir, 'unused.jpg'), 'unused')
  await assetStore.stage('used.jpg', data, {
    assetStageDir: stageDir,
    rebuildSession: session,
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
    persistentCache: false,
    rebuildSession: null,
    failOnCacheMiss: false,
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
