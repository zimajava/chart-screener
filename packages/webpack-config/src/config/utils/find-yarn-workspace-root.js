const fs = require('fs')
const micromatch = require('micromatch')
const path = require('path')

function extractWorkspaces(manifest) {
  const { workspaces } = manifest || {}
  return (workspaces && workspaces.packages) || (Array.isArray(workspaces) ? workspaces : null)
}

function readPackageJSON(dir) {
  const file = path.join(dir, 'package.json')
  if (fs.existsSync(file)) {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  }
  return null
}

function findWorkspaceRoot(initial) {
  if (!initial) {
    // eslint-disable-next-line no-param-reassign
    initial = process.cwd()
  }
  let previous = null
  let current = path.normalize(initial)

  do {
    const manifest = readPackageJSON(current)
    const workspaces = extractWorkspaces(manifest)

    if (workspaces) {
      const relativePath = path.relative(current, initial)
      if (relativePath === '' || micromatch([relativePath], workspaces).length > 0) {
        return current
      }
      return null
    }

    previous = current
    current = path.dirname(current)
  } while (current !== previous)

  return null
}

module.exports = { findWorkspaceRoot }
