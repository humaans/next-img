const path = require('path')
const os = require('os')
const crypto = require('crypto')
const fs = require('fs/promises')
const sharp = require('sharp')
const debug = require('debug')('next-img')
const { getCacheConfig } = require('./cache-config')
const { normalizeSharpFormat } = require('./formats')
const pending = new Map()
const manifests = new Map()
const warnedProcessing = new Set()
const MANIFEST_FILE = '.next-img-cache.json'

async function cached(create, cacheKey, config, progressMessage) {
  const store = resolveStore(config)
  const cacheDir = store.dir
  const target = path.join(cacheDir, cacheKey)
  const manifest = store.persistent && config.processing ? await readManifest(cacheDir) : null
  const processingChanged = Boolean(
    store.persistent && config.processing && !sameProcessing(manifest?.processing, config.processing),
  )
  const refresh = Boolean(store.rebuilding && processingChanged)

  let cachedImage
  if (!refresh) {
    try {
      const data = await fs.readFile(target)
      const info = await sharp(data).metadata()
      const format = normalizeSharpFormat(info)
      cachedImage = { data, width: info.width, height: info.height, format }
    } catch {}
  }

  if (cachedImage) {
    debug(`Cache hit ${cacheKey}`)
    if (processingChanged && !store.rebuilding) warnProcessingChanged(cacheDir, config)
    await recordUsed(cacheDir, cacheKey, store.rebuildSession, config.processing)
    return cachedImage
  }

  if (store.readOnly && !store.rebuilding) {
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
  await recordUsed(cacheDir, cacheKey, store.rebuildSession, config.processing)
  return processed
}

async function read(cacheKey, config) {
  const store = resolveStore(config)
  return fs.readFile(resolveWithin(store.dir, cacheKey))
}

async function stage(fileName, data, config) {
  const stageDir = path.resolve(config.assetStageDir)
  const target = resolveWithin(stageDir, fileName)
  await fs.mkdir(path.dirname(target), { recursive: true })
  await writeFileAtomic(target, data)
  await recordUsed(stageDir, fileName, getCacheConfig(config).rebuildSession)
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
      if (config.processing) used.add(MANIFEST_FILE)
      await pruneStore(storeDir, used)
      if (config.processing) await writeManifest(storeDir, config.processing)
    }
  } finally {
    await fs.rm(root, { recursive: true, force: true })
  }
}

async function discardGcSession(session) {
  if (session) await fs.rm(getGcRoot(session), { recursive: true, force: true })
}

async function recordUsed(storeDir, fileName, session, processing) {
  if (!session) return

  const configRoot = path.join(getGcRoot(session), hash(storeDir))
  const filesRoot = path.join(configRoot, 'files')
  await fs.mkdir(filesRoot, { recursive: true })
  await writeFileAtomic(path.join(configRoot, 'config.json'), JSON.stringify({ storeDir, processing }))
  await writeFileAtomic(path.join(filesRoot, hash(fileName)), fileName)
}

function readManifest(cacheDir) {
  let manifest = manifests.get(cacheDir)
  if (!manifest) {
    manifest = fs
      .readFile(path.join(cacheDir, MANIFEST_FILE), 'utf8')
      .then(JSON.parse)
      .catch(() => null)
    manifests.set(cacheDir, manifest)
  }
  return manifest
}

async function writeManifest(cacheDir, processing) {
  const manifest = { version: 1, processing }
  await fs.mkdir(cacheDir, { recursive: true })
  await writeFileAtomic(path.join(cacheDir, MANIFEST_FILE), `${JSON.stringify(manifest, null, 2)}\n`)
  manifests.set(cacheDir, Promise.resolve(manifest))
}

function sameProcessing(previous, current) {
  return previous && JSON.stringify(previous) === JSON.stringify(current)
}

function warnProcessingChanged(cacheDir, config) {
  if (warnedProcessing.has(cacheDir)) return
  warnedProcessing.add(cacheDir)
  const warn = config.warn || console.warn
  warn('next-img cache uses a different processing pipeline or Sharp toolchain. Run `next-img` to refresh it in place.')
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

function resolveStore(config) {
  const cache = getCacheConfig(config)
  const persistent = cache.mode !== 'off'
  return {
    dir: persistent ? path.join(config.dir, cache.dir) : path.join(config.dir, config.distDir, config.cacheDir),
    persistent,
    readOnly: cache.mode === 'read-only',
    rebuilding: Boolean(cache.rebuildSession),
    rebuildSession: cache.rebuildSession,
  }
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
