const path = require('path')
const { existsSync } = require('fs')
const loader = require('./loader')

const base = require.resolve('next', { paths: ['.'] }).replace('/dist/server/next.js', '')
const { default: nextBuild } = require(`${base}/dist/build`)
const { Command } = require(`${base}/dist/compiled/commander`)

const program = new Command()

program
  .argument('[dir]', 'directory of the Next.js application (defaults to current directory)')
  .option('-h, --help', 'display help for command')
  .description('Rebuilds all of the images in the persistent cache')
  .action((dir, options) => {
    if (options.help) {
      console.log(`
      Description
        Rebuilds all of the images in the persistent cache

      Usage
        $ next-img <dir>

        <dir> represents the directory of the Next.js application.
        If no directory is provided, the current directory is used.
    `)
      process.exit(0)
    }

    const resolvedDir = path.resolve(dir || '.')

    // Check if the provided directory exists
    if (!existsSync(resolvedDir)) {
      console.error(`> Directory not found: ${resolvedDir}`)
      process.exit(1)
    }

    // Pass some info to the next-img plugin via an ENV variable
    // to tell it to clear and then rebuild the persistent cache
    process.env.NEXT_IMG_REBUILD = true

    nextBuild(resolvedDir)
      .then(async (...res) => {
        await loader.gc()
        process.exit(0)
      })
      .catch(err => {
        console.error('')
        console.error('> Build error occurred')
        console.error(err)
        process.exit(1)
      })
  })

program.parse()
