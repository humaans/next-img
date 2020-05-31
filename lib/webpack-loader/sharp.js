const sharp = require('sharp')

module.exports = buffer => {
  const image = sharp(buffer)

  return {
    metadata: () => image.metadata(),
    resize: async ({ width, output: outputFormat, options }) => {
      const { format: inputFormat } = image.metadata()

      let resized = image.clone().resize(width, null)

      if (outputFormat === 'webp') {
        resized = resized.webp({ nearLossless: inputFormat === 'png', ...options })
      } else if (outputFormat === 'jpeg') {
        console.log('Using options', { options })
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
