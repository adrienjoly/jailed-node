'use strict'

var JailedSite = require('./JailedSite')
  , Whenable = require('./Whenable')
  , Connection = require('./Connection')
  , debug = require('debug')('jailed:plugin')
  , __jailed__path__ = __dirname + '/'

module.exports = Plugin

/**
 * Plugin constructor, represents a plugin initialized by a script
 * with the given path
 *
 * @param {String} url of a plugin source
 * @param {Object} _interface to provide for the plugin
 */
function Plugin(script, _interface, options) {
  this._script = script
  this._options = options || {}
  this._initialInterface = _interface || {}
  this._connect()
}

/**
 * Loads the plugin body (loads the plugin url in case of the
 * Plugin)
 */
Plugin.prototype._loadPlugin = function() {
  debug('Load plugin')
  this._script.execute(this._connection, this._requestRemote.bind(this), this._fCb)
}

/**
 * Creates the connection to the plugin site
 */
Plugin.prototype._connect = function() {
  this.remote = null

  this._connect = new Whenable
  this._fail = new Whenable
  this._disconnect = new Whenable

  var _this = this

  // binded failure callback
  this._fCb = function(error) {
    debug('Failed with error: %j', error)
    _this._fail.emit(error)
    debug('Disconnecting on error...')
    _this.disconnect()
  }

  debug('Connect plugin (options: %j)', this._options)
  this._connection = new Connection
  this._connection.whenInit(this._init.bind(this))
  if (this._options.failOnRuntimeError) {
    this._connection.onUncaughtException(this._fCb)
  }
  if (typeof this._options.onUncaughtRejection === 'function') {
    this._connection.onUncaughtRejection(this._options.onUncaughtRejection)
  }
}

Plugin.prototype._startTimeout = function() {
  var timeout = parseInt(this._options.timeout)
  if (timeout > 0) {
    var timeoutError = 'TimeoutError: Maximum execution time of ' + timeout + ' ms exceeded'
    this._timeout = setTimeout(this._fCb.bind(null, timeoutError), timeout)
  }
}

Plugin.prototype._clearTimeout = function() {
  if (this._timeout) {
    clearTimeout(this._timeout)
    delete this._timeout
  }
}

/**
 * Creates the Site object for the plugin, and then loads the
 * common routines (JailedSite.js)
 */
Plugin.prototype._init = function() {
  this._site = new JailedSite(this._connection)

  var _this = this

  this._site.onDisconnect(function() {
    _this._disconnect.emit()
  })

  var sCb = function() {
    _this._loadCore()
  }

  this._connection.importScript(
    __jailed__path__ + 'JailedSite.js', sCb, this._fCb
  )
}

/**
 * Loads the core scirpt into the plugin
 */
Plugin.prototype._loadCore = function() {
  var _this = this
  var sCb = function() {
    _this._startTimeout()
    _this._sendInterface()
  }

  this._connection.importScript(
    __jailed__path__ + '../sandbox/core.js', sCb, this._fCb
  )
}

/**
 * Sends to the remote site a signature of the interface provided
 * upon the Plugin creation
 */
Plugin.prototype._sendInterface = function() {
  var _this = this
  this._site.onInterfaceSetAsRemote(function() {
    if (!_this._connected) {
      _this._loadPlugin()
    }
  })

  this._site.setInterface(this._initialInterface)
}

/**
 * Requests the remote interface from the plugin (which was
 * probably set by the plugin during its initialization), emits
 * the connect event when done, then the plugin is fully usable
 * (meaning both the plugin and the application can use the
 * interfaces provided to each other)
 */
Plugin.prototype._requestRemote = function() {
  var _this = this
  this._site.onRemoteUpdate(function() {
    _this.remote = _this._site.getRemote()
    _this._connect.emit()
  })

  this._site.requestRemote()
}

/**
 * Disconnects the plugin immideately
 */
Plugin.prototype.disconnect = function() {
  debug('Disconnect plugin')
  this._clearTimeout()
  this._connection.disconnect()
  this._disconnect.emit()
}

/**
 * Saves the provided function as a handler for the connection
 * failure Whenable event
 *
 * @param {Function} handler to be issued upon disconnect
 */
Plugin.prototype.whenFailed = function(handler) {
  this._fail.whenEmitted(handler)
}

/**
 * Saves the provided function as a handler for the connection
 * success Whenable event
 *
 * @param {Function} handler to be issued upon connection
 */
Plugin.prototype.whenConnected = function(handler) {
  this._connect.whenEmitted(handler)
}

/**
 * Saves the provided function as a handler for the connection
 * failure Whenable event
 *
 * @param {Function} handler to be issued upon connection failure
 */
Plugin.prototype.whenDisconnected = function(handler) {
  this._disconnect.whenEmitted(handler)
}