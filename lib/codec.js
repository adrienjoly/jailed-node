'use strict';

var msgpack = require('msgpack-lite')

exports.encode = function encode(obj) {
  return msgpack.encode(obj).toString('base64').replace(/[\=]+$/, '')
}

exports.decode = function encode(str) {
  return msgpack.decode(new Buffer(str, 'base64'))
}
