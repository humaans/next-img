import type * as React from 'react'

export type ImageFormat = 'avif' | 'webp' | 'jpeg' | 'png'

export interface ImageCandidate {
  path: string
  size: number
  density: number
  width: number
  height: number
  format: ImageFormat
}

export interface ImageFormatSource {
  type: string
  srcSet: string | null
  images: ImageCandidate[]
}

export interface NextImgData {
  src: string
  width: number
  height: number
  format: ImageFormat
  type: string
  srcSet: string | null
  webpSrcSet: string | null
  avifSrcSet: string | null
  sources: Partial<Record<ImageFormat, ImageFormatSource>>
  formats: ImageFormat[]
  fallbackFormat: ImageFormat
  images: ImageCandidate[]
  name: string
  sizes: number[]
  breakpoints: Array<number | string>
  blurDataURL: string | null
}

export type ImageImport = NextImgData | { default: NextImgData }

export interface ArtDirectionSource {
  src: ImageImport
  media?: string
  sizes?: string
}

export interface PictureProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'sizes'> {
  src?: ImageImport | ImageImport[]
  sources?: ArtDirectionSource[]
  sizes?: string | Array<string | undefined>
  breakpoints?: Array<number | string>
  pictureProps?: React.HTMLAttributes<HTMLPictureElement>
  priority?: boolean
  autoSizes?: boolean
}

export const Picture: React.ForwardRefExoticComponent<PictureProps & React.RefAttributes<HTMLImageElement>>

export function makeSizes(
  image: Pick<NextImgData, 'sizes' | 'name'>,
  sizes?: string | null,
  breakpoints?: Array<number | string>,
): string | undefined

export function flattenSrc(
  src: NextImgData[],
  sizes: Array<string | undefined>,
  breakpoints: Array<number | string>,
): unknown[]
