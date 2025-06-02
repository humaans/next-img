const React = require('react')

const h = React.createElement

const Picture = React.forwardRef(function Picture({ src, sizes, breakpoints, ...imgProps }, ref) {

  if (!src) {
    return null
  }

  if (src.default) {
    src = src.default
  }

  if (!Array.isArray(src)) {
    src = [src]
  }

  if (!Array.isArray(sizes)) {
    sizes = [sizes]
  }

  if (src.length === 0) {
    return null
  }

  // fallback img is for old browsers, which
  // we're mostly not that interested in, but do it
  // as part of the <picture /> spec
  const fallbackImg = src[0]

  // each image has breakdpoints config attached
  // from the plugin config, use that but only
  // if it's not overriden via props
  breakpoints = breakpoints || src[0].breakpoints

  const flattendSrc = flattenSrc(src, sizes, breakpoints)

  // when we have only one image source (that is we're not doing
  // art direction), provide the width and height for the image,
  // so that the browser knows the aspect ratio of the images
  const dimensions =
    src.length === 1
      ? {
          width: src[0].images[0].width,
          height: src[0].images[0].height,
        }
      : {}

  return h(
    'picture',
    {},
    flattendSrc.map(({ img, sizes, breakpoints, media }, i) =>
      h(
        React.Fragment,
        { key: i },
        img.webpSrcSet &&
          img.webpSrcSet.length > 0 &&
          h('source', {
            type: 'image/webp',
            srcSet: img.webpSrcSet,
            sizes: makeSizes(img, sizes, breakpoints),
            media,
          }),
        img.srcSet &&
          img.srcSet.length > 0 &&
          h('source', {
            type: img.type,
            srcSet: img.srcSet,
            sizes: makeSizes(img, sizes, breakpoints),
            media,
          }),
      ),
    ),

    h('img', { ...imgProps, ref, src: fallbackImg.src, srcSet: fallbackImg.srcSet, ...dimensions }),
  )
})

function flattenSrc(src, sizes, breakpoints) {
  // console.log(src, sizes, breakpoints)
  const result = []

  for (let i = 0; i < src.length; i++) {
    if (i > breakpoints.length) {
      console.warn(`Image ${src[i].name} was not included due to insufficient breakpoints.`)
      continue
    }

    const breakpoint = typeof breakpoints[i] === 'number' ? `(max-width: ${breakpoints[i]}px)` : breakpoints[i]

    result.push({
      img: src[i],
      sizes: sizes[i],
      breakpoints: src.length === 1 ? breakpoints : [],
      media: i === src.length - 1 ? null : breakpoint,
    })
  }

  return result
}

function makeSizes(img, sizes, breakpoints) {
  // a custom sizes value has been provided via props for this image
  if (sizes) return sizes

  // otherwise, we generate a sizes definition using the metadata
  // about available image sizes and breakpoints provided by the loader
  return img.sizes
    .reduce((acc, s, i) => {
      if (i > breakpoints.length) {
        console.warn(`The ${img.name} @ ${s}w will never be shown due to insufficient breakpoints.`)
        return acc
      }

      return breakpoints[i] && img.sizes.length - 1 > i
        ? acc.concat(`(max-width: ${breakpoints[i]}px) ${s}px`)
        : acc.concat(`${s}px`)
    }, [])
    .join(', ')
}

module.exports = { Picture, makeSizes, flattenSrc }
