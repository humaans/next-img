const imagemin = require('imagemin')
const imageminJpegtran = require('imagemin-jpegtran')
// const imageminOptipng = require('imagemin-optipng')
const imageminAdvpng = require('imagemin-advpng')

;(async () => {
  const files = await imagemin(['../.next/static/images/product-*.{jpg,png}'], {
    destination: 'build/images',
    plugins: [
      imageminJpegtran(),
      imageminAdvpng({
        optimizationLevel: 4,
      }),
    ],
  })

  console.log(files)
})()
