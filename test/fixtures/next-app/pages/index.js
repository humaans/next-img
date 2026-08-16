const image = require('../../../../docs/src/images/coffee1.jpg?sizes=100&densities=1x&formats=avif,webp')
const { Picture } = require('../../../..')

export default function Home() {
  return (
    <main>
      <Picture src={image} alt='Coffee' preload />
      <span data-formats={image.formats.join(',')} data-width={image.width} data-height={image.height} />
    </main>
  )
}
