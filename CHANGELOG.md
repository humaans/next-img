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
