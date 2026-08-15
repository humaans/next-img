## Unreleased

- Auto-orient images from EXIF metadata before resizing.
- Simplify persistent caching: preserve released filenames, remove processing manifests and `cache.version`, and make `next-img` regenerate every referenced derivative in place.
- Validate import options and report unknown, malformed, or incompatible values.
- Add exact `widths`, generic format metadata, optional AVIF, and configurable fallbacks.
- Add explicit art-direction sources, per-source dimensions, picture attributes, and lazy `auto` sizes.
- Add responsive document-head image preloads with React 19 and React 18 Pages Router support.
- Warn when images over 2048px are imported without responsive sizing, with configurable limits and strict-mode errors.
- Centralize cache state, image-format definitions, and loader diagnostics behind explicit internal contracts.
- Add TypeScript declarations for the component, generated metadata, and plugin configuration.
- Add explicit read-write, read-only, and off cache modes while preserving the legacy cache options.
- Prune staged assets safely and remove Commander, mkdirp, and rimraf in favor of Node.js APIs.
- Add a shared image loader architecture for Webpack and Turbopack.
- Replace webpack-only `emitFile()` calls with generated static asset imports.
- Preserve build-time Sharp optimization, responsive candidates, WebP fallbacks, art direction, and static export without a CDN.
- Add Next.js 16.3 integration fixtures for Turbopack and Webpack builds.
- Make persistent-cache cleanup work when loaders execute in child processes.
- Isolate asset storage and garbage collection from image transformation.
- Run maintenance builds through the target application's public Next.js CLI.
- Use Turbopack for cleanup builds by default and add `next-img --webpack` for backwards compatibility.
- Avoid cold-build filesystem races by emitting Turbopack assets through stable per-format proxies backed by the content-addressed cache.

## 0.6.0

- Add support for React 19 and Next.js 16 (React 18 still supported)
- Fix `next-img` CLI hanging with Next.js 16.2 by explicitly using webpack
- Replace ESLint/Healthier with OxLint
- Replace Prettier with Oxfmt
- Replace react-test-renderer with react-dom/server in tests
- Upgrade dependencies (sharp, qs, rimraf, ava)

## 0.5.0

- Update to support the latest version of Next.js

## 0.4.7

- Upgrade all dependencies to address security alerts.

## 0.4.6

- Upgrade all dependencies to address security alerts.

## 0.4.5

- Upgrade all dependencies to address security alerts.

## 0.4.4

- Upgrade all dependencies to address security alerts.

## 0.4.3

- Upgrade all dependencies to address security alerts.

## 0.4.2

- Fix `next-img` cli to work with Next.js 13 - account for webpack's caching bahevior.

## 0.4.1

- Fix Picture.js to use CommonJS since Next.js does not traspile node_modules

## 0.4.0

- Add support for Next.js 13
- Upgrade all dependencies
- Remove the build step
- Add tests

## 0.3.2

- Fix: make sure the <Picture /> component does not crash if src is empty
- Fix: remove the experimental config warning (Issue #2)

## 0.3.1

- Fix boolean option parsing from the loader query, e.g. it is now possible to set `?png[webp][lossless]=false`.

## 0.3.0

- Provide `width` and `height` attributes for `img` tag when not using art direction. This is so that the browsers know the aspect ratio of the image and can plan the layout accordingly. Note, the width/height varies based on which actual image resolution is being loaded, and we're only specifying the smallest one, that's something the browsers can figure out.

## 0.2.0

- Change the image quality configuration format. Allow configuring `jpeg->webp` and `png->webp` conversions separately.

## 0.1.1

- Remove `console.logs`.

## 0.1.0

🎉
