// Do this as the first thing so that any code reading it knows the right env.
const isProd = process.argv.find((x) => x.toLowerCase() === '--prod')

process.env.BABEL_ENV = isProd ? 'production' : 'development'
process.env.NODE_ENV = isProd ? 'production' : 'development'

// Makes the script crash on unhandled rejections instead of silently
// ignoring them. In the future, promise rejections that are not handled will
// terminate the Node.js process with a non-zero exit code.
process.on('unhandledRejection', (err) => { throw err })
// Ensure environment variables are read.
require('../config/env')

const bfj = require('bfj')
const fs = require('fs-extra')
const path = require('path')
const { checkBrowsers } = require('react-dev-utils/browsersHelper')
const chalk = require('react-dev-utils/chalk')
const FileSizeReporter = require('react-dev-utils/FileSizeReporter')
const printBuildError = require('react-dev-utils/printBuildError')
const printHostingInstructions = require('react-dev-utils/printHostingInstructions')
const webpack = require('webpack')

const paths = require('../config/paths')
const configFactory = require('../config/webpack.config')
const checkRequiredFiles = require('./checkRequiredFiles')
const formatWebpackMessages = require('./formatWebpackMessages')

console.log(chalk.green('process.env.BABEL_ENV'), chalk.yellow(process.env.BABEL_ENV))
console.log(chalk.green('process.env.NODE_ENV'), chalk.yellow(process.env.NODE_ENV))

const { measureFileSizesBeforeBuild } = FileSizeReporter
const { printFileSizesAfterBuild } = FileSizeReporter
const useYarn = fs.existsSync(paths.yarnLockFile)

// These sizes are pretty large. We'll warn for bundles exceeding them.
const WARN_AFTER_BUNDLE_GZIP_SIZE = 512 * 1024
const WARN_AFTER_CHUNK_GZIP_SIZE = 1024 * 1024

const isInteractive = process.stdout.isTTY

// Warn and crash if required files are missing
if (!checkRequiredFiles([paths.appHtml, paths.appIndexJs()])) {
  process.exit(1)
}

const argv = process.argv.slice(2)
const writeStatsJson = argv.indexOf('--stats') !== -1

let webpackConfig = {}

try {
  webpackConfig = require(paths.localWebpackConfig)
} catch (e) {
  console.error(e)
}

// Generate configuration
const config = configFactory(process.env.NODE_ENV, webpackConfig)

// Create the production build and print the deployment instructions.
function build(previousFileSizes) {
  const devText = 'Creating an development build...'
  const prodText = 'Creating an optimized production build...'
  console.log(isProd ? prodText : devText)

  const compiler = webpack(config)
  return new Promise((resolve, reject) => {
    compiler.run((err, stats) => {
      let messages
      if (err) {
        if (!err.message) {
          return reject(err)
        }

        let errMessage = err.message

        // Add additional information for postcss errors
        if (Object.prototype.hasOwnProperty.call(err, 'postcssNode')) {
          errMessage += `\nCompileError: Begins at CSS selector ${err.postcssNode.selector}`
        }

        messages = formatWebpackMessages({
          errors: [errMessage],
          warnings: []
        })
      } else {
        messages = formatWebpackMessages(stats.toJson({ all: false, warnings: true, errors: true }))
      }
      if (messages.errors.length) {
        // Only keep the first error. Others are often indicative
        // of the same problem, but confuse the reader with noise.
        if (messages.errors.length > 1) {
          messages.errors.length = 1
        }
        return reject(new Error(messages.errors.join('\n\n')))
      }
      if (
        process.env.CI &&
        (typeof process.env.CI !== 'string' || process.env.CI.toLowerCase() !== 'false') &&
        messages.warnings.length
      ) {
        console.log(
          chalk.yellow(
            // eslint-disable-next-line no-useless-concat
            '\nTreating warnings as errors because process.env.CI = true.\n' + 'Most CI servers set it automatically.\n'
          )
        )
        return reject(new Error(messages.warnings.join('\n\n')))
      }

      const resolveArgs = {
        stats,
        previousFileSizes,
        warnings: messages.warnings
      }

      if (writeStatsJson) {
        return bfj
          .write(`${paths.appBuild}/bundle-stats.json`, stats.toJson())
          .then(() => resolve(resolveArgs))
          .catch((error) => reject(new Error(error)))
      }

      return resolve(resolveArgs)
    })
  })
}

function copyPublicFolder() {
  fs.copySync(paths.appPublic, paths.appBuild, {
    dereference: true,
    filter: (file) => file !== paths.appHtml
  })
}

// We require that you explicitly set browsers and do not fall back to
// browserslist defaults.
const buildApp = () =>
  checkBrowsers(paths.appPath, isInteractive)
    .then(() => {
      // First, read the current file sizes in build directory.
      // This lets us display how much they changed later.
      return measureFileSizesBeforeBuild(paths.appBuild)
    })
    .then((previousFileSizes) => {
      // Remove all content but keep the directory so that
      // if you're in it, you don't end up in Trash
      fs.emptyDirSync(paths.appBuild)
      // Merge with the public folder
      copyPublicFolder()
      // Start the webpack build
      return build(previousFileSizes)
    })
    .then(
      ({ stats, previousFileSizes, warnings }) => {
        if (warnings.length) {
          console.log(chalk.yellow('Compiled with warnings.\n'))
          console.log(warnings.join('\n\n'))
          console.log(`\nSearch for the ${chalk.underline(chalk.yellow('keywords'))} to learn more about each warning.`)
          console.log(`To ignore, add ${chalk.cyan('// eslint-disable-next-line')} to the line before.\n`)
        } else {
          console.log(chalk.green('Compiled successfully.\n'))
        }

        console.log('File sizes after gzip:\n')
        printFileSizesAfterBuild(
          stats,
          previousFileSizes,
          paths.appBuild,
          WARN_AFTER_BUNDLE_GZIP_SIZE,
          WARN_AFTER_CHUNK_GZIP_SIZE
        )
        console.log()

        const appPackage = require(paths.appPackageJson)
        const publicUrl = paths.publicUrlOrPath
        const { publicPath } = config.output
        const buildFolder = path.relative(process.cwd(), paths.appBuild)
        printHostingInstructions(appPackage, publicUrl, publicPath, buildFolder, useYarn)
      },
      (err) => {
        const tscCompileOnError = process.env.TSC_COMPILE_ON_ERROR === 'true'
        if (tscCompileOnError) {
          console.log(
            chalk.yellow(
              'Compiled with the following type errors (you may want to check these before deploying your app):\n'
            )
          )
          printBuildError(err)
        } else {
          console.log(chalk.red('Failed to compile.\n'))
          printBuildError(err)
          process.exit(1)
        }
      }
    )
    .catch((err) => {
      if (err && err.message) {
        console.log(err.message)
      }
      process.exit(1)
    })

module.exports = { buildApp }
