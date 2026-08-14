const path = require('path')
const { existsSync } = require('fs')

module.exports = function createNextBuild(base) {
  const { default: nextBuild } = require(path.join(base, 'dist/build'))
  const bundlerPath = path.join(base, 'dist/lib/bundler')

  // Next.js 16 changed the default bundler of its internal build function to
  // Turbopack. next-img relies on webpack's loader API, so select webpack
  // explicitly when the Next.js bundler API is available.
  if (existsSync(`${bundlerPath}.js`)) {
    const { Bundler } = require(bundlerPath)

    return dir => nextBuild(dir, undefined, undefined, undefined, undefined, undefined, undefined, Bundler.Webpack)
  }

  return nextBuild
}
