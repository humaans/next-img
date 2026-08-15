const path = require('path')
const withImg = require('../../../plugin')

module.exports = withImg({
  output: 'export',
  nextImg: {
    persistentCache: false,
    projectDir: __dirname,
  },
  turbopack: {
    root: path.join(__dirname, '../../..'),
  },
})
