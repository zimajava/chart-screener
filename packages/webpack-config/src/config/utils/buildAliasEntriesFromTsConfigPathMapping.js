/* eslint-disable @typescript-eslint/no-var-requires */
const path = require('path')

const { resolveFullTsConfig } = require('./TypescriptConfigUtils')

const buildAliasEntriesFromTsConfigPathMapping = ({ dirname, tsConfigPath, excludePaths }) => {
  if (!dirname) {
    throw new Error('`dirname` is required to build Webpack module aliases')
  }
  const tsConfig = resolveFullTsConfig(tsConfigPath)
  const paths = tsConfig?.compilerOptions?.paths
  const baseUrl = tsConfig?.compilerOptions?.baseUrl
  const basePath = baseUrl ? path.resolve(dirname, baseUrl) : dirname
  if (paths) {
    const aliases = {}
    Object.entries(paths).forEach(([key, value]) => {
      if (excludePaths.includes(key)) {
        return
      }
      const alias =
        key.includes('/*') || key.includes('*')
          ? key.replace('/*', '').replace('*', '')
          : // If the path mapping is an exact match, add a trailing `$`
            // See https://webpack.js.org/configuration/resolve/#resolvealias
            `${key}$`
      const replacement = (Array.isArray(value) ? value : [value]).map((val) =>
        // webpack does not need do exact replacement so wildcard '*' is not needed
        val.replace('*', '')
      )
      aliases[alias] = replacement.map((val) => path.resolve(basePath, val))
    })
    return aliases
  }
  return {}
}

module.exports = {
  buildAliasEntriesFromTsConfigPathMapping
}
