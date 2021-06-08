const { cosmiconfigSync } = require('cosmiconfig')
const fs = require('fs')

const getFileContent = (file) => fs.readFileSync(file, { encoding: 'utf-8' })
const createRegExp = (pattern) => new RegExp(pattern)

const getConfigLoader = (configName) =>
  cosmiconfigSync(configName, {
    searchPlaces: [
      'package.json',
      `.${configName}rc`,
      `.${configName}rc.json`,
      `.${configName}rc.js`,
      `${configName}.config.js`
    ]
  })

module.exports = {
  getConfigLoader,
  getFileContent,
  createRegExp
}
