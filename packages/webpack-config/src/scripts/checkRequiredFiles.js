const chalk = require('chalk')
const fs = require('fs')
const path = require('path')

function checkRequiredFiles(files, silent = false) {
  let currentFilePath
  try {
    files.forEach((filePath) => {
      currentFilePath = filePath
      fs.accessSync(filePath, fs.F_OK)
    })
    return true
  } catch (err) {
    const dirName = path.dirname(currentFilePath)
    const fileName = path.basename(currentFilePath)

    if (!silent) {
      console.log(chalk.red('Could not find a required file.'))
      console.log(chalk.red('  Name: ') + chalk.cyan(fileName))
      console.log(chalk.red('  Searched in: ') + chalk.cyan(dirName))
    }

    return false
  }
}

module.exports = checkRequiredFiles
