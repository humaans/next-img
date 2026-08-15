import { Picture, type NextImgData } from '..'
import withImg = require('../plugin')

declare const image: NextImgData

;<Picture src={image} alt='Coffee' priority />
;<Picture src={image} />
;<Picture
  sources={[{ src: image, media: '(max-width: 767px)' }, { src: image }]}
  pictureProps={{ className: 'frame' }}
  alt='Coffee'
/>

withImg({
  nextImg: {
    formats: ['avif', 'webp'],
    cache: { mode: 'read-only', dir: 'resources', version: 'photos-v2' },
  },
})
