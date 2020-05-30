const path = require('path')
const withPlugins = require('next-compose-plugins')
const img = require('../plugin')

module.exports = withPlugins([img], {
  webpack: (config, options) => {
    config.resolve.alias.react = path.join(__dirname, 'node_modules', 'react')
    config.resolve.alias['react-dom'] = path.join(__dirname, 'node_modules', 'react-dom')

    if (options.isServer) {
      config.externals = ['react', 'react-dom']
    }

    return config
  },
})
