const withPlugins = require('next-compose-plugins')
const img = require('../plugin')

module.exports = withPlugins([img])
