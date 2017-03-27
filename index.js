'use strict'

const ip = '192.168.1.106'
const port = 54321
const dgram = require('dgram')
const { Packet } = require('./packet')

const server = dgram.createSocket('udp4')

let connected = false
const commands = {
  start: { method: 'set_power', params: ['on'] },
  pause: { method: 'set_power', params: ['off'] },
  sleep: { method: 'set_mode', params: ['silent'] },
  auto: { method: 'set_mode', params: ['auto'] },
  favorite: { method: 'set_mode', params: ['favorite'] },
  buzzer: { method: 'set_buzzer', params: ['on'] },
  silent: { method: 'set_buzzer', params: ['off'] },
  lightbright: { method: 'set_led_b', params: [0] },
  lightdim: { method: 'set_led_b', params: [1] },
  lightoff: { method: 'set_led_b', params: [2] },
  level1: { method: 'set_level_favorite', params: [0] },
  level2: { method: 'set_level_favorite', params: [5] },
  level3: { method: 'set_level_favorite', params: [10] }
}
// sendCommand(commands.lightoff)

let queue = []
const packet = new Packet()

function sendCommand (cmd) {
  queue.push(cmd)
  packet.reset()
  const raw = packet.getRaw()
  server.send(raw, 0, raw.length, port, ip, function (err) {
    if (err) throw err
  })
}

function sendPing () {
  const command = {
    method: 'get_prop',
    params: [
      'aqi',
      'led',
      'mode',
      'filter1_life',
      'buzzer',
      'favorite_level',
      'temp_dec',
      'humidity',
      'motor1_speed',
      'led_b',
      'child_lock',
      'use_time',
      'purify_volume',
      'act_sleep',
      'sleep_mode',
      'sleep_data_num',
      'sleep_time',
      'average_aqi',
      'app_extra'
    ]
  }

  sendCommand(command)
}

server.on('error', function (err) {
  if (err) throw err
})

server.on('message', function (msg, rinfo) {
  if (rinfo.port === port) {
    if (msg.length === 32) {
      packet.setRaw(msg)
      if (!connected) {
        connected = true
        packet.setToken(packet.checksum)
      }

      if (queue.length > 0) {
        packet.setPlainData(Object.assign(
          { id: packet.msgCounter++
          }, queue.pop()
        ))
        queue = []

        const cmdraw = packet.getRaw()
        server.send(cmdraw, 0, cmdraw.length, port, ip, function (err) {
          if (err) throw err
        })
      }
    } else {
      packet.setRaw(msg)
      const res = JSON.parse(packet.getPlainData())
      console.log('OMFG <<< ', res)
    }
  }
})

server.on('listening', function () {
  const address = server.address()
  console.log('server started on ' + address.address + ':' + address.port)
})

server.bind(53421)

sendPing()
setInterval(sendPing, 20000)
