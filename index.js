'use strict';

var ip = '192.168.1.106';
var dgram     = require('dgram');
var miHome    = require("./mihomepacket");

var server    = dgram.createSocket('udp4');

var connected = false;
var commands  = {};
var pingInterval;
var message = "";
var lastmessageid = 0;
var lastmessagetype = "";
var packet = new miHome.Packet();

var pingTimeout = null;

function sendCommand(cmd, callback) {
  message=cmd;
  packet.setHelo();
  var cmdraw=packet.getRaw()
  server.send(cmdraw, 0, cmdraw.length, 54321, ip, function (err) {
      if (typeof callback === 'function') callback(err)
  });
}


function sendPing() {
    pingTimeout = setTimeout(function () {
        pingTimeout = null;
        if (connected) {
            connected = false;
        }
    }, 3000);

    try {
        lastmessagetype="status";
        sendCommand('"method":"get_prop","params":["aqi","led","mode","filter1_life","buzzer","favorite_level","temp_dec","humidity","motor1_speed","led_b","child_lock","use_time","purify_volume","act_sleep","sleep_mode","sleep_data_num","sleep_time","average_aqi","app_extra"]', function (err) {
            if (err) adapter.log.error('Cannot send ping: ' + err)
        });
    } catch (e) {
        clearTimeout(pingTimeout);
        pingTimeout = null;
        if (connected) {
            connected = false;
        }
        console.error(e);
    }

}

function str2hex(str) {
    str = str.replace(/\s/g, '');
    var buf = new Buffer(str.length / 2);

    for (var i = 0; i < str.length / 2; i++) {
        buf[i] = parseInt(str[i * 2] + str[i* 2 + 1], 16);
    }
    return buf;
}

function main() {
    commands = {
        start:  '"method":"set_power","params":["on"]',
        pause:  '"method":"set_power","params":["off"]',
        //start:  '"method":"app_start"',
        //pause:  '"method":"app_pause"',
        home:   '"method":"app_charge"',
        find:   '"method":"find_me","params":[""]',
        level1: '"method":"set_custom_mode","params":[38]',
        level2: '"method":"set_custom_mode","params":[60]',
        level3: '"method":"set_custom_mode","params":[77]'
    };

    server.on('error', function (err) {
        server.close();
        process.exit();
    });

    server.on('message', function (msg, rinfo) {
        if (rinfo.port === 54321) {
            if (msg.length === 32) {
                packet.setRaw(msg);
                clearTimeout(pingTimeout);
                pingTimeout = null;
                if (!connected) {
                    connected = true;
                    packet.setToken(packet.checksum);
                }

                if (message.length>0) {
                    try {
                        lastmessageid = packet.msgCounter;
                        packet.setPlainData('{"id":'+lastmessageid+','+message+'}');
                        packet.msgCounter++;
                        var cmdraw=packet.getRaw();
                        message="";
                        server.send(cmdraw, 0, cmdraw.length, 54321, ip, function (err) {
                            if (typeof callback === 'function') callback(err);
                        });
                    } catch (err) {
                        if (typeof callback === 'function') callback(err);
                    }
                }
            } else {
		//hier die Antwort zum decodieren
                packet.setRaw(msg);
                var packetObj = JSON.parse(packet.getPlainData());
                if (lastmessageid==packetObj['id']) {
                    if (lastmessagetype==="status") {
                        if (packetObj['result'][2]==="idle") {
                            console.log("****** Power off  *********");
                        } else {
                            console.log("****** Power ON  *********");
                        }
                    }
                }
                lastmessagetype="";
                console.log('["aqi","led","mode","filter1_life","buzzer","favorite_level","temp_dec","humidity","motor1_speed","led_b","child_lock","use_time","purify_volume","act_sleep","sleep_mode","sleep_data_num","sleep_time","average_aqi","app_extra"]');
                console.log('OMFG <<< '+packet.getPlainData())
            }
        }
    });

    server.on('listening', function () {
        var address = server.address();
        console.log('server started on ' + address.address + ':' + address.port);
    });

    server.bind(53421);

    sendPing();
    pingInterval = setInterval(sendPing, 20000);
}

main();
