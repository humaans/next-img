const os = require('os')

const concurrency = Math.max(os.cpus().length - 1, 1)

module.exports = function queue() {
  const q = []
  let processing = 0

  async function next() {
    if (!q.length || processing >= concurrency) {
      return
    }

    const n = q.shift()

    processing += 1
    setTimeout(next, 1)

    try {
      const res = await n.fn()
      n.resolve(res)
    } catch (err) {
      n.reject(err)
    }

    processing -= 1
    setTimeout(next, 1)
  }

  return function add(fn) {
    return new Promise((resolve, reject) => {
      q.push({ resolve, reject, fn })
      next()
    })
  }
}
