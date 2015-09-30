'use strict'

var DynamicScript = module.exports = function DynamicScript(code) {
  this._code = code
}

DynamicScript.prototype.execute = function(connection, onSuccess, onFail) {
  connection.execute(this._code, onSuccess, onFail)
}
