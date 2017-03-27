const crypto = require('crypto')

class Packet {
  constructor () {
    this.magic = Buffer.alloc(2)
    this.len = Buffer.alloc(2)
    this.unknown = Buffer.alloc(4)
    this.serial = Buffer.alloc(4)
    this.stamp = Buffer.alloc(4)
    this.checksum = Buffer.alloc(16)
    this.data = Buffer.alloc(0)
    this.token = Buffer.alloc(16)
    this.key = Buffer.alloc(16)
    this.iv = Buffer.alloc(16)
    this.host = ''
    this.port = 54321
    this.plainMessageOut = ''

    // Message Counter
    this.msgCounter = 1

    this.reset()
  }

  reset () {
    this.magic = Buffer.from('2131', 'hex')
    this.len = Buffer.from('0020', 'hex')
    this.unknown = Buffer.from('FFFFFFFF', 'hex')
    this.serial = Buffer.from('FFFFFFFF', 'hex')
    this.stamp = Buffer.from('FFFFFFFF', 'hex')
    this.checksum = Buffer.from('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', 'hex')
    this.data = Buffer.alloc(0)
  }

  getRaw () {
    if (this.data.length > 0) {
      this.len.writeInt16BE(this.data.length + 32)
      const raw = Buffer.concat([
        this.magic,
        this.len,
        this.unknown,
        this.serial,
        this.stamp,
        this.token,
        this.data
      ])
      this.checksum = this._md5(raw)
    }
    return Buffer.concat([
      this.magic,
      this.len,
      this.unknown,
      this.serial,
      this.stamp,
      this.checksum,
      this.data
    ])
  }

  setRaw (raw) {
    this.magic = raw.slice(0, 2)
    this.len = raw.slice(2, 4)
    this.unknown = raw.slice(4, 8)
    this.serial = raw.slice(8, 12)
    this.stamp = raw.slice(12, 16)
    this.checksum = raw.slice(16, 32)
    this.data = raw.slice(32)

    if (this.data.length === 0) {
      this.token = this.checksum
    }
  }

  setPlainData (plainData) {
    if (typeof plainData !== 'string') plainData = JSON.stringify(plainData)
    const cipher = crypto.createCipheriv('aes-128-cbc', this.key, this.iv)
    let crypted = cipher.update(plainData, 'utf8', 'binary')
    crypted += cipher.final('binary')
    this.data = Buffer.from(crypted, 'binary')
  }

  getPlainData () {
    const decipher = crypto.createDecipheriv('aes-128-cbc', this.key, this.iv)
    let dec = decipher.update(this.data, 'binary', 'utf8')
    dec += decipher.final('utf8')
    return dec
  }

  _md5 (data) {
    return new Buffer(crypto.createHash('md5').update(data).digest('hex'), 'hex')
  }

  setToken (token) {
    this.token = token
    this.key = this._md5(this.token)
    this.iv = this._md5(Buffer.concat([ this.key, this.token ]))
  }
}

exports.Packet = Packet
