const crypto = require('crypto')

class Packet {
  constructor () {
    this.magic = Buffer.alloc(2, '2131', 'hex')
    this.len = Buffer.alloc(2, '0020', 'hex')
    this.unknown = Buffer.alloc(4, 'FFFFFFFF', 'hex')
    this.serial = Buffer.alloc(4, 'FFFFFFFF', 'hex')
    this.stamp = Buffer.alloc(4, 'FFFFFFFF', 'hex')
    this.checksum = Buffer.alloc(16, 'FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF', 'hex')
    this.data = Buffer.alloc(0)
    this.token = Buffer.alloc(16)
    this.key = Buffer.alloc(16)
    this.iv = Buffer.alloc(16)
    this.host = ''
    this.port = 54321
    this.plainMessageOut = ''
  }

  reset() {
    this.magic = Buffer.from('2131','hex');
    this.len = Buffer.from('0020','hex');
    this.unknown = Buffer.from('FFFFFFFF','hex');
    this.serial = Buffer.from('FFFFFFFF','hex');
    this.stamp = Buffer.from('FFFFFFFF','hex');
    this.checksum = Buffer.from('FFFFFFFFFFFFFFFFFFFFFFFFFFFFFFFF','hex');
    this.data = Buffer.from(0);
  }

  setRaw (raw) {
    var rawhex = raw.toString('hex')

    this.magic = Buffer.from(rawhex.substr(0, 4), 'hex')
    this.len = Buffer.from(rawhex.substr(4, 4), 'hex')
    this.unknown = Buffer.from(rawhex.substr(8, 8), 'hex')
    this.serial = Buffer.from(rawhex.substr(16, 8), 'hex')
    this.stamp = Buffer.from(rawhex.substr(24, 8), 'hex')
    this.checksum = Buffer.from(rawhex.substr(32, 32), 'hex')
    this.data = Buffer.from(rawhex.substr(64), 'hex')

    if (this.data.length === 0) {
      this.token = this.checksum
    }
  }

  setPlainData (plainData) {
    var cipher = crypto.createCipheriv('aes-128-cbc', this.key, this.iv)
    var crypted = cipher.update(plainData, 'utf8', 'binary')

    crypted += cipher.final('binary')
    crypted = new Buffer(crypted, 'binary')
    this.data = crypted
  }

  getPlainData () {
    var decipher = crypto.createDecipheriv('aes-128-cbc', this.key, this.iv)
    var dec = decipher.update(this.data, 'binary', 'utf8')

    dec += decipher.final('utf8')
    return dec
  }

  _md5 (data) {
    return new Buffer(crypto.createHash('md5').update(data).digest('hex'), 'hex')
  }

  decimalToHex (decimal, chars) {
    return (decimal + Math.pow(16, chars)).toString(16).slice(-chars).toUpperCase()
  }

  getRaw () {
    if (this.data.length > 0) {
      this.len = Buffer(this.decimalToHex(this.data.length + 32, 4), 'hex')
      var raw = Buffer(this.magic.toString('hex') + this.len.toString('hex') + this.unknown.toString('hex') + this.serial.toString('hex') + this.stamp.toString('hex') + this.token.toString('hex') + this.data.toString('hex'), 'hex')
      this.checksum = this._md5(raw)
    }
    return (Buffer(this.magic.toString('hex') + this.len.toString('hex') + this.unknown.toString('hex') + this.serial.toString('hex') + this.stamp.toString('hex') + this.checksum.toString('hex') + this.data.toString('hex'), 'hex'))
  }

  setToken (token) {
    this.token = token
    this.key = this._md5(this.token)
    this.iv = this._md5(new Buffer(this.key.toString('hex') + this.token.toString('hex'), 'hex'))
  }
}

module.exports = Packet

const packet = new Packet()
const server = require('dgram').createSocket('udp4')

server.on('message', (message, info) => {
  if (info.port === 54321) {
    packet.setRaw(message)
    console.log(message)
  }
})
server.on('listening', () => {
  const raw = packet.getRaw()
  server.send(raw, 0, raw.length, '54321', '192.168.1.106')
});

server.bind(54322)
