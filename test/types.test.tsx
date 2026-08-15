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

withImg({
  nextImg: {
    formats: ['avif', 'webp'],
    maxBareImportSize: 2048,
    cache: { mode: 'read-only', dir: 'resources', version: 'photos-v2' },
  },
})
