import type { NextConfig } from 'next'

declare namespace withImg {
  type CacheMode = 'read-write' | 'read-only' | 'off'
  type OutputFormat = 'avif' | 'webp' | 'jpeg' | 'png'

  interface CacheConfig {
    mode?: CacheMode
    dir?: string
    /** Manual cache invalidation value for transform changes outside next-img. */
    version?: string | number | null
  }

  interface Config {
    breakpoints?: Array<number | string>
    densities?: Array<number | `${number}x`>
    widths?: number[]
    formats?: OutputFormat[]
    fallbackFormat?: OutputFormat | 'original'
    placeholder?: boolean | 'blur'
    placeholderSize?: number
    strict?: boolean
    /** Warn for unsized imports above this intrinsic dimension. Strict mode turns the warning into an error. */
    maxBareImportSize?: number | false
    jpeg?: Record<string, unknown>
    png?: Record<string, unknown>
    webp?: Record<string, unknown>
    avif?: Record<string, unknown>
    imagesDir?: string
    /** Webpack output filename template. Turbopack owns emitted asset filenames. */
    imagesName?: string
    imagesPublicPath?: string | ((fileName: string) => string) | null
    imagesOutputPath?: string | ((fileName: string) => string) | null
    cache?: CacheConfig
    cacheDir?: string
    assetStageDir?: string
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
