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
  t.is(loaderRule.as, '*.js')
  t.is(loaderRule.loaders[0].loader, path.join(__dirname, '../lib/loader'))
  t.false(loaderRule.condition.not.query.test('?sizes=400'))
  t.true(loaderRule.condition.not.query.test('?__next_img_generated__'))
  t.true(loaderRule.condition.not.query.test('?__next_metadata_route__'))
  t.is(preservedRule, existingRule)

  const options = loaderRule.loaders[0].options
  t.notThrows(() => JSON.stringify(options))
  t.is(options.persistentCache, false)
})
