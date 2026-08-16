import { Picture, type NextImgData } from '..'
import withImg = require('../plugin')

declare const image: NextImgData

;<Picture src={image} alt='Coffee' preload />
;<Picture src={image} />
;<Picture
  sources={[{ src: image, media: '(max-width: 767px)' }, { src: image }]}
  pictureProps={{ className: 'frame' }}
  alt='Coffee'
/>

// @ts-expect-error Explicit art direction uses sources instead of src.
;<Picture src={image} sources={[{ src: image }]} alt='Coffee' />
// @ts-expect-error Explicit sizes belong on each art-direction source.
;<Picture sources={[{ src: image }]} sizes='100vw' alt='Coffee' />
// @ts-expect-error Explicit art direction uses media instead of breakpoints.
;<Picture sources={[{ src: image }]} breakpoints={[768]} alt='Coffee' />
// @ts-expect-error autoSizes is not part of the Picture API.
;<Picture src={image} autoSizes alt='Coffee' />

withImg({
  nextImg: {
    formats: ['avif', 'webp'],
    maxBareImportSize: 2048,
    cache: { mode: 'read-only', dir: 'resources' },
  },
})
