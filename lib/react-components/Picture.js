import React, { Fragment, forwardRef } from 'react'

export const Picture = forwardRef(function Picture({ src, sizes, breakpoints, ...imgProps }, ref) {
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
  console.log({ flattendSrc })

  return (
    <picture>
      {flattendSrc.map(({ img, sizes, breakpoints, maxWidth }, i) => (
        <Fragment key={i}>
          {img.webpSrcSet && img.webpSrcSet.length > 0 && (
            <source
              type='image/webp'
              srcSet={img.webpSrcSet}
              media={maxWidth ? `(max-width: ${maxWidth}px)` : undefined}
              sizes={makeSizes(img, sizes, breakpoints)}
            />
          )}
          {img.srcSet && img.srcSet.length > 0 && (
            <source
              type={img.type}
              srcSet={img.srcSet}
              media={maxWidth ? `(max-width: ${maxWidth}px)` : undefined}
              sizes={makeSizes(img, sizes, breakpoints)}
            />
          )}
        </Fragment>
      ))}

      <img {...imgProps} ref={ref} src={fallbackImg.src} srcSet={fallbackImg.srcSet} />
    </picture>
  )
})

//                0     1     2
// src         = [img1, img2, img3]
// breakpoints = [768] len = 1

// ?sizes=400,800
// ?sizes=1200
// ?breakpoints=[768,1200]

export function flattenSrc(src, sizes, breakpoints) {
  const result = []

  // let availableBreakpointIndex = 0
  for (let i = 0; i < src.length; i++) {
    if (i > breakpoints.length) {
      console.warn(`Image ${src[i].name} was not included due to insufficient breakpoints.`)
      continue
    }

    const maxWidth = i === src.length - i ? null : breakpoints[i]
    // const brk = breakpoints.slice(availableBreakpointIndex, src[i].sizes.length)
    // availableBreakpointIndex += src[i].sizes.length

    result.push({
      img: src[i],
      sizes: sizes[i],
      breakpoints: src.length === 1 ? breakpoints : [],
      maxWidth: maxWidth,
    })
  }

  return result
}

// /**
//  * Media queries kick in when we pass multiple images to src.
//  * In that case we show a different image src at each breakpoint.
//  * This is to faciliate the so called called art direction.
//  */
// export function makeMedia(i, src, breakpoints) {
//   if (src.length < 2 || breakpoints < 1) {
//     return
//   }

//   // if (src.length > breakpoints.length + 1) {
//   //   console.warn(
//   //     `Provide enough breakpoints for every image: ${src.length} images expected to have ${src.length - 1} breakpoints`,
//   //     src,
//   //   )
//   //   return
//   // }

//   return i < breakpoints.length ? `(max-width: ${breakpoints[i]}px)` : undefined
// }

// ?sizes=400,800
// ?breakpoints=[768]

export function makeSizes(img, sizes, breakpoints) {
  // a custom sizes value has been provided via props for this image
  if (sizes) return sizes

  // const allSizes = src.reduce((acc, s) => acc.concat(s.sizes), [])

  // if (allSizes.length > breakpoints.length + 1) {
  //   console.warn(
  //     `Sizes prop required since there are more images (${allSizes.length}) than devices (${breakpoints.length + 1})`,
  //     src,
  //   )
  //   return
  // }

  // const breakpointIndex = src.reduce((acc, img, j) => (j < i ? acc + img.sizes.length : acc), 0)
  // const availableBreakpoints = breakpoints.slice(breakpointIndex)
  // const img = src[i]

  return img.sizes
    .reduce((acc, s, i) => {
      if (i > breakpoints.length) {
        console.warn(`The ${img.name} @ ${s}w will never be shown due to insufficient breakpoints.`)
        return acc
      }

      return breakpoints[i] && img.sizes.length - 1 > i
        ? acc.concat(`(max-width: ${breakpoints[i]}px) ${s}w`)
        : acc.concat(`${s}w`)
    }, [])
    .join(', ')
}
