import React, { Fragment, forwardRef } from '../../example/node_modules/react'

export const Picture = forwardRef(function Picture({ src, sizes, breakpoints, ...imgProps }, ref) {
  if (!Array.isArray(src)) {
    src = [src]
  }

  if (!Array.isArray(sizes)) {
    sizes = sizes ? [sizes] : src.map(() => {})
  }

  if (src.length === 0) {
    return null
  }

  const fallbackImg = src[0]

  breakpoints = breakpoints || fallbackImg.breakpoints

  // if (!ref) {
  ref = React.useRef()
  // }

  React.useEffect(() => {
    const src = ref.current && ref.current.currentSrc
    if (src) {
      console.log('Using!', src)
    }
  }, [ref.current && ref.current.currentSrc])

  return (
    <picture>
      {src.map((img, i) => (
        <Fragment key={i}>
          {img.webpSrcSet && img.webpSrcSet.length > 0 && (
            <source
              type='image/webp'
              srcSet={img.webpSrcSet}
              media={makeMedia(i, src, breakpoints)}
              sizes={makeSizes(i, sizes, src, breakpoints)}
            />
          )}
          {img.srcSet && img.srcSet.length > 0 && (
            <source
              type={img.type}
              srcSet={img.srcSet}
              media={makeMedia(i, src, breakpoints)}
              sizes={makeSizes(i, sizes, src, breakpoints)}
            />
          )}
        </Fragment>
      ))}

      <img {...imgProps} ref={ref} src={fallbackImg.src} srcSet={fallbackImg.srcSet} />
    </picture>
  )
})

/**
 * Media queries kick in when we pass multiple images to src.
 * In that case we show a different image src at each breakpoint.
 * This is to faciliate the so called called art direction.
 */
export function makeMedia(i, src, breakpoints) {
  if (src.length < 2 || breakpoints < 1) {
    return
  }

  if (src.length > breakpoints.length + 1) {
    console.warn(
      `Provide enough breakpoints for every image: ${src.length} images expected to have ${src.length - 1} breakpoints`,
      src,
    )
    return
  }

  return i < breakpoints.length ? `(max-width: ${breakpoints[i]}px)` : undefined
}

export function makeSizes(i, sizes, src, breakpoints) {
  if (sizes[i]) return sizes[i]

  const allSizes = src.reduce((acc, s) => acc.concat(s.sizes), [])

  if (allSizes.length > breakpoints.length + 1) {
    console.warn(
      `Sizes prop required since there are more images (${allSizes.length}) than devices (${breakpoints.length + 1})`,
      src,
    )
    return
  }

  const breakpointIndex = src.reduce((acc, img, j) => (j < i ? acc + img.sizes.length : acc), 0)
  const availableBreakpoints = breakpoints.slice(breakpointIndex)
  const img = src[i]
  return img.sizes
    .map((s, i) => (availableBreakpoints[i] ? `(max-width: ${availableBreakpoints[i]}px) ${s}w` : null))
    .filter(Boolean)
    .concat('100vw')
    .join(', ')
}
