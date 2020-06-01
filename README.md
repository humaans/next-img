<p align="center">
  <img src="https://user-images.githubusercontent.com/324440/83357465-65e84780-a364-11ea-8f0d-23fb0282cad5.png" alt="next-img" title="next-img">
</p>

<h4 align="center">Next.js plugin for embedding optimized images.</h4>
<br />

This plugin will help you:

- **resize** images for all screen sizes and pixel densities required for your project
- **modernize** images to the webp image format
- **optimize** the file sizes of the jpg/png/webp files using `sharp`
- **embed** the images with ease using the built in `<Picture />` React component

Features:

- Handles jpg and png source images
- Resizes to multiple output sizes and pixel densities
- Outputs an optimized webp image format for modern browsers
- Outputs an optimized original image format for wider browser support
- Built in `<Picture>` component for embedding images with ease
- Persistent caching for fast incremental builds and fast deploys
- Support for art direction with multiple source images
- No dependencies on any existing webpack loaders streamlining the usage

By default **next-img** is configured with:

- 1 breakpoint at 768px
- 2 pixel densities of 1x, 2x
- to output both the original format and webp
- to use quality of 80 for jpeg, 100 for png and 80 for webp
- to use near lossless flag when converting png to webp

All of these settings can be changed in your `next.config.js` or in the individual image imports.

Developed and used by [Humaans](https://humaans.io/).

## Motivation

By default Next.js or Webpack doesn't help you with optimizing the images. This means custom scripting or configuration, processing images by hand, using an image CDN or not optimising images at all. **next-img** provides and alternative streamlined approach for adding images to your Next.js websites. It combines a Next.js plugin, a custom webpack loader and a React component to make serving images in an optimal fashion in a way that is as close to typing `<img src='foo.png' />` as possible.

In short, it takes the following React component:

```js
<Picture src={require('./images/jelly.jpg?sizes=375,800')} />
```

Imports the image, resizes, optimizes, caches it in your git repository and outputs the following markup:

```html
<picture>
  <source
    type="image/webp"
    srcset="
      /_next/static/images/jelly-375@1x-5e609945b16eba99bf2aaa3007d3ba92.webp  375w,
      /_next/static/images/jelly-375@2x-850e7fd87fceda1e7cefcb628a07f5c4.webp  750w,
      /_next/static/images/jelly-800@1x-1481a104c8ce38822aeafdbe97a17e69.webp  800w,
      /_next/static/images/jelly-800@2x-fc18765bd3b819714ca2da58e10907c9.webp 1600w
    "
    sizes="(max-width: 768px) 375px, 800px"
  />
  <source
    type="image/jpeg"
    srcset="
      /_next/static/images/jelly-375@1x-259e4b1f32b3bdd4349806c4a5763a54.jpg  375w,
      /_next/static/images/jelly-375@2x-295d4cc8111d4e911dbc9ad4dd1d8322.jpg  750w,
      /_next/static/images/jelly-800@1x-090d866969aba9b237e71ee52512a7c4.jpg  800w,
      /_next/static/images/jelly-800@2x-33f1639cadf8c4c5f19eb5c19e20a67d.jpg 1600w
    "
    sizes="(max-width: 768px) 375px, 800px"
  />

  <img
    src="/_next/static/images/jelly-375@1x-259e4b1f32b3bdd4349806c4a5763a54.jpg"
    srcset="
      /_next/static/images/jelly-375@1x-259e4b1f32b3bdd4349806c4a5763a54.jpg  375w,
      /_next/static/images/jelly-375@2x-295d4cc8111d4e911dbc9ad4dd1d8322.jpg  750w,
      /_next/static/images/jelly-800@1x-090d866969aba9b237e71ee52512a7c4.jpg  800w,
      /_next/static/images/jelly-800@2x-33f1639cadf8c4c5f19eb5c19e20a67d.jpg 1600w
    "
  />
</picture>
```

## Usage

Install the package

```
npm install next-img
```

Install the Next.js plugin into your `next.config.js`:

```js
const withPlugins = require('next-compose-plugins')
const nextImg = require('next-img/plugin')

module.exports = withPlugins([
  nextImg,
  {
    // specify the default breakpoints
    // you'd like to use, you can always
    // override this per image
    breakpoints: [768],
  },
])
```

In your application, import the images and use the `<Picture />` component:

```js
import { Picture } from 'next-img'
import jelly from './images/jelly.jpg?sizes=375,800'

export default () => <Picture src={jelly} />
```

Or inline:

```js
import { Picture } from 'next-img'

export default () => <Picture src={require('./images/jelly.jpg?sizes=375,800')} />
```

This particular example will generate the following images:

- 375px wide image to show on small screens with low pixel density of 1x
- 750px wide image to show on small screens with high pixel density of 2x
- 800px wide image to show on large screens with low pixel density of 1x
- 1600px wide image to show on large screens with high pixel density of 2x

The images will be saved in `resources` directory in the root of your project during the development. This means, that if you tweak the settings of each image, you might generate superflous images that are not actually needed by your project. In that case execute `next-img` command to build any missing images and remove any unnecessary ones:

```
npx next-img
```

Finally, check the `resources` directory into your source control to be reused later for development and production builds. You can turn this feature off by setting `persistentCache: false` in the plugin configuration.

See the [demo]() website for a comprehensive list of examples.

## Configuration

Here are the default configuration options:

```js
{
  breakpoints: [768],
  densities: ['1x', '2x'],

  // the directory within Next.js build output
  imagesDir: 'images',
  // the output image name template
  imagesName: '[name]-[size]@[density]-[hash].[ext]',
  // advanced - customise the image public path
  imagesPublicPath: null,
  // advanced - customise the image output path
  imagesOutputPath: null,

  // persistent cache allows for faster deploys
  // by avoiding reprocessing images that were
  // already previously processed
  persistentCache: true,
  persistentCacheDir: 'resources',

  // this directory within .next is used in case persistent cache is turned off
  cacheDir: path.join('cache', 'next-img'),

  // image quality configuration
  jpeg: {
    quality: 80,
  },

  png: {
    quality: 100,
  },

  webp: {
    quality: 80,
    reductionEffort: 6,
  },
}
```

## Import Params

When importing an image, you can use query parameters to customise the optimisation:

- **sizes** - a list of comma separated sizes you need the image produced at.
- **densities** - a list of comma separated densities you need each image size to be produced at.
- **jpeg / png / webp** - quality configuration options for the output image

Examples:

```js
import img1 from './images/img.jpg'
import img2 from './images/img.jpg?sizes=375,900'
import img3 from './images/img.jpg?sizes=375,900&densities=1x'
import img4 from './images/img.jpg?sizes=375,900&densities=1x,2x,3x'
import img5 from './images/img.jpg?sizes=375,900&densities=1x,2x,3x&jpeg[quality]=70&webp[quality]=70'
```

## Picture Props

`next-img` comes with a React component making embedding images easier.

Here are the props this component access:

- **src** the imported image object, or an array of such objects. In case an array of image sources is provided, each image source will be shown at each breakpoint available.
- **breakpoints** - a list of breakpoints to override the default behaviour
- **sizes** -
- **the rest of the props and ref** are forwarded to the `img` tag. This allows the use of attributes such as `alt` or `loading="lazy"` and so on.

See the [demo]() website for a comprehensive list of examples.

## FAQ

**Do I have to use the `<Picture />` component?**
It is indeed optional. You can handle the imported image object however you want.

**Will you support `gif` images?**
That could potentially be added in the future, let use know if you're interested.

## Development

To develop this project, you'll need to run a watcher for the `<Picture />` component:

```
npm install
npm run watch
```

You can use example as the playground:

```
cd example
npm install
next
```

To execute the `next-img` command in the example dir:

```
node ../bin/next-img
```
