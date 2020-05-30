const { promises: fs } = require('fs')
const path = require('path')
const mkdirp = require('mkdirp')
const sharp = require('sharp')
const imagemin = require('imagemin')
const imageminAdvpng = require('imagemin-advpng')
const debug = require('debug')('next-img')

const { default: PQueue } = require('p-queue')

const os = require('os')
const cpuCount = os.cpus().length
const queue = new PQueue({ concurrency: cpuCount })

let j = 0

module.exports = imagePath => {
  const image = sharp(imagePath)

  return {
    metadata: () => image.metadata(),
    resize: async ({ cacheDirectory, fileName, width, size, density, mime, source, options }) => {
      let cached, info
      try {
        const t = path.join(cacheDirectory, fileName)
        cached = await fs.readFile(t)
        info = await sharp(cached).metadata()
        debug('Cache hit', t)
        // return cached
      } catch (err) {}

      if (!cached) {
        const i = j
        j++

        // console.time(i + ' ' + 'Compressing ' + mime + ' width ' + width)
        let resized = image.clone().resize(width, null)

        if (mime === 'image/webp') {
          // console.time(i + ' ' + 'Optimizing webp sharp')
          resized = resized.webp({
            quality: options.quality,
            lossless: source === 'image/png',
          })
          // console.timeEnd(i + ' ' + 'Optimizing webp sharp')
        } else if (mime === 'image/jpeg') {
          // console.time(i + ' ' + 'Optimizing jpeg sharp')
          resized = resized.jpeg({
            quality: options.quality,
          })
          // console.timeEnd(i + ' ' + 'Optimizing jpeg sharp')
        } else if (mime === 'image/png') {
          // console.time(i + ' ' + 'Optimizing png sharp')
          resized = resized.png({
            quality: options.quality,
            compressionLevel: 2,
          })
          // console.timeEnd(i + ' ' + 'Optimizing png sharp')
        }

        const processed = await queue.add(() => resized.toBuffer({ resolveWithObject: true }))

        // if (mime === 'image/png') {
        // console.time(i + ' ' + 'Optimizing png advpng')
        //   data = await queue.add(() =>
        //     imagemin.buffer(data, {
        //       plugins: [
        //         imageminAdvpng({
        //           optimizationLevel: 4,
        //         }),
        //       ],
        //     }),
        //   )
        // console.timeEnd(i + ' ' + 'Optimizing png advpng')
        // }
        // console.timeEnd(i + ' ' + 'Compressing ' + mime + ' width ' + width)

        const target = path.join(cacheDirectory, fileName)
        debug(`Caching ${target}`)
        await mkdirp(cacheDirectory)
        await fs.writeFile(target, processed.data)

        cached = processed.data
        info = processed.info
      }

      return {
        fileName,
        data: cached,
        size,
        density,
        width: info.width,
        height: info.height,
        format: info.format,
        mime,
      }
    },
  }
}
