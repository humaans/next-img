const image = require('../../../../docs/src/images/coffee1.jpg?sizes=100&densities=1x')

export default function Home() {
  return <img src={image.src} width={image.images[0].width} height={image.images[0].height} alt='Coffee' />
}
