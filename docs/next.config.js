const path = require('path')
const withNextImg = require('../plugin')

const isProduction = process.env.NODE_ENV === 'production'

module.exports = withNextImg({
  assetPrefix: isProduction ? '/next-img' : '',
  webpack: (config, options) => {
    config.resolve.alias.react = path.join(__dirname, 'node_modules', 'react')
    config.resolve.alias['react-dom'] = path.join(__dirname, 'node_modules', 'react-dom')
    config.resolve.alias['next-img'] = path.join(__dirname, '..')
    return config
  },
})
