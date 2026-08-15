const path = require('path')
const os = require('os')
const crypto = require('crypto')
const fs = require('fs/promises')
const sharp = require('sharp')
const debug = require('debug')('next-img')
const pending = new Map()

async function cached(create, cacheKey, config, progressMessage) {
  const cacheDir = getCacheDir(config)
  const target = path.join(cacheDir, cacheKey)

  let cachedImage
  try {
    const data = await fs.readFile(target)
    const info = await sharp(data).metadata()
    const format = info.mediaType === 'image/avif' ? 'avif' : info.format
    cachedImage = { data, width: info.width, height: info.height, format }
  } catch {}

  if (cachedImage) {
    debug(`Cache hit ${cacheKey}`)
    await recordUsed(cacheDir, cacheKey, config.rebuildSession)
    return cachedImage
  }

  if (config.failOnCacheMiss && !config.rebuildSession) {
    throw new Error(`Missing an optimised image ${cacheKey}. Make sure to rerun next-img.`)
  }

  let operation = pending.get(target)
  if (!operation) {
    console.log(progressMessage)
    debug(`Cache miss ${cacheKey}`)
    operation = (async () => {
      const ts = Date.now()
      const processed = await create()
      await fs.mkdir(cacheDir, { recursive: true })
      await writeFileAtomic(target, processed.data)
      debug(`Processed ${cacheKey} in ${Date.now() - ts}ms`)
      return processed
    })()
    pending.set(target, operation)
    operation.then(
      () => pending.delete(target),
      () => pending.delete(target),
    )
  }
  const processed = await operation
  await recordUsed(cacheDir, cacheKey, config.rebuildSession)
  return processed
}

async function read(cacheKey, config) {
  return fs.readFile(resolveWithin(getCacheDir(config), cacheKey))
}

async function stage(fileName, data, config) {
  const stageDir = path.resolve(config.assetStageDir)
  const target = resolveWithin(stageDir, fileName)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await writeFileAtomic(target, data)
  await recordUsed(stageDir, fileName, config.rebuildSession)
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
      const config = JSON.parse(await fs.readFile(path.join(configRoot, 'config.json'), 'utf8'))
      const storeDir = config.storeDir || config.cacheDir
      const markers = await fs.readdir(path.join(configRoot, 'files'))
      const used = new Set(
        await Promise.all(markers.map(marker => fs.readFile(path.join(configRoot, 'files', marker), 'utf8'))),
      )
      await pruneStore(storeDir, used)
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
}

async function discardGcSession(session) {
  if (session) await fs.rm(getGcRoot(session), { recursive: true, force: true })
}

async function recordUsed(storeDir, fileName, session) {
  if (!session) return

  const configRoot = path.join(getGcRoot(session), hash(storeDir))
  const filesRoot = path.join(configRoot, 'files')
  await fs.mkdir(filesRoot, { recursive: true })
  await writeFileAtomic(path.join(configRoot, 'config.json'), JSON.stringify({ storeDir }))
  await writeFileAtomic(path.join(filesRoot, hash(fileName)), fileName)
}

async function pruneStore(storeDir, used) {
  const files = await listFiles(storeDir)
  for (const fileName of files) {
    if (!used.has(fileName)) {
      await fs.rm(resolveWithin(storeDir, fileName), { force: true })
    }
  }
  await removeEmptyDirectories(storeDir)
}

async function listFiles(root, relativeDir = '') {
  const directory = path.join(root, relativeDir)
  let entries
  try {
    entries = await fs.readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return []
    throw error
  }

  const files = []
  for (const entry of entries) {
    const relativePath = path.join(relativeDir, entry.name)
    if (entry.isDirectory()) files.push(...(await listFiles(root, relativePath)))
    else if (entry.isFile()) files.push(relativePath)
  }
  return files
}

async function removeEmptyDirectories(root, relativeDir = '') {
  const directory = path.join(root, relativeDir)
  let entries
  try {
    entries = await fs.readdir(directory, { withFileTypes: true })
  } catch (error) {
    if (error.code === 'ENOENT') return
    throw error
  }

  for (const entry of entries.filter(entry => entry.isDirectory())) {
    await removeEmptyDirectories(root, path.join(relativeDir, entry.name))
  }
  if (relativeDir && (await fs.readdir(directory)).length === 0) await fs.rmdir(directory)
}

function getGcRoot(session) {
  return path.join(os.tmpdir(), 'next-img-gc', hash(session))
}

function getCacheDir(config) {
  return config.persistentCache
    ? path.join(config.dir, config.persistentCacheDir)
    : path.join(config.dir, config.distDir, config.cacheDir)
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

module.exports = { cached, discardGcSession, gc, read, stage }
