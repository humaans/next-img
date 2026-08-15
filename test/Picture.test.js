const React = require('react') // eslint-disable-line no-unused-vars -- needed for JSX transform
const { default: test } = require('ava')
const { renderToStaticMarkup } = require('react-dom/server')
const { Picture, makeSizes } = require('..')

test('<Picture />', t => {
  t.is(renderToStaticMarkup(<Picture />), '')
})

test('<Picture src />', t => {
  const img = {
    src: '/_next/static/images/coffee1-375@1x-eef43d972bb2cea9.jpg',
    type: 'image/jpeg',
    srcSet:
      '/_next/static/images/coffee1-375@1x-eef43d972bb2cea9.jpg 375w, /_next/static/images/coffee1-375@2x-afaa0eef3fd9d620.jpg 750w, /_next/static/images/coffee1-860@1x-5fd4aa9720369a82.jpg 860w, /_next/static/images/coffee1-860@2x-b4530e6ddf963a73.jpg 1720w',
    webpSrcSet:
      '/_next/static/images/coffee1-375@1x-f1dc5dc288aa4461.webp 375w, /_next/static/images/coffee1-375@2x-4bb30d5cb8b57f76.webp 750w, /_next/static/images/coffee1-860@1x-e5df48f42a326173.webp 860w, /_next/static/images/coffee1-860@2x-cc59476c8e22c394.webp 1720w',
    images: [
      {
        path: '/_next/static/images/coffee1-375@1x-eef43d972bb2cea9.jpg',
        size: 375,
        density: 1,
        width: 375,
        height: 250,
        format: 'jpeg',
      },
      {
        path: '/_next/static/images/coffee1-375@1x-f1dc5dc288aa4461.webp',
        size: 375,
        density: 1,
        width: 375,
        height: 250,
        format: 'webp',
      },
      {
        path: '/_next/static/images/coffee1-375@2x-afaa0eef3fd9d620.jpg',
        size: 375,
        density: 2,
        width: 750,
        height: 500,
        format: 'jpeg',
      },
      {
        path: '/_next/static/images/coffee1-375@2x-4bb30d5cb8b57f76.webp',
        size: 375,
        density: 2,
        width: 750,
        height: 500,
        format: 'webp',
      },
      {
        path: '/_next/static/images/coffee1-860@1x-5fd4aa9720369a82.jpg',
        size: 860,
        density: 1,
        width: 860,
        height: 573,
        format: 'jpeg',
      },
      {
        path: '/_next/static/images/coffee1-860@1x-e5df48f42a326173.webp',
        size: 860,
        density: 1,
        width: 860,
        height: 573,
        format: 'webp',
      },
      {
        path: '/_next/static/images/coffee1-860@2x-b4530e6ddf963a73.jpg',
        size: 860,
        density: 2,
        width: 1720,
        height: 1147,
        format: 'jpeg',
      },
      {
        path: '/_next/static/images/coffee1-860@2x-cc59476c8e22c394.webp',
        size: 860,
        density: 2,
        width: 1720,
        height: 1147,
        format: 'webp',
      },
    ],
    name: 'coffee1.jpg',
    sizes: [375, 860],
    breakpoints: [768],
  }

  const webpSrcSet =
    '/_next/static/images/coffee1-375@1x-f1dc5dc288aa4461.webp 375w, /_next/static/images/coffee1-375@2x-4bb30d5cb8b57f76.webp 750w, /_next/static/images/coffee1-860@1x-e5df48f42a326173.webp 860w, /_next/static/images/coffee1-860@2x-cc59476c8e22c394.webp 1720w'
  const jpegSrcSet =
    '/_next/static/images/coffee1-375@1x-eef43d972bb2cea9.jpg 375w, /_next/static/images/coffee1-375@2x-afaa0eef3fd9d620.jpg 750w, /_next/static/images/coffee1-860@1x-5fd4aa9720369a82.jpg 860w, /_next/static/images/coffee1-860@2x-b4530e6ddf963a73.jpg 1720w'
  const sizes = '(max-width: 768px) 375px, 860px'

  t.is(
    renderToStaticMarkup(<Picture src={img} />),
    '<picture>' +
      `<source type="image/webp" srcSet="${webpSrcSet}" sizes="${sizes}"/>` +
      `<img src="${img.src}" srcSet="${jpegSrcSet}" sizes="${sizes}" width="375" height="250" decoding="async"/>` +
      '</picture>',
  )
})

test('makeSizes', t => {
  let breakpoints = []
  t.deepEqual(makeSizes({ sizes: [200] }, null, breakpoints), '200px')

  breakpoints = [768]
  t.deepEqual(makeSizes({ sizes: [200] }, null, breakpoints), '200px')
  t.deepEqual(makeSizes({ sizes: [200, 800] }, null, breakpoints), '(max-width: 768px) 200px, 800px')

  breakpoints = [768, 1024]
  t.is(
    makeSizes({ sizes: [200, 800, 1200] }, null, breakpoints),
    '(max-width: 768px) 200px, (max-width: 1024px) 800px, 1200px',
  )

  breakpoints = ['(orientation: landscape)']
  t.is(makeSizes({ sizes: [200, 800] }, null, breakpoints), '(orientation: landscape) 200px, 800px')

  breakpoints = [768, '(orientation: landscape)']
  t.is(
    makeSizes({ sizes: [200, 800, 1200] }, null, breakpoints),
    '(max-width: 768px) 200px, (orientation: landscape) 800px, 1200px',
  )
})

test('media-query breakpoints', t => {
  const landscape = {
    src: 'landscape.jpg',
    type: 'image/jpeg',
    srcSet: 'landscape.jpg 800w',
    images: [{ width: 800, height: 450 }],
    name: 'landscape.jpg',
    sizes: [800],
    breakpoints: [],
  }
  const fallback = {
    src: 'fallback.jpg',
    type: 'image/jpeg',
    srcSet: 'fallback.jpg 800w',
    images: [{ width: 800, height: 800 }],
    name: 'fallback.jpg',
    sizes: [800],
    breakpoints: [],
  }

  t.is(
    renderToStaticMarkup(<Picture src={[landscape, fallback]} breakpoints={['(orientation: landscape)']} />),
    '<picture>' +
      '<source type="image/jpeg" srcSet="landscape.jpg 800w" sizes="800px" media="(orientation: landscape)" width="800" height="450"/>' +
      '<source type="image/jpeg" srcSet="fallback.jpg 800w" sizes="800px" width="800" height="800"/>' +
      '<img src="fallback.jpg" srcSet="fallback.jpg 800w" sizes="800px" width="800" height="800" decoding="async"/>' +
      '</picture>',
  )
})

test('explicit art direction, modern formats, and picture props', t => {
  const image = (name, width, height) => ({
    src: `${name}.jpg`,
    type: 'image/jpeg',
    format: 'jpeg',
    fallbackFormat: 'jpeg',
    formats: ['avif', 'webp', 'jpeg'],
    sources: {
      avif: {
        type: 'image/avif',
        srcSet: `${name}.avif ${width}w`,
        images: [{ path: `${name}.avif`, width, height, format: 'avif' }],
      },
      webp: {
        type: 'image/webp',
        srcSet: `${name}.webp ${width}w`,
        images: [{ path: `${name}.webp`, width, height, format: 'webp' }],
      },
      jpeg: {
        type: 'image/jpeg',
        srcSet: `${name}.jpg ${width}w`,
        images: [{ path: `${name}.jpg`, width, height, format: 'jpeg' }],
      },
    },
    images: [{ path: `${name}.jpg`, width, height, format: 'jpeg' }],
    sizes: [width],
  })
  const mobile = image('mobile', 400, 500)
  const desktop = image('desktop', 1200, 600)
  const html = renderToStaticMarkup(
    <Picture
      sources={[
        { src: mobile, media: '(max-width: 767px)', sizes: '100vw' },
        { src: desktop, sizes: '1200px' },
      ]}
      pictureProps={{ className: 'frame' }}
      alt='Example'
      priority
    />,
  )

  t.true(html.startsWith('<picture class="frame">'))
  t.true(html.includes('type="image/avif"'))
  t.true(html.includes('media="(max-width: 767px)" width="400" height="500"'))
  t.true(html.includes('src="desktop.jpg"'))
  t.true(html.includes('loading="eager" decoding="sync" fetchPriority="high"'))
})

test('autoSizes prefixes a fallback for lazy images', t => {
  const image = {
    src: 'image.jpg',
    type: 'image/jpeg',
    srcSet: 'image.jpg 800w',
    images: [{ width: 800, height: 500, format: 'jpeg' }],
    name: 'image.jpg',
    sizes: [800],
    breakpoints: [],
  }

  t.true(
    renderToStaticMarkup(<Picture src={image} alt='Example' loading='lazy' autoSizes />).includes(
      'sizes="auto, 800px"',
    ),
  )
})

test('explicit art direction requires an unconditional fallback', t => {
  const image = {
    src: 'image.jpg',
    type: 'image/jpeg',
    srcSet: 'image.jpg 800w',
    images: [{ width: 800, height: 500, format: 'jpeg' }],
    sizes: [800],
  }
  const error = t.throws(() =>
    renderToStaticMarkup(<Picture sources={[{ src: image, media: '(max-width: 767px)' }]} alt='Example' />),
  )
  t.regex(error.message, /unconditional fallback/)
})

// test cases
//
// src=[universal?sizes=200]
// src=[universal?sizes=200,400]
// src=[universal?sizes=200,800,1200]
// src=[mobile?sizes=200, desktop?sizes=800]
// src=[mobile?sizes=200, desktop?sizes=800,1200]
// src=[mobile?sizes=200,400, desktop?sizes=800,1200] breakpoints=[768]

// mobile | desktop
// breakpoints=[768]
// src=[universal?sizes=200] - works fine, show it everywhere - TODO: test
// src=[universal?sizes=200,400] - works fine, show each size based on breakpoints translated to sizes, and use 100vw in the last case?
// src=[universal?sizes=200,800,1200] - works fine, show each size based on breakpoints translated to sizes, and use 100vw in the last case?
// src=[mobile?sizes=200, desktop?sizes=800] - works fine, show each size based on breakpoints using media, no sizes since no multiple imgs..
// src=[mobile?sizes=200, desktop?sizes=800,1200] - works fine, show each size based on breakpoints using media, in desktop multiple sizes.. no sizes
// src=[mobile?sizes=200,400, desktop?sizes=800,1200] - no sizes by default, assumes 100vw

/**

(max-width: 1024px) 800px,
                   50vw

<Picture>
  <Picture src={require('./small.png?sizes=400,768')} breakpoints={[400,768]} sizes={['100vw', '100vw']} />
  <Picture src={require('./large.png?sizes=800,1500')} breakpoints={[1200]} sizes={['800px', '50vw']} />
</Picture>

<Picture>
  <Picture
    src={[
      require('./small.png?sizes=400,768'),
      require('./large.png?sizes=800,1500')
    ]}
    breakpoints={[400,768,1200]}
    sizes={['100vw', '100vw', '800px', '50vw']} />
</Picture>

<Picture>
  <Picture
    src={[
      require('./small.png?sizes=400,768'),
      require('./large.png?sizes=800,1500')
    ]}
    breakpoints={[400,768,1200]}
    sizes={['(max-width: 500px) 25vw']} />
</Picture>

sizes=400,600,800,1500

A - 0    - 400
B - 400  - 768
C - 768  - 1200
D - 1200 - Infinity

sizes={['100vw', '100vw', '800px', '50vw']}
*/

// by default.. no sizes.. only media queries for multiple images based on the default breakpoint of [768]..
// if you specify multiple sizes that still assumes 100vw by default.. so if you want to customize sizes, you have to specify them manually..
