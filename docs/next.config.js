const path = require('path')
const withPlugins = require('next-compose-plugins')
const withNextImg = require('../plugin')

const isProduction = process.env.NODE_ENV === 'production'

module.exports = withPlugins([withNextImg], {
  assetPrefix: isProduction ? '/next-img' : '',
  webpack: (config, options) => {
    config.resolve.alias.react = path.join(__dirname, 'node_modules', 'react')
    config.resolve.alias['react-dom'] = path.join(__dirname, 'node_modules', 'react-dom')
    config.resolve.alias['next-img'] = path.join(__dirname, '..')

    if (options.isServer) {
      config.externals = ['react', 'react-dom']
    }

    return config
  },
})
