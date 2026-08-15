const path = require('path')
const crypto = require('crypto')
const { existsSync } = require('fs')
const { Command } = require('commander')
const assetStore = require('./asset-store')
const runNextBuild = require('./next-cli')

const program = new Command()

program
  .name('next-img')
  .argument('[dir]', 'directory of the Next.js application (defaults to current directory)')
  .option('--webpack', 'rebuild using webpack instead of Turbopack')
  .description('Rebuilds all of the images in the persistent cache')
  .action(async (dir, options) => {
    const resolvedDir = path.resolve(dir || '.')

    if (!existsSync(resolvedDir)) {
      console.error(`> Directory not found: ${resolvedDir}`)
      process.exitCode = 1
      return
    }

    const session = crypto.randomUUID()
    const bundler = options.webpack ? 'webpack' : 'turbopack'
    const env = {
      ...process.env,
      NEXT_IMG_REBUILD: session,
      NEXT_IMG_PROJECT_DIR: resolvedDir,
    }
    delete env.TURBOPACK

    try {
      console.log(`> Rebuilding next-img cache with ${bundler}`)
      await runNextBuild({ dir: resolvedDir, bundler, env })
      await assetStore.gc(session)
    } catch (error) {
      console.error('')
      console.error('> Build error occurred')
      console.error(error)
      process.exitCode = 1
    }
  })

program.parseAsync(process.argv)
