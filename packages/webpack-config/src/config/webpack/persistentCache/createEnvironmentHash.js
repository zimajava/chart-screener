/* eslint-disable @typescript-eslint/no-var-requires */
const { createHash } = require('crypto')

module.exports = (env) => {
  const hash = createHash('md4')
  hash.update(JSON.stringify(env))

  return hash.digest('hex')
}
