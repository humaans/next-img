const { Worker } = require('worker_threads')

module.exports = class {
  constructor(max = 1) {
    this._max = max
    this._queue = []
    this._workers = new Set()
  }

  async createWorker(filename, options, resolve, reject) {
    const self = this
    const { _queue, _workers } = this
    const worker = new Worker(filename, options)
    worker.on('message', message => {
      resolve(message)
      worker.terminate()
    })
    worker.on('error', error => {
      resolve(error)
      worker.terminate()
    })
    worker.on('exit', code => {
      _workers.delete(worker)
      if (_queue.length > 0) {
        const { filename, options, resolve, reject } = _queue.splice(0, 1)[0]
        self.createWorker(filename, options, resolve, reject)
      }
      if (code !== 0) {
        reject(new Error(`thread error. code: ${code}`))
      }
    })
    _workers.add(worker)
  }

  async run(filename, options) {
    const self = this
    const { _workers, _queue, _max } = this
    return new Promise((resolve, reject) => {
      if (_workers.size < _max) {
        self.createWorker(filename, options, resolve, reject)
      } else {
        _queue.push({
          filename,
          options,
          resolve,
          reject,
        })
      }
    })
  }
}
