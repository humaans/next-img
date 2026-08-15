const path = require('path')
const os = require('os')
const crypto = require('crypto')
const fs = require('fs/promises')
const sharp = require('sharp')
const { rimraf } = require('rimraf')
const { mkdirp } = require('mkdirp')
const debug = require('debug')('next-img')

async function cached(create, cacheKey, config, progressMessage) {
  const cacheDir = config.persistentCache
    ? path.join(config.dir, config.persistentCacheDir)
    : path.join(config.dir, config.distDir, config.cacheDir)
  const target = path.join(cacheDir, cacheKey)

  let cachedImage
  try {
    const data = await fs.readFile(target)
    const info = await sharp(data).metadata()
    cachedImage = { data, width: info.width, height: info.height, format: info.format }
  } catch {}

  if (cachedImage) {
    debug(`Cache hit ${cacheKey}`)
    await recordProcessed(cacheDir, cacheKey, config.rebuildSession)
    return cachedImage
  }

  if (config.failOnCacheMiss && !config.rebuildSession) {
    throw new Error(`Missing an optimised image ${cacheKey}. Make sure to rerun next-img.`)
  }

  console.log(progressMessage)
  debug(`Cache miss ${cacheKey}`)
  const ts = Date.now()
  const processed = await create()
  await mkdirp(cacheDir)
  await writeFileAtomic(target, processed.data)
  await recordProcessed(cacheDir, cacheKey, config.rebuildSession)
  debug(`Processed ${cacheKey} in ${Date.now() - ts}ms`)
  return processed
}

async function stage(fileName, data, config) {
  const stageDir = path.resolve(config.assetStageDir)
  const target = resolveWithin(stageDir, fileName)
  await mkdirp(path.dirname(target))
  await writeFileAtomic(target, data)
  return target
}

async function gc(session) {
  if (!session) {
    debug('No images found')
    return
  }

  const root = getGcRoot(session)
  let configs
  try {
    configs = await fs.readdir(root, { withFileTypes: true })
  } catch {
    debug('No images found')
    return
  }

  try {
    for (const entry of configs.filter(entry => entry.isDirectory())) {
      const configRoot = path.join(root, entry.name)
      const { cacheDir } = JSON.parse(await fs.readFile(path.join(configRoot, 'config.json'), 'utf8'))
      const markers = await fs.readdir(path.join(configRoot, 'files'))
      const processed = new Set(
        await Promise.all(markers.map(marker => fs.readFile(path.join(configRoot, 'files', marker), 'utf8'))),
      )
      await pruneCache(cacheDir, processed)
    }
  } finally {
    await rimraf(root)
  }
}

async function recordProcessed(cacheDir, cacheKey, session) {
  if (!session) return

  const configRoot = path.join(getGcRoot(session), hash(cacheDir))
  const filesRoot = path.join(configRoot, 'files')
  await mkdirp(filesRoot)
  await writeFileAtomic(path.join(configRoot, 'config.json'), JSON.stringify({ cacheDir }))
  await writeFileAtomic(path.join(filesRoot, hash(cacheKey)), cacheKey)
}

async function pruneCache(cacheDir, processed) {
  const parent = path.dirname(cacheDir)
  await mkdirp(parent)
  const temp = await fs.mkdtemp(path.join(parent, '.next-img-gc-'))

  try {
    try {
      await fs.rename(cacheDir, path.join(temp, 'cache'))
    } catch (error) {
      if (error.code !== 'ENOENT') throw error
      await mkdirp(path.join(temp, 'cache'))
    }

    await mkdirp(cacheDir)
    for (const cacheKey of processed) {
      const source = resolveWithin(path.join(temp, 'cache'), cacheKey)
      const target = resolveWithin(cacheDir, cacheKey)
      await mkdirp(path.dirname(target))
      await fs.rename(source, target)
    }
  } finally {
    await rimraf(temp)
  }
}

function getGcRoot(session) {
  return path.join(os.tmpdir(), 'next-img-gc', hash(session))
}

function hash(value) {
  return crypto.createHash('sha256').update(value).digest('hex')
}

function resolveWithin(root, fileName) {
  const target = path.resolve(root, fileName)
  const relative = path.relative(root, target)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`next-img generated an unsafe file path: ${fileName}`)
  }
  return target
}

async function writeFileAtomic(target, data) {
  const temp = `${target}.${process.pid}.${crypto.randomBytes(6).toString('hex')}.tmp`
  await fs.writeFile(temp, data)
  try {
    await fs.rename(temp, target)
  } catch (error) {
    if (!['EEXIST', 'EPERM'].includes(error.code)) throw error
    await fs.rm(target, { force: true })
    await fs.rename(temp, target)
  } finally {
    await fs.rm(temp, { force: true })
  }
}

module.exports = { cached, gc, stage }
