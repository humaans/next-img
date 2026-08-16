const fs = require('fs')
const os = require('os')
const path = require('path')
const { default: test } = require('ava')
const sharp = require('sharp')
const loader = require('../lib/loader')

async function runLoader(t, resourceQuery = '', optionOverrides = {}, inputBuffer) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'next-img-loader-'))
  const imported = []
  const dependencies = []
  const warnings = []
  const buffer =
    inputBuffer ||
    (await sharp({
      create: {
        width: 800,
        height: 500,
        channels: 3,
        background: { r: 20, g: 40, b: 60 },
      },
    })
      .jpeg()
      .toBuffer())

  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }))

  const source = await new Promise((resolve, reject) => {
    loader.call(
      {
        resourcePath: path.join(dir, 'image.jpg'),
        resourceQuery,
        rootContext: dir,
        async: () => (error, result) => (error ? reject(error) : resolve(result)),
        addDependency: dependency => dependencies.push(dependency),
        emitWarning: warning => warnings.push(warning),
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
          imagesName: '[name]-[size]@[density]-[xxhash64:hash:hex:16].[ext]',
          dir,
          distDir: '.next',
          cacheDir: path.join('cache', 'next-img'),
          cache: { mode: 'off', dir: 'resources', rebuildSession: null, force: false },
          assetStageDir: path.join(dir, '.next-img', 'assets'),
          bundler: 'webpack',
          ...optionOverrides,
        }),
      },
      buffer,
    )
  })

  const module = { exports: {} }
  Function(
    'module',
    'require',
    source,
  )(module, request => {
    imported.push(request)
    return `/images/${path.basename(request.split('?')[0])}`
  })

  return {
    data: module.exports,
    dependencies,
    dir,
    imported,
    source,
    warnings,
  }
}

function getCacheKeys(result) {
  return result.imported.map(request => new URLSearchParams(request.split('?')[1]).get('key')).sort()
}

test('emits one candidate per format when sizes are omitted', async t => {
  const { data, dependencies, imported, source } = await runLoader(t)

  t.deepEqual(
    data.images.map(({ width, format }) => ({ width, format })),
    [
      { width: 800, format: 'jpeg' },
      { width: 800, format: 'webp' },
    ],
  )
  t.deepEqual(data.sizes, [800])
  t.deepEqual(data.formats, ['webp', 'jpeg'])
  t.is(data.fallbackFormat, 'jpeg')
  t.false(Object.prototype.hasOwnProperty.call(data, 'format'))
  t.is(data.width, 800)
  t.is(data.height, 500)
  t.is(data.sources.webp.srcSet, data.webpSrcSet)
  t.is(data.sources.jpeg.srcSet, data.srcSet)
  t.is(data.srcSet.split(',').length, 1)
  t.is(data.webpSrcSet.split(',').length, 1)
  t.is(imported.length, 2)
  t.deepEqual(
    dependencies.map(dependency => path.basename(dependency)).sort(),
    imported.map(request => path.basename(request.split('?')[0])).sort(),
  )
  t.true(imported.every(request => request.includes('?__next_img_generated__=&key=')))
  t.false(source.includes('emitFile'))
})

test('deduplicates files produced by overlapping size and density combinations', async t => {
  const { data, imported } = await runLoader(t, '?sizes=400,800')

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
  t.is(imported.length, 4)
})

test('uses stable proxy imports for Turbopack assets', async t => {
  const { dependencies, imported } = await runLoader(t, '?sizes=320&densities=1x', {
    bundler: 'turbopack',
    assetProxyDir: path.join(os.tmpdir(), 'next-img-proxies'),
  })

  t.is(imported.length, 2)
  t.deepEqual(imported.map(request => path.basename(request.split('?')[0])).sort(), ['generated.jpg', 'generated.webp'])
  t.true(imported.every(request => request.includes('&key=image-320-')))
  t.true(dependencies.every(dependency => dependency.includes('next-img-proxies')))
})

test.serial('preserves released persistent cache keys with pinned hashing across Sharp upgrades', async t => {
  const originalSharpVersion = sharp.versions.sharp

  try {
    const cache = { mode: 'read-write', dir: 'resources', rebuildSession: null }
    const first = await runLoader(t, '', { cache })
    sharp.versions.sharp = '99.0.0'
    const second = await runLoader(t, '', { cache })

    const expectedLegacyKeys = ['image-800-0cddac0df359e9f5.webp', 'image-800-7998063232322a57.jpg']
    t.deepEqual(getCacheKeys(first), expectedLegacyKeys)
    t.deepEqual(getCacheKeys(second), expectedLegacyKeys)
  } finally {
    sharp.versions.sharp = originalSharpVersion
  }
})

test('uses one derivative key for persistent and temporary caches', async t => {
  const input = await sharp({
    create: { width: 800, height: 500, channels: 3, background: { r: 20, g: 40, b: 60 } },
  })
    .jpeg()
    .toBuffer()
  const persistent = await runLoader(
    t,
    '',
    { cache: { mode: 'read-write', dir: 'resources', rebuildSession: null } },
    input,
  )
  const temporary = await runLoader(t, '', {}, input)

  t.deepEqual(getCacheKeys(temporary), getCacheKeys(persistent))
})

test('supports explicit sizes, densities, and AVIF metadata', async t => {
  const { data, imported } = await runLoader(t, '?sizes=320,640&densities=1x&formats=avif,webp')

  t.deepEqual(data.formats, ['avif', 'webp', 'jpeg'])
  t.deepEqual(data.sizes, [320, 640])
  t.deepEqual(
    data.images.map(({ width, format }) => ({ width, format })),
    [
      { width: 320, format: 'jpeg' },
      { width: 320, format: 'avif' },
      { width: 320, format: 'webp' },
      { width: 640, format: 'jpeg' },
      { width: 640, format: 'avif' },
      { width: 640, format: 'webp' },
    ],
  )
  t.true(data.sources.avif.srcSet.includes('320w'))
  t.is(imported.length, 6)
})

test('auto-orients images before calculating and generating dimensions', async t => {
  const input = await sharp({
    create: { width: 40, height: 20, channels: 3, background: 'red' },
  })
    .jpeg()
    .withMetadata({ orientation: 6 })
    .toBuffer()
  const { data } = await runLoader(t, '?sizes=20&formats=webp', {}, input)

  t.is(data.width, 20)
  t.is(data.height, 40)
  t.deepEqual(
    data.images.map(({ width, height }) => ({ width, height })),
    [
      { width: 20, height: 40 },
      { width: 20, height: 40 },
    ],
  )
})

test('warns for unknown options and rejects them in strict mode', async t => {
  const warned = await runLoader(t, '?size=120')
  t.is(warned.warnings.length, 1)
  t.regex(warned.warnings[0].message, /Did you mean "sizes"/)

  const unknown = await t.throwsAsync(runLoader(t, '?size=120', { strict: true }))
  t.regex(unknown.message, /Did you mean "sizes"/)
})

test('rejects malformed sizes and densities', async t => {
  const size = await t.throwsAsync(runLoader(t, '?sizes=320.5'))
  t.regex(size.message, /Invalid next-img sizes value/)

  const density = await t.throwsAsync(runLoader(t, '?sizes=320&densities=retina'))
  t.regex(density.message, /Invalid next-img densities value/)
})

test('warns for oversized bare imports and accepts explicit sizing', async t => {
  const input = await sharp({
    create: { width: 2050, height: 100, channels: 3, background: 'red' },
  })
    .jpeg()
    .toBuffer()
  const bare = await runLoader(t, '', {}, input)
  const sized = await runLoader(t, '?sizes=800', {}, input)

  t.is(bare.warnings.length, 1)
  t.regex(bare.warnings[0].message, /intrinsic 2050×100 size/)
  t.regex(bare.warnings[0].message, /\?sizes=\.\.\./)
  t.is(sized.warnings.length, 0)
})

test('strict mode rejects oversized bare imports and the limit can be disabled', async t => {
  const input = await sharp({
    create: { width: 100, height: 2050, channels: 3, background: 'red' },
  })
    .jpeg()
    .toBuffer()

  const error = await t.throwsAsync(runLoader(t, '', { strict: true }, input))
  t.regex(error.message, /intrinsic 100×2050 size/)
  const disabled = await runLoader(t, '', { maxBareImportSize: false }, input)
  t.is(disabled.warnings.length, 0)
})

test('accepts a custom oversized bare-import limit', async t => {
  const input = await sharp({
    create: { width: 3000, height: 100, channels: 3, background: 'red' },
  })
    .jpeg()
    .toBuffer()

  const accepted = await runLoader(t, '', { maxBareImportSize: 4096 }, input)
  t.is(accepted.warnings.length, 0)
})
