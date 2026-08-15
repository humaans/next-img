const { default: test } = require('ava')
const {
  INPUT_EXTENSIONS,
  MIME_TYPES,
  OUTPUT_FORMATS,
  getFormat,
  getInputFormat,
  getOutputExtension,
  normalizeSharpFormat,
} = require('../lib/formats')

test('describes every supported image format from one registry', t => {
  t.deepEqual(OUTPUT_FORMATS, ['avif', 'webp', 'jpeg', 'png'])
  t.deepEqual(INPUT_EXTENSIONS, ['avif', 'webp', 'jpg', 'jpeg', 'png'])
  t.is(getInputFormat('jpg'), 'jpeg')
  t.is(getFormat('jpeg').outputExtension, 'jpg')
  t.is(MIME_TYPES.avif, 'image/avif')
})

test('normalizes source and output format edge cases', t => {
  t.is(getOutputExtension(undefined, 'jpeg', 'jpeg'), 'jpeg')
  t.is(getOutputExtension('jpeg', 'jpeg', 'jpeg'), 'jpeg')
  t.is(getOutputExtension('jpeg', 'png', 'png'), 'jpg')
  t.is(normalizeSharpFormat({ format: 'heif', mediaType: 'image/avif' }), 'avif')
})
