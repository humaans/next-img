<p align="center">
  <img src="https://user-images.githubusercontent.com/324440/84087760-bbff5f80-a9e2-11ea-8aeb-db605876d9cf.png" alt="next-img" title="next-img">
</p>

<h4 align="center">Build-time image optimization for Next.js.</h4>

`next-img` resizes and compresses imported images with Sharp during the build. It emits static files, so it works with static export and does not need an image CDN or runtime optimizer.

- Webpack and Turbopack support
- responsive JPEG, PNG, WebP, and AVIF output
- persistent local cache that can be committed to Git
- automatic dimensions and EXIF orientation
- responsive preloads and art direction through `<Picture>`
- TypeScript declarations

## Install

```sh
npm install next-img
```

Add the plugin to `next.config.js`:

```js
const withImg = require('next-img/plugin')

module.exports = withImg({})
```

Import an image and render it:

```jsx
import { Picture } from 'next-img'
import hero from './hero.jpg?sizes=375,800&formats=avif,webp'

export default function Hero() {
  return <Picture src={hero} alt='Our team at work' />
}
```

The image is displayed at 375px on small screens and 800px on larger screens. Next-img generates each size at 1x and 2x pixel density, in AVIF, WebP, and JPEG. The browser downloads the best candidate.

## Image imports

Use query parameters to control each image:

- `sizes=375,800` describes the image's CSS width at each breakpoint.
- `densities=1x,2x` controls which pixel densities to generate for every size. These are the defaults.
- `formats=avif,webp` sets preferred formats. The original format remains the default fallback.
- `fallbackFormat=jpeg` selects a different fallback.
- `jpeg`, `png`, `webp`, and `avif` accept Sharp output options, for example `?jpeg[quality]=70`.

Unknown options warn; malformed options fail the build. Set `nextImg.strict: true` to turn warnings into errors.

A bare import keeps its intrinsic dimensions:

```js
import logo from './logo.png'
```

By default, next-img warns when a bare import is wider or taller than 2048px. Change `maxBareImportSize`, or set it to `false` to disable the warning.

## Picture

`Picture` forwards standard image props and its ref to the underlying `<img>`. It adds `width` and `height`, generates `srcset` and the HTML `sizes` attribute, and emits `<source>` elements for preferred formats.

Preload an above-the-fold image with responsive metadata:

```jsx
<Picture src={hero} alt='Our team at work' preload />
```

`preload` defaults to eager loading and `fetchPriority="high"`; decoding remains asynchronous. It preloads only the first preferred format to avoid duplicate downloads.

For art direction, provide explicit sources and finish with an unconditional fallback:

```jsx
<Picture
  sources={[
    { src: mobile, media: '(max-width: 767px)', sizes: '100vw' },
    { src: desktop, sizes: '1200px' },
  ]}
  alt='Our team at work'
/>
```

Automatic art-direction preloading supports one conditional source plus its fallback. Manage preloads separately for more complex source sets.

Useful component props:

- `sizes`: overrides the generated HTML `sizes` attribute
- `breakpoints`: overrides the configured breakpoints
- `preload`: emits a responsive image preload
- `autoSizes`: prefixes lazy images with `sizes="auto"`
- `pictureProps`: props for the outer `<picture>` element

Legacy image arrays remain supported through `src={[mobile, desktop]}` with `breakpoints`.

## Cache and builds

Optimized files are stored in `resources` by default. Commit this directory or preserve it in CI. Ordinary development and production builds process missing images.

Run the CLI after changing imports, image settings, or Sharp versions. It rebuilds active images and removes unused files:

```sh
npx next-img
```

The cleanup build uses Turbopack. Use Webpack when your application builds with Webpack:

```sh
npx next-img --webpack
```

Cache modes:

- `read-write` builds missing images and updates the cache. This is the default.
- `read-only` fails when an optimized image is missing.
- `off` stores the cache under `.next` instead of `resources`.

```js
module.exports = withImg({
  nextImg: {
    cache: {
      mode: 'read-write',
      dir: 'resources',
    },
  },
})
```

Cache filenames remain stable across next-img and Sharp upgrades. `npx next-img` always regenerates every referenced derivative in place, then removes unused files. Run it after upgrading next-img or Sharp.

The maintenance command requires a persistent cache. With `cache.mode: 'off'`, clear `.next` after upgrading next-img or Sharp instead.

The deprecated `persistentCache` and `persistentCacheDir` options remain supported.

## Configuration

Common plugin options:

| Option              | Default                                    | Purpose                                                        |
| ------------------- | ------------------------------------------ | -------------------------------------------------------------- |
| `breakpoints`       | `[768]`                                    | Breakpoints that map imported sizes to the layout              |
| `densities`         | `['1x', '2x']`                             | Pixel densities generated for each imported size               |
| `formats`           | `['webp']`                                 | Preferred output formats                                       |
| `fallbackFormat`    | `'original'`                               | Fallback output format                                         |
| `strict`            | `false`                                    | Turn warnings into build errors                                |
| `maxBareImportSize` | `2048`                                     | Warn above this intrinsic width or height; `false` disables it |
| `cache`             | `{ mode: 'read-write', dir: 'resources' }` | Cache behavior and location                                    |

JPEG, PNG, WebP, and AVIF settings accept [Sharp output options](https://sharp.pixelplumbing.com/api-output).

Webpack also supports `imagesDir`, `imagesName`, `imagesPublicPath`, and `imagesOutputPath`. Turbopack controls final emitted filenames. Both bundlers honor the Next.js `assetPrefix` and `basePath`.

Set `nextImg.projectDir` when Next.js is invoked for an application outside the current working directory. The `next-img` CLI sets it automatically.

## Development

```sh
npm install
npm test
npm run test:integration
```

The example site is available at [humaans.github.io/next-img](https://humaans.github.io/next-img/).
