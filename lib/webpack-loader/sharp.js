const sharp = require('sharp')

module.exports = imagePath => {
  const image = sharp(imagePath)

  return {
    metadata: () => image.metadata(),
    resize: async ({ width, size, mime, options }) => {
      let resized = image.clone().resize(width, null)

      if (mime === 'image/webp') {
        resized = resized.webp({
          quality: options.quality,
        })
      } else if (mime === 'image/jpeg') {
        resized = resized.jpeg({
          quality: options.quality,
        })
      } else if (mime === 'image/png') {
        resized = resized.png({
          quality: options.quality,
        })
      }

      const { data, info } = await resized.toBuffer({ resolveWithObject: true })

      return {
        data,
        size,
        width: info.width,
        height: info.height,
        format: info.format,
      }
    },
  }
}
