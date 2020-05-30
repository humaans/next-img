const sharp = require('sharp')
const imagemin = require('imagemin')
const imageminAdvpng = require('imagemin-advpng')

// const { default: PQueue } = require('p-queue')

// const os = require('os')
// const cpuCount = os.cpus().length
// const queue = new PQueue({ concurrency: cpuCount })

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
      // const processed = await queue.add(() => resized.toBuffer({ resolveWithObject: true }))

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
