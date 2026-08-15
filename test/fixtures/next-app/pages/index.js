const image = require('../../../../docs/src/images/coffee1.jpg?widths=100&formats=avif,webp&placeholder=blur')
const { Picture } = require('../../../..')

export default function Home() {
  return (
    <main>
      <Picture src={image} alt='Coffee' priority />
      <span data-formats={image.formats.join(',')} data-width={image.width} data-height={image.height} />
    </main>
  )
}
