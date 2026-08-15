const path = require('path')
const crypto = require('crypto')
const { existsSync } = require('fs')
const loader = require('./loader')
const createNextBuild = require('./next-build')

const base = require.resolve('next', { paths: ['.'] }).replace('/dist/server/next.js', '')
const { Command } = require(`${base}/dist/compiled/commander`)

const program = new Command()

program
  .argument('[dir]', 'directory of the Next.js application (defaults to current directory)')
  .option('-h, --help', 'display help for command')
  .option('--webpack', 'rebuild using webpack instead of Turbopack')
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

      Options
        --webpack  Rebuild using webpack instead of Turbopack.
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
    process.env.NEXT_IMG_REBUILD = crypto.randomUUID()
    process.env.NEXT_IMG_PROJECT_DIR = resolvedDir

    const projectBase = require.resolve('next', { paths: [resolvedDir] }).replace('/dist/server/next.js', '')
    const nextBuild = createNextBuild(projectBase)
    const bundler = options.webpack ? 'webpack' : 'turbopack'
    if (options.webpack) {
      delete process.env.TURBOPACK
    } else {
      process.env.TURBOPACK = '1'
    }
    console.log(`> Rebuilding next-img cache with ${bundler}`)
    nextBuild(resolvedDir, bundler)
      .then(async () => {
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

program.parse(process.argv, { from: 'node' })
