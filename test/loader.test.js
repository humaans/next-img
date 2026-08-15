const fs = require('fs')
const os = require('os')
const path = require('path')
const { default: test } = require('ava')
const sharp = require('sharp')
const loader = require('../lib/loader')

async function runLoader(t, resourceQuery = '') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'next-img-loader-'))
  const emitted = []
  const buffer = await sharp({
    create: {
      width: 800,
      height: 500,
      channels: 3,
      background: { r: 20, g: 40, b: 60 },
    },
  })
    .jpeg()
    .toBuffer()

  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }))

  const source = await new Promise((resolve, reject) => {
    loader.call(
      {
        resourcePath: path.join(dir, 'image.jpg'),
        resourceQuery,
        rootContext: dir,
        async: () => (error, result) => (error ? reject(error) : resolve(result)),
        emitFile: (fileName, data) => emitted.push({ fileName, data }),
        getOptions: () => ({
          breakpoints: [768],
          densities: ['1x', '2x'],
          jpeg: {
            quality: 80,
            webp: { quality: 90 },
          },
          png: {
            quality: 100,
            webp: { lossless: true },
          },
          imagesName: '[name]-[size]@[density]-[hash].[ext]',
          dir,
          distDir: '.next',
          publicPath: '/images/',
          outputPath: 'images',
          cacheDir: path.join('cache', 'next-img'),
          persistentCache: false,
          persistentCacheDir: 'resources',
          failOnCacheMiss: false,
          rebuildPersistentCache: false,
        }),
      },
      buffer,
    )
  })

  return {
    data: JSON.parse(source.replace(/^module\.exports = /, '')),
    emitted,
  }
}

test('emits one candidate per format when sizes are omitted', async t => {
  const { data, emitted } = await runLoader(t)

  t.deepEqual(
    data.images.map(({ width, format }) => ({ width, format })),
    [
      { width: 800, format: 'jpeg' },
      { width: 800, format: 'webp' },
    ],
  )
  t.deepEqual(data.sizes, [800])
  t.is(data.srcSet.split(',').length, 1)
  t.is(data.webpSrcSet.split(',').length, 1)
  t.is(emitted.length, 2)
})

test('deduplicates widths produced by different size and density combinations', async t => {
  const { data, emitted } = await runLoader(t, '?sizes=400,800')

  t.deepEqual(
    data.images.map(({ width, format }) => ({ width, format })),
    [
      { width: 400, format: 'jpeg' },
      { width: 400, format: 'webp' },
      { width: 800, format: 'jpeg' },
      { width: 800, format: 'webp' },
    ],
  )
  t.deepEqual(data.sizes, [400, 800])
  t.is(data.srcSet.split(',').length, 2)
  t.is(data.webpSrcSet.split(',').length, 2)
  t.is(emitted.length, 4)
})
