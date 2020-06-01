<p align="center">
  <img src="https://user-images.githubusercontent.com/324440/83415725-77d6f280-a417-11ea-839d-28237d8125a2.png" alt="next-img" title="next-img">
</p>

<h4 align="center">Next.js plugin for embedding optimized images.</h4>
<br />

Features

- **import** png/jpg image formats
- **resize** to screen sizes and pixel densities required for your project
- **modernize** images by converting to webp format for modern browsers
- **optimize** file sizes using `sharp`
- **streamlined usage** with the built in `<Picture />` React component
- **art direction** with different images for different breakpoints
- **fast** deployment and development workflow using persistent cache

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

Add the plugin to your `next.config.js`:

```js
const withPlugins = require('next-compose-plugins')
const nextImg = require('next-img/plugin')

module.exports = withPlugins([
  nextImg,
  {
    // specify the default breakpoints
    breakpoints: [768],
  },
])
```

In your application, import the images and embed using the `<Picture />` component:

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

The resized and optimized images will be saved to the `resources` directory in the root of your project during the development. This means, that if you tweak the image import parameters or plugin configuration, you might generate extra images that are no longer used by your project. In that case execute `next-img` command to remove any unnecessary images and build any missing ones:

```
npx next-img
```

Now check in the `resources` directory to your source control to be reused later for development and production builds. You can turn this feature off by setting `persistentCache: false` in the plugin configuration, in which case the images will be only stored in a temporary cache inside `.next` directory.

See the [demo]() website for a comprehensive list of examples.

## Configuration

Default plugin configuration options:

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

  // persistent cache allows for fast deploy and
  // development workflow by avoiding reprocessing
  // images that were previously processed
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

- **sizes** - a list of comma separated sizes you will be showing images at. Note that you do not need to take into account the pixel densities here. That is, if you're showing an image at `320px` wide on your website, simply specify `320` here, the plugin will produce any necessary larger versions based on the `densities` configuration.
- **densities** - a list of comma separated densities you need each image size to be produced at. By default `1x` and `2x` sizes of images will be produced, specify `1x` if you want to produce only one image per size, or `1x,2x,3x`, etc. if you want more densities.
- **jpeg / png / webp** - quality configuration options for the output image. Refer to [sharp documentation](https://sharp.pixelplumbing.com/api-output) to find the available options for each output format.

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

- **src** the imported image, or an array of imported images.
- **breakpoints** - a list of breakpoints to override the global configuration.
- **sizes** - a custom [html sizes attribute](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images#How_do_you_create_responsive_images), by default the sizes attribute is generated based on the available images and breakpoints.
- **the rest of the props and ref** are forwarded to the `img` tag. This allows the use of attributes such as `alt`, `loading="lazy"`, etc..

#### A note how sizes/media attributes are generated

When a single image is provided via the `src` prop, then each size will be configured to show up per each breakpoint available using the html [`sizes attribute`](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images#How_do_you_create_responsive_images) attribute.

For example, with breakpoints `[375, 768]` and `?sizes=100,400,800` the `<Picture>` component will apply the following `sizes` attribute:

```
(max-width: 375px) 100px,
(max-width: 768px) 400px,
                   800px
```

When an array of images is provided via the `src` prop, then each image will be configured to show up per each breakpoint available using the html [`media attribute`](https://developer.mozilla.org/en-US/docs/Learn/HTML/Multimedia_and_embedding/Responsive_images#Art_direction).

For example, with breakpoints `[375, 768]` and `src=[img1, img2, img3]` the `<Picture>` component will apply the following `media` attribute:

```html
<picture>
  <source media="(max-width: 480px)" sizes="{{img1 width}}" />
  <source media="(max-width: 768px)" sizes="{{img2 width}}" />
  <source sizes="{{img3 width}}" />
  <img ... />
</picture>
```

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

## Future

Short term roadmap:

#### V1:

- [ ] Allow turning `webp/jpg/png` output off
- [ ] Allow different config for `jpg->webp` and `png->webp` conversions
- [ ] Add `?raw` query support that doesn’t process the image in any way
- [ ] Remove the need for `next-img` command by plugging directly into `next build` via webpack plugin

#### V2:

- [ ] Add support for css images, in addition to the html images
- [ ] Inline small images

And some ideas for where this project could be taken in the future:

- Allow adding `imagemin` optimisation plugins into the pipeline via config. This way users can control how to optimise their images more granuarly.
- Translate relative sizes `?sizes=100vw,50vw,900px` to pixels based on the breakpoint configuration, this would allow dynamic kind of imports that depend on your design system and relative sizing of images, e.g. if css says "50vw", you will not need to do that calculation manually.
- Debug mode that prints image sizes into images themselves, so you can see what's shown when right in the browser inside images (or overlaying them using js at runtime).
- Babel parser that analyses code for images to avoid the need to `require()`.
- Optimize file read/write/hash operations to the maximum for improved performance.
- A puppeteer script to render the website in all predefined breakpoints and automatically analyses all image sizes required.
- Add support for gif and webp as source images.
