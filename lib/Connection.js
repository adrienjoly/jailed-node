'use strict'

module.exports = Connection

/**
 * Initializes the library site for web environment (loads
 * JailedSite.js)
 */

var debug = require('debug')('jailed:connection')
  , codec = require('./codec')
  , child_process = require('child_process')

/**
 * Platform-dependent implementation of the BasicConnection
 * object, initializes the plugin site and provides the basic
 * messaging-based connection with it
 *
 * For Node.js the plugin is created as a forked process
 */
function BasicConnection() {
  var _this = this

  this._disconnected = false
  this._messageHandler = function() {
  }
  this._disconnectHandler = function() {
  }

  var childArgs = []

  process.execArgv.forEach(function(arg) {
    if (arg.indexOf('--debug-brk') !== -1) {
      var _debugPort = parseInt(arg.substr(12)) + 1
      debug('Child process debugger listening on port %d', _debugPort)
      childArgs.push('--debug-brk=' + _debugPort)
    }
  })

  this._process = child_process.fork(__dirname + '/../sandbox/sandbox.js', childArgs)

  this._startHeartBeat()

  this._process.on('message', function(data) {
    var m = codec.decode(data);
    debug('Recibing message: %j', m)
    _this._messageHandler(m)
  })

  this._process.on('exit', function(m) {
    debug('Exit process: %j', m)
    _this._stopHeartBeat()
    _this._disconnected = true
    _this._disconnectHandler(m)
  })
}


/**
 * Sets-up the handler to be called upon the BasicConnection
 * initialization is completed.
 *
 * For Node.js the connection is fully initialized within the
 * constructor, so simply calls the provided handler.
 *
 * @param {Function} handler to be called upon connection init
 */
BasicConnection.prototype.whenInit = function(handler) {
  handler()
}

BasicConnection.prototype._startHeartBeat = function() {
  var _this = this

  function _heartBeat() {
    _this.send({'type': 'heartbeat'})
  }

  this._heartBeat = setInterval(_heartBeat, 5000)
}

BasicConnection.prototype._stopHeartBeat = function() {
  clearInterval(this._heartBeat)
}

/**
 * Sends a message to the plugin site
 *
 * @param {Object} data to send
 */
BasicConnection.prototype.send = function(data) {
  if (!this._disconnected) {
    debug('Sending data to process: ' + JSON.stringify(data))
    this._process.send(codec.encode(data))
  }
}


/**
 * Adds a handler for a message received from the plugin site
 *
 * @param {Function} handler to call upon a message
 */
BasicConnection.prototype.onMessage = function(handler) {
  this._messageHandler = function(data) {
    // broken stack would break the IPC in Node.js
    try {
      handler(data)
    } catch (e) {
      console.error('Error in BasicConnection:onMessage', e.stack)
    }
  }
}


/**
 * Adds a handler for the event of plugin disconnection
 * (= plugin process exit)
 *
 * @param {Function} handler to call upon a disconnect
 */
BasicConnection.prototype.onDisconnect = function(handler) {
  this._disconnectHandler = handler
}


/**
 * Disconnects the plugin (= kills the forked process)
 */
BasicConnection.prototype.disconnect = function() {
  this._process.kill('SIGKILL')
  this._disconnected = true
}

/**
 * Application-site Connection object constructon, reuses the
 * platform-dependent BasicConnection declared above in order to
 * communicate with the plugin environment, implements the
 * application-site protocol of the interraction: provides some
 * methods for loading scripts and executing the given code in the
 * plugin
 */
function Connection() {
  this._platformConnection = new BasicConnection

  this._importCallbacks = {}

  this._executeSCb = function() {
  }

  this._executeFCb = function() {
  }

  this._runtimeExceptionCb = function(err) {
    console.error.apply(null, [
      new Date().toGMTString().concat(' jailed:sandbox'),
      'Runtime Exception:',
      err.stack || err,
    ])
  }

  this._runtimeRejectionCb = function(err) {
    console.error.apply(null, [
      new Date().toGMTString().concat(' jailed:sandbox'),
      'Runtime Rejection:',
      err.stack || err,
    ])
  }

  this._messageHandler = function() {
  }

  var _this = this
  this.whenInit = function(cb) {
    _this._platformConnection.whenInit(cb)
  }

  this._platformConnection.onMessage(function(m) {
    switch (m.type) {
      case 'message':
        _this._messageHandler(m.data)
        break
      case 'importSuccess':
        _this._handleImportSuccess(m.url)
        break
      case 'importFailure':
        _this._handleImportFailure(m.url, m.error)
        break
      case 'executeSuccess':
        _this._executeSCb()
        break
      case 'executeFailure':
        _this._executeFCb(m.error)
        break
      case 'runtimeException':
        _this._runtimeExceptionCb(m.error)
        break
      case 'runtimeRejection':
        // happens when node sends a warning about an uncaught promise failure
        _this._runtimeRejectionCb(m.error, m.extras)
        break
    }
  })
}

Connection.prototype.onUncaughtException = function(cb) {
  if ('function' !== typeof cb) throw new TypeError('listener must be a function')
  this._runtimeExceptionCb = cb
}

Connection.prototype.onUncaughtRejection = function(cb) {
  if ('function' !== typeof cb) throw new TypeError('listener must be a function')
  this._runtimeRejectionCb = cb
}

/**
 * Tells the plugin to load a script with the given path, and to
 * execute it. Callbacks executed upon the corresponding responce
 * message from the plugin site
 *
 * @param {String} path of a script to load
 * @param {Function} sCb to call upon success
 * @param {Function} fCb to call upon failure
 */
Connection.prototype.importScript = function(path, sCb, fCb) {
  this._importCallbacks[path] = {sCb: sCb || noop, fCb: fCb || noop}
  this._platformConnection.send({type: 'import', url: path})
}


/**
 * Tells the plugin to load a script with the given path, and to
 * execute it in the JAILED environment. Callbacks executed upon
 * the corresponding responce message from the plugin site
 *
 * @param {String} path of a script to load
 * @param {Function} sCb to call upon success
 * @param {Function} fCb to call upon failure
 */
Connection.prototype.importJailedScript = function(path, sCb, fCb) {
  this._importCallbacks[path] = {sCb: sCb || noop, fCb: fCb || noop}
  this._platformConnection.send({type: 'importJailed', url: path})
}


/**
 * Sends the code to the plugin site in order to have it executed
 * in the JAILED enviroment. Assuming the execution may only be
 * requested once by the Plugin object, which means a single set
 * of callbacks is enough (unlike importing additional scripts)
 *
 * @param {String} code code to execute
 * @param {Function} sCb to call upon success
 * @param {Function} fCb to call upon failure
 */
Connection.prototype.execute = function(code, sCb, fCb) {
  this._executeSCb = sCb || noop
  this._executeFCb = fCb || noop
  this._platformConnection.send({type: 'execute', code: code})
}


/**
 * Adds a handler for a message received from the plugin site
 *
 * @param {Function} handler to call upon a message
 */
Connection.prototype.onMessage = function(handler) {
  this._messageHandler = handler
}


/**
 * Adds a handler for a disconnect message received from the
 * plugin site
 *
 * @param {Function} handler to call upon disconnect
 */
Connection.prototype.onDisconnect = function(handler) {
  this._platformConnection.onDisconnect(handler)
}


/**
 * Sends a message to the plugin
 *
 * @param {Object} data of the message to send
 */
Connection.prototype.send = function(data) {
  this._platformConnection.send({
    type: 'message',
    data: data
  })
}


/**
 * Handles import succeeded message from the plugin
 *
 * @param {String} url of a script loaded by the plugin
 */
Connection.prototype._handleImportSuccess = function(url) {
  var sCb = this._importCallbacks[url].sCb
  this._importCallbacks[url] = null
  delete this._importCallbacks[url]
  sCb()
}

/**
 * Handles import failure message from the plugin
 *
 * @param {String} url of a script loaded by the plugin
 */
Connection.prototype._handleImportFailure = function(url, error) {
  var fCb = this._importCallbacks[url].fCb
  this._importCallbacks[url] = null
  delete this._importCallbacks[url]
  fCb(error)
}

/**
 * Disconnects the plugin when it is not needed anymore
 */
Connection.prototype.disconnect = function() {
  this._platformConnection.disconnect()
}

function noop() {
  /* no op */
}
