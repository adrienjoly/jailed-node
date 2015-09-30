'use strict'

/**
 * A special kind of event:
 *  - which can only be emitted once
 *  - executes a set of subscribed handlers upon emission
 *  - if a handler is subscribed after the event was emitted, it
 *    will be invoked immideately.
 *
 * Used for the events which only happen once (or do not happen at
 * all) during a single plugin lifecycle - connect, disconnect and
 * connection failure
 */
var Whenable = module.exports = function Whenable() {
  this._emitted = false
  this._handlers = []
}


/**
 * Emits the Whenable event, calls all the handlers already
 * subscribed, switches the object to the 'emitted' state (when
 * all future subscibed listeners will be immideately issued
 * instead of being stored)
 */
Whenable.prototype.emit = function() {
  if (!this._emitted) {
    this._emitted = true

    var handler
    while (handler = this._handlers.pop()) {
      setTimeout(handler, 0)
    }
  }
}


/**
 * Saves the provided function as a handler for the Whenable
 * event. This handler will then be called upon the event emission
 * (if it has not been emitted yet), or will be scheduled for
 * immediate issue (if the event has already been emmitted before)
 *
 * @param {Function} handler to subscribe for the event
 */
Whenable.prototype.whenEmitted = function(handler) {
  handler = this._checkHandler(handler)
  if (this._emitted) {
    setTimeout(handler, 0)
  } else {
    this._handlers.push(handler)
  }
}


/**
 * Checks if the provided object is suitable for being subscribed
 * to the event (= is a function), throws an exception if not
 *
 * @param {Object} obj to check for being subscribable
 *
 * @throws {Exception} if object is not suitable for subscription
 *
 * @returns {Object} the provided object if yes
 */
Whenable.prototype._checkHandler = function(handler) {
  var type = typeof handler
  if (type != 'function') {
    var msg =
      'A function may only be subsribed to the event, '
      + type
      + ' was provided instead'
    throw new Error(msg)
  }

  return handler
}