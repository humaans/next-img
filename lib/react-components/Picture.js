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

export function flattenSrc(src, sizes, breakpoints) {
  const result = []

  for (let i = 0; i < src.length; i++) {
    if (i > breakpoints.length) {
      console.warn(`Image ${src[i].name} was not included due to insufficient breakpoints.`)
      continue
    }

    result.push({
      img: src[i],
      sizes: sizes[i],
      breakpoints: src.length === 1 ? breakpoints : [],
      maxWidth: i === src.length - i ? null : breakpoints[i],
    })
  }

  return result
}

export function makeSizes(img, sizes, breakpoints) {
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
        ? acc.concat(`(max-width: ${breakpoints[i]}px) ${s}w`)
        : acc.concat(`${s}w`)
    }, [])
    .join(', ')
}
