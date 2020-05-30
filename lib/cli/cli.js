const { existsSync } = require('fs')
const { resolve } = require('path')

const base = require.resolve('next', { paths: ['.'] }).replace('/dist/server/next.js', '')
const { default: nextBuild } = require(`${base}/dist/build`)
const arg = require(`${base}/dist/compiled/arg`)
const { printAndExit } = require(`${base}/dist/server/lib/utils`)

const args = arg({
  // Types
  '--help': Boolean,
  // Aliases
  '-h': '--help',
})

if (args['--help']) {
  printAndExit(
    `
      Description
        Rebuilds all of the images in the persistent cache
      Usage
        $next-img <dir>
      <dir> represents the directory of the Next.js application.
      If no directory is provided, the current directory will be used.
    `,
    0,
  )
}

const dir = resolve(args._[0] || '.')

// Check if the provided directory exists
if (!existsSync(dir)) {
  printAndExit(`> No such directory exists as the project root: ${dir}`)
}

// Pass some info to the next-img plugin via an ENV variable
// to tell it to clear and then rebuild the persistent cache
process.env.NEXT_IMG_REBUILD = true

nextBuild(dir)
  .then(() => process.exit(0))
  .catch(err => {
    console.error('')
    console.error('> Build error occurred')
    printAndExit(err)
  })
