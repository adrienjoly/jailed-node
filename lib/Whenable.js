'use strict'

var util = require('util')
  , EventEmitter = require('events')
  , SINGLE_EVENT = 'event'

EventEmitter = EventEmitter.EventEmitter || EventEmitter

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
  EventEmitter.call(this)
}

// Inherit functions from `EventEmitter`'s prototype
util.inherits(Whenable, EventEmitter)

/**
 * Emits the Whenable event, calls all the handlers already
 * subscribed, switches the object to the 'emitted' state (when
 * all future subscibed listeners will be immideately issued
 * instead of being stored)
 */
Whenable.prototype.emit = function() {
  if (false === this._emitted) {
    this._emitted = [].slice.call(arguments)
    setImmediate(function(_this) {
      Whenable.super_.prototype.emit.apply(_this, [SINGLE_EVENT].concat(_this._emitted))
    }, this)
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
  if (this._emitted) {
    if ('function' !== typeof handler) throw new TypeError('listener must be a function')
    setImmediate(handler.bind([null].concat(this._emitted)))
  } else {
    this.once(SINGLE_EVENT, handler)
  }
}