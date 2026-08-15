const path = require('path')
const { existsSync } = require('fs')

module.exports = function createNextBuild(base) {
  const { default: nextBuild } = require(path.join(base, 'dist/build'))
  const bundlerPath = path.join(base, 'dist/lib/bundler')

  if (!existsSync(`${bundlerPath}.js`)) return nextBuild

  const { Bundler } = require(bundlerPath)
  return (dir, bundler = 'webpack') => {
    const selectedBundler = bundler === 'turbopack' ? Bundler.Turbopack : Bundler.Webpack
    return nextBuild(dir, undefined, undefined, undefined, undefined, undefined, undefined, selectedBundler)
  }
}
