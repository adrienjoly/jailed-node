'use strict'

var assert = require('assert')
  , jailed = require('../lib/jailed.js')

function sandbox(done) {
  var val = 5
  var api = {
    power: function(x, y, cb) {
      cb(Math.pow(x, y))
    },

    report: function(num) {
      plugin.disconnect()
      assert.equal(num, 25)
      done(true)
    }
  }

  var code = 'var iface = { square: function(value) { ' +
    'var remoteApi = application.remote; ' +
    'remoteApi.power(value, 2, remoteApi.report); } };' +
    'application.setInterface(iface)'

  var plugin = new jailed.DynamicPlugin(code, api, {timeout: 300})
  plugin.whenConnected(function() {
    plugin.remote.square(val)
  })
  plugin.whenFailed(function(error) {
    console.error('Unexpected Fail:', error)
    done()
  })
}

function stress(count) {
  var pending = count
    , completed = 0
    , elapsed = process.hrtime()
    , summary = {success: 0, timeout: 0}
    , int = setInterval(run, 20)

  function run() {
    if (--pending < 1) clearInterval(int)

    sandbox(function(success) {
      if (success) summary.success++; else summary.timeout++
      process.stdout.write(++completed % 50 ? '.' : '.\n')

      if (completed === count) {
        elapsed = parseFloat(process.hrtime(elapsed).join('.'))
        console.log(
          '\nStress test completed in %d seconds at %d RPM (success: %d, timeouts: %d / %d %%)',
          elapsed.toFixed(3), (count / elapsed * 60).toFixed(1),
          summary.success, summary.timeout, (summary.timeout / count * 100).toFixed(2)
        )
      }
    })
  }
}

if (require.main === module) {
  stress(parseInt(process.argv[2]) || 100)
}
