const React = require('react') // eslint-disable-line no-unused-vars -- needed for JSX transform
const ReactDOM = require('react-dom')
const { default: test } = require('ava')
const { renderToStaticMarkup } = require('react-dom/server')
const { HeadManagerContext } = require('next/dist/shared/lib/head-manager-context.shared-runtime')
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
      preload
    />,
  )

  t.true(html.includes('<picture class="frame">'))
  t.is((html.match(/rel="preload"/g) || []).length, 2)
  t.true(html.includes('media="(max-width: 767px)"'))
  t.true(html.includes('media="not all and (max-width: 767px)"'))
  t.true(html.includes('type="image/avif"'))
  t.true(html.includes('media="(max-width: 767px)" width="400" height="500"'))
  t.true(html.includes('src="desktop.jpg"'))
  t.true(html.includes('loading="eager" decoding="async" fetchPriority="high"'))
})

test('preload emits one preferred responsive format into the document head', t => {
  const image = {
    src: 'hero.jpg',
    type: 'image/jpeg',
    format: 'jpeg',
    fallbackFormat: 'jpeg',
    formats: ['avif', 'webp', 'jpeg'],
    sources: {
      avif: {
        type: 'image/avif',
        srcSet: 'hero-400.avif 400w, hero-800.avif 800w',
        images: [{ path: 'hero-400.avif', width: 400, height: 250, format: 'avif' }],
      },
      webp: {
        type: 'image/webp',
        srcSet: 'hero-400.webp 400w, hero-800.webp 800w',
        images: [{ path: 'hero-400.webp', width: 400, height: 250, format: 'webp' }],
      },
      jpeg: {
        type: 'image/jpeg',
        srcSet: 'hero-400.jpg 400w, hero-800.jpg 800w',
        images: [{ path: 'hero-400.jpg', width: 400, height: 250, format: 'jpeg' }],
      },
    },
    images: [{ path: 'hero-400.jpg', width: 400, height: 250, format: 'jpeg' }],
    sizes: [400, 800],
    breakpoints: [768],
  }
  const html = renderToStaticMarkup(<Picture src={image} sizes='100vw' alt='Hero' preload />)

  t.true(html.startsWith('<link rel="preload" as="image" type="image/avif"'))
  t.true(html.includes('imageSrcSet="hero-400.avif 400w, hero-800.avif 800w"'))
  t.true(html.includes('imageSizes="100vw"'))
  t.is((html.match(/rel="preload"/g) || []).length, 1)
  t.false(html.includes('<link rel="preload" as="image" type="image/webp"'))
  t.true(html.includes('loading="eager" decoding="async" fetchPriority="high"'))
})

test.serial('preload falls back to the Pages Router head manager on React 18', t => {
  const image = {
    src: 'hero.jpg',
    type: 'image/jpeg',
    srcSet: 'hero.jpg 800w',
    webpSrcSet: 'hero.webp 800w',
    images: [
      { path: 'hero.jpg', width: 800, height: 500, format: 'jpeg' },
      { path: 'hero.webp', width: 800, height: 500, format: 'webp' },
    ],
    sizes: [800],
    breakpoints: [],
  }
  const originalPreload = ReactDOM.preload
  const head = []

  try {
    ReactDOM.preload = undefined
    renderToStaticMarkup(
      <HeadManagerContext.Provider
        value={{ mountedInstances: new Set(), updateHead: elements => head.push(...elements) }}
      >
        <Picture src={image} alt='Hero' preload />
      </HeadManagerContext.Provider>,
    )
  } finally {
    ReactDOM.preload = originalPreload
  }

  const link = head.find(element => element.type === 'link' && element.props.rel === 'preload')
  t.is(link.props.type, 'image/webp')
  t.is(link.props.imageSrcSet, 'hero.webp 800w')
  t.is(link.props.imageSizes, '800px')
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

test('preload rejects more than one conditional art-direction source', t => {
  const image = {
    src: 'image.jpg',
    type: 'image/jpeg',
    srcSet: 'image.jpg 800w',
    images: [{ path: 'image.jpg', width: 800, height: 500, format: 'jpeg' }],
    sizes: [800],
  }
  const error = t.throws(() =>
    renderToStaticMarkup(
      <Picture
        sources={[
          { src: image, media: '(max-width: 479px)' },
          { src: image, media: '(max-width: 767px)' },
          { src: image },
        ]}
        alt='Example'
        preload
      />,
    ),
  )

  t.regex(error.message, /at most one conditional art-direction source/)
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
