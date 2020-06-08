const sharp = require('sharp')

module.exports = buffer => {
  const image = sharp(buffer)

  return {
    metadata: () => image.metadata(),
    resize: async ({ width, output: outputFormat, options }) => {
      let resized = image.clone().resize(width, null)

      if (outputFormat === 'webp') {
        resized = resized.webp(options)
      } else if (outputFormat === 'jpeg') {
        resized = resized.jpeg(options)
      } else if (outputFormat === 'png') {
        resized = resized.png(options)
      } else {
        throw new Error(`Unknown output format ${outputFormat}`)
      }

      const { data, info } = await resized.toBuffer({ resolveWithObject: true })

      return {
        data,
        width: info.width,
        height: info.height,
        format: info.format,
      }
    },
  }
}
