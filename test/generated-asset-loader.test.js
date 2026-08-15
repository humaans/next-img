const fs = require('fs')
const os = require('os')
const path = require('path')
const { default: test } = require('ava')
const generatedAssetLoader = require('../lib/generated-asset-loader')

function runLoader(resourceQuery, options) {
  return new Promise((resolve, reject) => {
    generatedAssetLoader.call({
      resourceQuery,
      getOptions: () => options,
      async: () => (error, result) => (error ? reject(error) : resolve(result)),
    })
  })
}

test('reads optimized bytes from the content-addressed cache', async t => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'next-img-generated-loader-'))
  const cacheDir = path.join(dir, '.next', 'cache', 'next-img')
  const expected = Buffer.from('optimized image bytes')
  fs.mkdirSync(cacheDir, { recursive: true })
  fs.writeFileSync(path.join(cacheDir, 'example.webp'), expected)
  t.teardown(() => fs.rmSync(dir, { recursive: true, force: true }))

  const actual = await runLoader('?__next_img_generated__=&key=example.webp', {
    dir,
    distDir: '.next',
    cacheDir: path.join('cache', 'next-img'),
    persistentCache: false,
  })

  t.deepEqual(actual, expected)
})

test('rejects missing and unsafe cache keys', async t => {
  const config = {
    dir: os.tmpdir(),
    distDir: '.next',
    cacheDir: path.join('cache', 'next-img'),
    persistentCache: false,
  }

  await t.throwsAsync(runLoader('?__next_img_generated__', config), { message: /without a cache key/ })
  await t.throwsAsync(runLoader('?key=..%2Foutside.jpg', config), { message: /unsafe file path/ })
})
