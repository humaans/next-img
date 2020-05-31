const sharp = require('sharp')
const imagemin = require('imagemin')
const imageminAdvpng = require('imagemin-advpng')

module.exports = buffer => {
  const image = sharp(buffer)

  return {
    metadata: () => image.metadata(),
    resize: async ({ width, output: outputFormat, options }) => {
      const { format: inputFormat } = image.metadata()

      let resized = image.clone().resize(width, null)

      if (outputFormat === 'webp') {
        resized = resized.webp({ lossless: inputFormat === 'png', ...options })
      } else if (outputFormat === 'jpeg') {
        resized = resized.jpeg(options)
      } else if (outputFormat === 'png') {
        resized = resized.png(options)
      } else {
        throw new Error(`Unknown output format ${outputFormat}`)
      }

      let { data, info } = await resized.toBuffer({ resolveWithObject: true })

      if (outputFormat === 'png') {
        data = await imagemin.buffer(data, {
          plugins: [
            imageminAdvpng({
              optimizationLevel: 4,
            }),
          ],
        })
      }

      return {
        data,
        width: info.width,
        height: info.height,
        format: info.format,
      }
    },
  }
}
