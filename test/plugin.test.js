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
  const rule = result.module.rules[0]

  t.is(rule.loader, path.join(__dirname, '../lib/loader'))
  t.is(rule.issuer, issuer)
  t.is(rule.dependency, dependency)
  t.is(rule.resourceQuery, resourceQuery)
})
