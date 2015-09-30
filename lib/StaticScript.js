'use strict'

var StaticScript = module.exports = function StaticScript(path) {
  this._path = path
}

StaticScript.prototype.execute = function(connection, onSuccess, onFail) {
  connection.importJailedScript(this._path, onSuccess, onFail)
}