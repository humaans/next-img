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

## Motivation

By default Next.js or Webpack doesn't help you optimize the images. This means custom scripting, processing images by hand, using an image CDN or not optimising images at all. **next-img** provides and alternative streamlined approach for adding images to your Next.js websites. It combines a Next.js plugin, a custom webpack loader and a React component to make serving images in an optimal fashion in a way that is as close to typing `<img src='foo.png' />` as possible.

The principles

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
