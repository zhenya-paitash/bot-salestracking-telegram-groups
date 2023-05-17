const crypto = require('crypto')

const myuuid = () => crypto.randomBytes(8).toString('hex')

module.exports = {
  myuuid,
}
