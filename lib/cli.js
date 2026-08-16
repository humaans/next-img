const path = require('path')
const crypto = require('crypto')
const { existsSync } = require('fs')
const { parseArgs } = require('util')
const assetStore = require('./asset-store')
const runNextBuild = require('./next-cli')

const HELP = `Usage: next-img [options] [dir]

Generates missing images and removes unused entries from the configured cache.

Arguments:
  dir         directory of the Next.js application (defaults to current directory)

Options:
  --force     rebuild every active image before removing unused entries
  --webpack   rebuild using webpack instead of Turbopack
  -h, --help  display help for command`

function parseCommandLine(args) {
  const { values, positionals } = parseArgs({
    args,
    allowPositionals: true,
    strict: true,
    options: {
      force: { type: 'boolean' },
      webpack: { type: 'boolean' },
      help: { type: 'boolean', short: 'h' },
    },
  })
  if (positionals.length > 1) throw new Error('next-img accepts at most one application directory')
  return {
    dir: positionals[0],
    force: values.force || false,
    webpack: values.webpack || false,
    help: values.help || false,
  }
}

async function main(args = process.argv.slice(2), dependencies = {}) {
  const {
    env = process.env,
    cwd = process.cwd(),
    exists = existsSync,
    log = console.log,
    error = console.error,
    build = runNextBuild,
    gc = assetStore.gc,
    discardGcSession = assetStore.discardGcSession,
  } = dependencies

  let options
  try {
    options = parseCommandLine(args)
  } catch (parseError) {
    error(`> ${parseError.message}`)
    error('')
    error(HELP)
    return 1
  }

  if (options.help) {
    log(HELP)
    return 0
  }

  const resolvedDir = path.resolve(cwd, options.dir || '.')
  if (!exists(resolvedDir)) {
    error(`> Directory not found: ${resolvedDir}`)
    return 1
  }

  const session = crypto.randomUUID()
  const bundler = options.webpack ? 'webpack' : 'turbopack'
  const buildEnv = {
    ...env,
    NEXT_IMG_REBUILD: session,
    NEXT_IMG_PROJECT_DIR: resolvedDir,
  }
  if (options.force) buildEnv.NEXT_IMG_FORCE = '1'
  else delete buildEnv.NEXT_IMG_FORCE
  delete buildEnv.TURBOPACK

  try {
    log(`> ${options.force ? 'Rebuilding' : 'Updating'} next-img cache with ${bundler}`)
    await build({ dir: resolvedDir, bundler, env: buildEnv })
    await gc(session)
    return 0
  } catch (buildError) {
    await discardGcSession(session)
    error('')
    error('> Build error occurred')
    error(buildError)
    return 1
  }
}

module.exports = { HELP, main, parseCommandLine }
