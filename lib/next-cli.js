const { spawn } = require('child_process')

module.exports = function runNextBuild({ dir, bundler, env }) {
  const nextBin = require.resolve('next/dist/bin/next', { paths: [dir] })
  const args = [nextBin, 'build', dir, `--${bundler}`]

  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, args, {
      env,
      stdio: 'inherit',
    })

    child.once('error', reject)
    child.once('exit', (code, signal) => {
      if (code === 0) {
        resolve()
        return
      }

      const status = signal ? `signal ${signal}` : `code ${code}`
      reject(new Error(`Next.js build exited with ${status}`))
    })
  })
}
