const path = require('path')
const { default: test } = require('ava')
const withImg = require('../lib/plugin')

test('preserves constraints from the Next.js image loader rule', t => {
  const issuer = { not: [/\.css$/] }
  const dependency = { not: ['url'] }
  const resourceQuery = { not: [/__next_metadata__/, /__next_metadata_route__/] }
  const webpackConfig = {
    cache: true,
    module: {
      rules: [
        {
          test: /\.(png|jpg)$/i,
          loader: 'next-image-loader',
          issuer,
          dependency,
          resourceQuery,
          options: { isDev: true },
        },
      ],
    },
  }

  const config = withImg({ nextImg: { persistentCache: false } })
  const result = config.webpack(webpackConfig, {
    isServer: false,
    dir: '/app',
    dev: true,
    config: { distDir: '.next', assetPrefix: '' },
  })
  const [assetRule, rule] = result.module.rules

  t.is(assetRule.type, 'asset/resource')
  t.true(assetRule.resourceQuery.test('?__next_img_generated__'))
  t.is(rule.loader, path.join(__dirname, '../lib/loader'))
  t.is(rule.issuer, issuer)
  t.is(rule.dependency, dependency)
  t.true(rule.resourceQuery.not.includes(resourceQuery.not[0]))
  t.true(rule.resourceQuery.not.includes(resourceQuery.not[1]))
  t.true(rule.resourceQuery.not.some(query => query.test('__next_img_generated__')))
})

test('configures the shared loader and generated assets for Turbopack', t => {
  const existingRule = { loaders: ['existing-loader'], as: '*.js' }
  const config = withImg({
    nextImg: { persistentCache: false },
    turbopack: {
      resolveAlias: { example: '/example' },
      rules: { '*.jpg': existingRule },
    },
  })

  t.deepEqual(config.turbopack.resolveAlias, { example: '/example' })
  const [assetRule, loaderRule, preservedRule] = config.turbopack.rules['*.jpg']
  t.is(assetRule.type, 'asset')
  t.true(assetRule.condition.query.test('?__next_img_generated__'))
  t.is(assetRule.loaders[0].loader, path.join(__dirname, '../lib/generated-asset-loader'))
  t.is(loaderRule.as, '*.js')
  t.is(loaderRule.loaders[0].loader, path.join(__dirname, '../lib/loader'))
  t.false(loaderRule.condition.not.query.test('?sizes=400'))
  t.true(loaderRule.condition.not.query.test('?__next_img_generated__'))
  t.true(loaderRule.condition.not.query.test('?__next_metadata_route__'))
  t.is(preservedRule, existingRule)

  const options = loaderRule.loaders[0].options
  t.notThrows(() => JSON.stringify(options))
  t.deepEqual(options.cache, { mode: 'off', dir: 'resources', rebuildSession: null })
  t.is(options.maxBareImportSize, 2048)
  t.is(options.bundler, 'turbopack')
  t.regex(options.assetProxyDir, /\.next-img\/proxies$/)
  t.truthy(config.turbopack.rules['*.avif'])
})

test('pins the default filename hash algorithm', t => {
  const config = withImg({ nextImg: { persistentCache: false } })
  const options = config.turbopack.rules['*.jpg'][1].loaders[0].options

  t.is(options.imagesName, '[name]-[size]@[density]-[xxhash64:hash:hex:16].[ext]')
})

test('supports explicit cache modes and legacy cache configuration', t => {
  const readOnly = withImg({
    nextImg: { cache: { mode: 'read-only', dir: 'image-cache' } },
  })
  const readOnlyOptions = readOnly.turbopack.rules['*.jpg'][1].loaders[0].options
  t.deepEqual(readOnlyOptions.cache, {
    mode: 'read-only',
    dir: 'image-cache',
    rebuildSession: null,
  })

  const legacy = withImg({ nextImg: { persistentCacheDir: 'legacy-cache' } })
  const legacyOptions = legacy.turbopack.rules['*.jpg'][1].loaders[0].options
  t.deepEqual(legacyOptions.cache, {
    mode: 'read-write',
    dir: 'legacy-cache',
    rebuildSession: null,
  })
})

test('validates the oversized bare-import limit', t => {
  t.throws(() => withImg({ nextImg: { maxBareImportSize: 0 } }), {
    message: /must be a positive integer or false/,
  })
  t.notThrows(() => withImg({ nextImg: { maxBareImportSize: false } }))
})

test.serial('rejects cache rebuilds when caching is disabled', t => {
  const previous = process.env.NEXT_IMG_REBUILD
  process.env.NEXT_IMG_REBUILD = 'test-session'
  try {
    t.throws(() => withImg({ nextImg: { cache: { mode: 'off' } } }), {
      message: /cannot be used when cache.mode is "off"/,
    })
  } finally {
    if (previous === undefined) delete process.env.NEXT_IMG_REBUILD
    else process.env.NEXT_IMG_REBUILD = previous
  }
})
