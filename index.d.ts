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
  type: string
  srcSet: string | null
  webpSrcSet: string | null
  sources: Partial<Record<ImageFormat, ImageFormatSource>>
  formats: ImageFormat[]
  fallbackFormat: ImageFormat
  images: ImageCandidate[]
  name: string
  sizes: number[]
  breakpoints: Array<number | string>
}

export type ImageImport = NextImgData | { default: NextImgData }

export interface ArtDirectionSource {
  src: ImageImport
  media?: string
  sizes?: string
}

interface CommonPictureProps extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet' | 'sizes'> {
  pictureProps?: React.HTMLAttributes<HTMLPictureElement>
  /** Emit responsive image preload links in the document head. */
  preload?: boolean
}

interface ImagePictureProps {
  src?: ImageImport | ImageImport[]
  sources?: never
  sizes?: string | Array<string | undefined>
  breakpoints?: Array<number | string>
}

interface ArtDirectionPictureProps {
  sources: ArtDirectionSource[]
  src?: never
  sizes?: never
  breakpoints?: never
}

export type PictureProps = CommonPictureProps & (ImagePictureProps | ArtDirectionPictureProps)

export const Picture: React.ForwardRefExoticComponent<PictureProps & React.RefAttributes<HTMLImageElement>>
