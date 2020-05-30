# next-img

A plugin for Next.js for optimizing and embedding images.

This plugin will help you:

- **resize** to screen sizes and pixel densities required for your project
- **modernize** all images to the webp image format
- **optimize** the file size of the jpg/png/webp files using `sharp` and `advpng`
- **embed** the images with ease using the built in `<Picture />` React component

The plugin consists of:

- **cli command** to rebuild the persistent cache of the optimized images
- **next plugin** that you install in your `next.config.js`
- **wepack loader** that is installed in the webpack pipeline used by Next.js
- **react-component** that makes embedding images easy using modern markup trivial

Features:

- Import jpg and png images
- Resize to multiple output sizes and pixel densities (using `sharp`)
- Output original and webp image formats for wider browser support
- Optimize jpg, png and webp images to specified quality (using `sharp` and `advpng`)
- Built in `<Picture>` component for embedding images with ease
- Persistent and temporary caching for fast incremental builds and fast CI builds
- Support for art direction style `<picture>` elements with media queries
- No dependencies on existing webpack loaders, making usage and configuration streamlined

By default next-img is configured with:

- 1 breakpoint at 768px
- 2 pixel densities of 1x, 2x
- to output both the original format and webp
- TODO mention default quality

However all of those settings can be changed globally and per image.

## Motivation

By default, when using Next.js.. bla bla.

- using webp format when supported
- resizing images to avoid serving oversized files
- running images through an optimizer

## Usage

Install the plugin...
Import the image...
Embed the image...

See the [demo]() website for a more comprehensive list of examples and use cases.

## Configuration

```js
{
  ...
}
```

## Picture component props

...

## Workflow

next

/page1, /page2...
outputs: /resources/a@1.png, resources/b@1.png

make some changes

/page1, /page2...
outputs: /resources/a@1.png, /resources/a@2.png, /resources/a@3.png, resources/b@1.png

commit.. ?

or run..
next-img
clears our all images, rebuilds all (reading from .next/cache to reduce work necessary)
now you can commit

next build only uses cached resources and throws otherwise (if persistentCache is on.., otherwise it just uses the temp .next/cache if available)
if it throws, you know you need to rerun next-img

## FAQ

**Are `gif` images supported?**
Not at the moment, but that could potentially be added in the future.

**How do I clear the cache?**
Cache should never cause any issues (unless you found a bug!), but if you want to free up space or otherwise:

- to rebuild persistent cache - execute the `npx next-img` command
- to clear the temporary cache - `rm -rf .next` or more specifically `rm -rf .next/cache/next-img`

Note that temporary cache is in use even when persistent cache is turned on. This is to speed up the `next-img` command which uses the temporary cache if available to avoid having to reoptimise the same images with the exact same settings.

## Development

To develop this project, you'll need to run a watcher for the <Picture /> component:

```
npm install
npm run watch
```

You can use example as they playground:

```
cd example
next
```

To execute the `next-img` in the example dir:

```
node ../bin/next-img
```
