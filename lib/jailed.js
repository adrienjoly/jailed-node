'use strict'

/**
 * @fileoverview Jailed - safe yet flexible sandbox
 * @version 0.2.0
 *
 * @license MIT, see http://github.com/asvd/jailed
 * Copyright (c) 2014 asvd <heliosframework@gmail.com>
 *
 * Main library script, the only one to be loaded by a developer into
 * the application. Other scrips shipped along will be loaded by the
 * library either here (application site), or into the plugin site
 * (Worker/child process):
 */

var Plugin = require('./Plugin')
  , StaticScript = require('./StaticScript')
  , DynamicScript = require('./DynamicScript')

exports.Plugin = function(url, _interface) {
  return new Plugin(new StaticScript(url), _interface)
}

exports.DynamicPlugin = function(code, _interface) {
  return new Plugin(new DynamicScript(code), _interface)
}
