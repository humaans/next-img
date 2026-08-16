import type { NextConfig } from 'next'
import type sharp = require('sharp')

declare namespace withImg {
  type CacheMode = 'read-write' | 'read-only' | 'off'
  type OutputFormat = 'avif' | 'webp' | 'jpeg' | 'png'

  interface FormatConversions {
    jpeg?: sharp.JpegOptions
    png?: sharp.PngOptions
    webp?: sharp.WebpOptions
    avif?: sharp.AvifOptions
  }

  interface CacheConfig {
    mode?: CacheMode
    dir?: string
  }

  interface Config {
    breakpoints?: Array<number | string>
    densities?: Array<number | `${number}x`>
    formats?: OutputFormat[]
    fallbackFormat?: OutputFormat | 'original'
    /** Promote next-img warnings to build errors. */
    strict?: boolean
    /** Warn for unsized imports above this intrinsic dimension. Strict mode turns the warning into an error. */
    maxBareImportSize?: number | false
    jpeg?: sharp.JpegOptions & FormatConversions
    png?: sharp.PngOptions & FormatConversions
    webp?: sharp.WebpOptions & FormatConversions
    avif?: sharp.AvifOptions & FormatConversions
    imagesDir?: string
    /** Webpack output filename template. Turbopack owns emitted asset filenames. */
    imagesName?: string
    imagesPublicPath?: string | ((fileName: string) => string) | null
    imagesOutputPath?: string | ((fileName: string) => string) | null
    cache?: CacheConfig
    cacheDir?: string
    projectDir?: string
    /** @deprecated Use cache.mode instead. */
    persistentCache?: boolean
    /** @deprecated Use cache.dir instead. */
    persistentCacheDir?: string
  }

  type NextConfigWithImg = NextConfig & { nextImg?: Config }
}

declare function withImg(config?: withImg.NextConfigWithImg): NextConfig

export = withImg
