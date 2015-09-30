'use strict'

var assert = require('chai').assert
  , jailed = require('../lib/jailed.js')
  , currentPath = __dirname + '/'

describe('Jailed NodeJS', function() {
  this.timeout(5000)

  it('Initialization', function(done) {
    assert.ok(
      jailed &&
      jailed.Plugin &&
      jailed.DynamicPlugin
    )
    done()
  })

  it('Static plugin', function(done) {
    var api = {
      callMe: protect(function() {
        plugin.disconnect()
        assert.ok(true)
        done()
      }, done)
    }
    var path = currentPath + 'stage01/plugin1.js'
    var plugin = new jailed.Plugin(path, api)
    plugin.whenFailed(whenFailed(done))
  })

  it('Dynamic plugin', function(done) {
    var api = {
      callMe: protect(function() {
        plugin.disconnect()
        assert.ok(true)
        done()
      }, done)
    }

    var code = 'application.remote.callMe();'
    var plugin = new jailed.DynamicPlugin(code, api)
    plugin.whenFailed(whenFailed(done))
  })

  it('Applictaion API', function(done) {
    var api = {
      square: protect(function(val, cb) {
        cb(val * val)
      }, done),
      report: protect(function(result) {
        plugin.disconnect()
        assert.ok(result == 4)
        done()
      }, done)
    }

    var path = currentPath + 'stage02/plugin2.js'
    var plugin = new jailed.Plugin(path, api)
    plugin.whenFailed(whenFailed(done))
  })

  it('Plugin API', function(done) {
    var init = protect(function() {
      var val = 2

      var cb = protect(function(result) {
        plugin.disconnect()
        assert.ok(result == val * val)
        done()
      }, done)

      plugin.remote.square(val, cb)
    }, done)

    var plugin = new jailed.Plugin(currentPath + 'stage03/plugin3.js')
    plugin.whenFailed(whenFailed(done))
    plugin.whenConnected(init)
  })

  it('Bidirectional communication initiated by the application', function(done) {
    var path = currentPath + 'stage04/plugin4.js'
    var waitCalled = false

    var api = {
      wait: protect(function(cb) {
        waitCalled = true
        setTimeout(cb, 1000)
      }, done)
    }

    var init = protect(function() {
      var val = 2

      var cb = protect(function(result) {
        plugin.disconnect()
        assert.ok(waitCalled)
        assert.ok(result == val * val)
        done()
      }, done)

      plugin.remote.squareDelayed(val, cb)
    }, done)

    var plugin = new jailed.Plugin(path, api)
    plugin.whenFailed(whenFailed(done))
    plugin.whenConnected(init)
  })

  it('Bidirectional communication initiated by the plugin', function(done) {
    var path = currentPath + 'stage05/plugin5.js'

    var api = {
      squareDelayed: protect(function(val, cb) {
        var cb1 = protect(function() {
          cb(val * val)
        }, done)

        plugin.remote.wait(cb1)
      }, done),
      report: protect(function(result, waitCalled) {
        plugin.disconnect()
        assert.ok(result == 4)
        assert.ok(waitCalled)
        done()
      }, done)
    }

    var plugin = new jailed.Plugin(path, api)
    plugin.whenFailed(whenFailed(done))
  })

  it('Loading several plugins at once', function(done) {
    var path1 = currentPath + 'stage06/plugin6_1.js'
    var path2 = currentPath + 'stage06/plugin6_2.js'

    var replied1 = false
    var replied2 = false

    var finalize = protect(function() {
      if (replied1 && replied2) {
        assert.ok(true)
        done()
      }
    }, done)

    var init1 = protect(function() {
      var val = 2
      var cb = protect(function(result) {
        replied1 = true
        plugin1.disconnect()
        assert.ok(result == val * val)
        finalize()
      }, done)

      plugin1.remote.square(val, cb)
    }, done)

    var init2 = protect(function() {
      var val = 3
      var cb = function(result) {
        replied2 = true
        plugin2.disconnect()
        assert.ok(result == val * val)
        finalize()
      }

      plugin2.remote.square(val, cb)
    }, done)

    var plugin1 = new jailed.Plugin(path1)
    var plugin2 = new jailed.Plugin(path2)

    plugin1.whenFailed(whenFailed(done))
    plugin2.whenFailed(whenFailed(done))

    plugin1.whenConnected(init1)
    plugin2.whenConnected(init2)
  })

  it('Using the plugin during a period', function(done) {
    var path = currentPath + 'stage07/plugin7.js'

    var init = protect(function() {
      var val1 = 2
      var cb1 = protect(function(result) {
        assert.ok(result == val1 * val1)

        setTimeout(step2, 1000)
      }, done)

      var step2 = protect(function() {
        var val2 = 3
        var cb2 = protect(function(result) {
          plugin.disconnect()
          assert.ok(result == val2 * val2)
          done()
        }, done)

        plugin.remote.square(val2, cb2)
      }, done)

      plugin.remote.square(val1, cb1)
    }, done)

    var plugin = new jailed.Plugin(path)
    plugin.whenFailed(whenFailed(done))
    plugin.whenConnected(init)
  })

  it('Using the application during a period', function(done) {
    var path = currentPath + 'stage08/plugin8.js'
    var api = {
      square: protect(function(val, cb) {
        cb(val * val)
      }, done),
      check: protect(function(result) {
        assert.ok(result)
      }, done),
      done: protect(function() {
        plugin.disconnect()
        assert.ok(true)
        done()
      }, done)
    }

    var plugin = new jailed.Plugin(path, api)
    plugin.whenFailed(whenFailed(done))
  })

  it('Using the plugin several times', function(done) {
    var path = currentPath + 'stage09/plugin9.js'
    var attempt = 1
    var api1 = {
      checkAttempt: protect(function(cb) {
        assert.ok(attempt == 1)
        cb()
      }, done),
      done: protect(function() {
        plugin1.disconnect()
        assert.ok(true)
        step2()
      }, done)
    }

    var step2 = protect(function() {
      attempt = 2

      var api2 = {
        checkAttempt: protect(function(cb) {
          assert.ok(attempt == 2)
          cb()
        }, done),
        done: protect(function() {
          plugin2.disconnect()
          assert.ok(true)
          done()
        }, done)
      }

      var plugin2 = new jailed.Plugin(path, api2)
      plugin2.whenFailed(whenFailed(done))
    }, done)

    var plugin1 = new jailed.Plugin(path, api1)
    plugin1.whenFailed(whenFailed(done))
  })

  it('Two plugins with the same source but different interface', function(done) {
    var path = currentPath + 'stage10/plugin10.js'

    var done1 = false
    var done2 = false

    var api1 = {
      getNum: protect(function(cb) {
        cb(1)
      }, done),
      report: protect(function(result, cb) {
        assert.ok(result == 1)
        cb()
      }, done),
      done: protect(function() {
        done1 = true
        finalize()
      }, done)
    }

    var api2 = {
      getNum: protect(function(cb) {
        cb(2)
      }, done),
      report: protect(function(result, cb) {
        assert.ok(result == 2)
        cb()
      }, done),
      done: protect(function() {
        done2 = true
        finalize()
      }, done)
    }

    var finalize = protect(function() {
      if (done1 && done2) {
        plugin1.disconnect()
        plugin2.disconnect()
        assert.ok(true)
        done()
      }
    }, done)

    var plugin1 = new jailed.Plugin(path, api1)
    var plugin2 = new jailed.Plugin(path, api2)
    plugin1.whenFailed(whenFailed(done))
    plugin2.whenFailed(whenFailed(done))
  })

  it('Plugin disconnected right after creation', function(done) {

    var fail = protect(
      function() {
        plugin.disconnect()
        assert.ok(false)
        done()
      }
    )

    var disconnected = false
    var disconnect = protect(
      function() {
        disconnected = true
        assert.ok(true)
      }
    )

    var finalize = protect(
      function() {
        assert.ok(disconnected)
        done()
      }
    )

    var path = currentPath + 'stage11/plugin11.js'
    var plugin = new jailed.Plugin(path)
    plugin.whenConnected(fail)
    plugin.whenDisconnected(disconnect)
    plugin.whenFailed(whenFailed(done))
    plugin.disconnect()
    setTimeout(finalize, 1000)
  })

  it('Plugin disconnected after connection', function(done) {

    var fail = protect(
      function() {
        plugin.disconnect()
        assert.ok(false)
        done()
      }
    )

    var connect = protect(
      function() {
        assert.ok(true)
        plugin.disconnect()
        setTimeout(finalize, 1000)
      }
    )

    var disconnected = false
    var disconnect = protect(
      function() {
        disconnected = true
        assert.ok(true)
      }
    )

    var finalize = protect(
      function() {
        assert.ok(disconnected)
        done()
      }
    )

    var path = currentPath + 'stage11/plugin11.js'
    var plugin = new jailed.Plugin(path)
    plugin.whenConnected(connect)
    plugin.whenDisconnected(disconnect)
    plugin.whenFailed(whenFailed(done))

  })

  it('Plugin disconnected by its method', function(done) {
    var path = currentPath + 'stage11/plugin11.js'

    var connected = protect(function() {
      assert.ok(true)

      var val = 2
      var cb = protect(function(result) {
        assert.ok(result == val * val)
        setTimeout(
          protect(function() {
            plugin.remote.killYourself()
          }, done), 1000
        )
      }, done)

      plugin.remote.square(val, cb)
    }, done)

    var disconnected = protect(function() {
      assert.ok(true)
      done()
    }, done)

    var plugin = new jailed.Plugin(path)
    plugin.whenConnected(connected)
    plugin.whenDisconnected(disconnected)
    plugin.whenFailed(whenFailed(done))
  })

  it('Plugin disconnected during initialization', function(done) {
    var path = currentPath + 'stage11/plugin11_1.js'

    var failed = function() {
      plugin.disconnect()
      assert.ok(false)
      done()
    }

    var disconnected = function() {
      assert.ok(true)
      done()
    }

    var plugin = new jailed.Plugin(path)
    plugin.whenConnected(failed)
    plugin.whenFailed(failed)
    plugin.whenDisconnected(disconnected)
  })

  it('Mixed plugin loading sequence', function(done) {
    var path = currentPath + 'stage12/plugin12.js'
    var plugin1, plugin2

    var step1 = protect(function() {
      var val = 2
      var cb = protect(function(result) {
        assert.ok(result == val * val)
        step2()
      }, done)

      plugin1.remote.square(val, cb)
    }, done)

    var step2 = protect(function() {
      var connected2 = protect(function() {
        var val = 7
        var cb = protect(function(result) {
          assert.ok(result == val * val)
          step3()
        }, done)

        plugin2.remote.square(val, cb)
      }, done)

      plugin2 = new jailed.Plugin(path)
      plugin2.whenConnected(connected2)
      plugin2.whenFailed(whenFailed(done))
    }, done)

    var step3 = protect(function() {
      plugin1.disconnect()
      setTimeout(step4, 1000)
    }, done)

    var step4 = protect(function() {
      var val = 11
      var cb = protect(function(result) {
        assert.ok(result == val * val)
        finalize()
      }, done)

      plugin2.remote.square(val, cb)
    }, done)

    var finalize = protect(function() {
      plugin2.disconnect()
      done()
    }, done)

    plugin1 = new jailed.Plugin(path)
    plugin1.whenConnected(step1)
    plugin1.whenFailed(whenFailed(done))
  })

  it('Executing function with several callbacks', function(done) {
    var path = currentPath + 'stage13/plugin13.js'

    var api = {
      callMeBack: protect(function(success, sCb, fCb) {
        if (success) {
          sCb()
        } else {
          fCb()
        }
      }, done),
      report: protect(function(result, cb) {
        assert.ok(result)
        cb()
      }, done),
      done: protect(function() {
        plugin.disconnect()
        assert.ok(true)
        done()
      }, done)
    }

    var plugin = new jailed.Plugin(path, api)
    plugin.whenFailed(whenFailed(done))
  })

  it('Remote plugin', function(done) {
    var path = 'http://asvd.github.io/jailed/tests/plugin14.js'

    var api = {
      square: protect(function(val, cb) {
        cb(val * val)
      }, done),
      check: protect(function(result, cb) {
        assert.ok(result)
        cb()
      }, done),
      done: protect(function() {
        plugin.disconnect()
        done()
      }, done)
    }

    var plugin = new jailed.Plugin(path, api)
    plugin.whenFailed(whenFailed(done))
  })

  it('Plugin with infinite loop', function(done) {
    this.timeout(10000)

    var pathBad = currentPath + 'stage15/plugin15_bad.js'
    var pathGood = currentPath + 'stage15/plugin15_good.js'

    var pluginGood
    var pluginBad

    var step1 = protect(
      function() {
        assert.ok(true)

        var cb = protect(
          function() {
            // should never be called
            assert.ok(false)
            pluginBad.disconnect()
            done()
          }
        )

        pluginBad.remote.infinite(cb)

        setTimeout(step2, 2000)
      }
    )

    var step2 = protect(
      function() {
        pluginBad.disconnect()
        setTimeout(step3, 1000)
      }
    )

    var step3 = protect(
      function() {
        assert.ok(true)

        pluginBad = new jailed.Plugin(pathBad)
        pluginBad.whenConnected(step4)
        pluginBad.whenFailed(whenFailed(done))
      }
    )

    var step4 = protect(
      function() {
        var cb = protect(
          function() {
            // should never be called
            assert.ok(false)
            pluginBad.disconnect()
            done()
          }
        )

        pluginBad.remote.infinite(cb)

        setTimeout(step5, 2000)
      }
    )

    var step5 = protect(
      function() {
        assert.ok(true)

        pluginGood = new jailed.Plugin(pathGood)
        pluginGood.whenConnected(step6)
        pluginGood.whenFailed(whenFailed(done))
      }
    )

    var step6 = protect(
      function() {
        var val = 8
        var cb = protect(function(result) {
          assert.ok(result == val * val)
          pluginGood.disconnect()
          pluginBad.disconnect()
          done()
        }, done)

        pluginGood.remote.square(val, cb)
      }
    )

    pluginBad = new jailed.Plugin(pathBad)
    pluginBad.whenConnected(step1)
    pluginBad.whenFailed(whenFailed(done))
  })

  it('Permission restriction', function(done) {
    var path = currentPath + 'stage16/plugin16.js'

    var api = {
      check: protect(
        function(result, cb) {
          assert.ok(result)
          cb()
        }
      ),
      done: protect(
        function() {
          plugin.disconnect()
          assert.ok(true)
          done()
        }
      )
    }

    var plugin = new jailed.Plugin(path, api)
    plugin.whenFailed(whenFailed(done))
  })

  it('Broken plugin', function(done) {
    var path = currentPath + 'stage17/plugin17.js'

    var plugin = new jailed.Plugin(path)

    var fail = protect(
      function() {
        plugin.disconnect()
        assert.ok(false)
        done()
      }
    )

    plugin.whenConnected(fail)

    plugin.whenFailed(
      protect(
        function() {
          assert.ok(true)
          done()
        }
      )
    )
  })

  it('Broken dynamic plugin', function(done) {
    var code = 'u'
//        var code = 'auaa } u((uu&'

    var plugin = new jailed.DynamicPlugin(code)

    var connect = protect(
      function() {
        plugin.disconnect()
        assert.ok(false)
        done()
      }
    )

    var disconnected = false
    var disconnect = protect(
      function() {
        assert.ok(true)
        disconnected = true
      }
    )

    var failed = false
    var fail = protect(
      function() {
        assert.ok(true)
        failed = true
        setTimeout(finalize, 500)
      }
    )

    var finalize = protect(
      function() {
        plugin.disconnect()
        assert.ok(failed && disconnected)
        done()
      }
    )

    plugin.whenConnected(connect)
    plugin.whenDisconnected(disconnect)
    plugin.whenFailed(fail)
  })

  it('Broken remote plugin', function(done) {
    var path = 'http://asvd.github.io/jailed/tests/plugin18.js'

    var plugin = new jailed.Plugin(path)

    var connect = protect(
      function() {
        plugin.disconnect()
        assert.ok(false)
        done()
      }
    )

    var disconnected = false
    var disconnect = protect(
      function() {
        assert.ok(true)
        disconnected = true
      }
    )

    var failed = false
    var fail = protect(
      function() {
        assert.ok(true)
        failed = true
        setTimeout(finalize, 500)
      }
    )

    var finalize = protect(
      function() {
        plugin.disconnect()
        assert.ok(failed && disconnected)
        done()
      }
    )

    plugin.whenConnected(connect)
    plugin.whenDisconnected(disconnect)
    plugin.whenFailed(fail)
  })

  it('Nonexisting plugin', function(done) {
    this.timeout(3000)

    var path = currentPath + 'no_such_path.js'
    var plugin = new jailed.Plugin(path)

    var connect = protect(
      function() {
        plugin.disconnect()
        assert.ok(false)
        done()
      }
    )

    var disconnected = false
    var disconnect = protect(
      function() {
        assert.ok(true)
        disconnected = true
      }
    )

    var failed = false
    var fail = protect(
      function() {
        assert.ok(true)
        failed = true
        setTimeout(finalize, 500)
      }
    )

    var finalize = protect(
      function() {
        assert.ok(failed && disconnected)
        plugin.disconnect()
        done()
      }
    )

    plugin.whenConnected(connect)
    plugin.whenDisconnected(disconnect)
    plugin.whenFailed(fail)
  })

  it('Nonexisting remote plugin', function(done) {
    this.timeout(3000)

    var path = 'http://asvd.github.io/no_such_path.js'
    var plugin = new jailed.Plugin(path)

    var connect = protect(
      function() {
        plugin.disconnect()
        assert.ok(false)
        done()
      }
    )

    var disconnected = false
    var disconnect = protect(
      function() {
        assert.ok(true)
        disconnected = true
      }
    )

    var failed = false
    var fail = protect(
      function() {
        assert.ok(true)
        failed = true
        setTimeout(finalize, 500)
      }
    )

    var finalize = protect(
      function() {
        plugin.disconnect()
        assert.ok(failed && disconnected)
        done()
      }
    )

    plugin.whenConnected(connect)
    plugin.whenDisconnected(disconnect)
    plugin.whenFailed(fail)
  })

  it('Broken plugin method', function(done) {
    this.timeout(8000)

    var step1 = protect(
      function() {
        var cb = protect(
          function() {
            plugin.disconnect()
            clearTimeout(timeout)
            assert.ok(false)
            done()
          }
        )

        plugin.remote.broken(cb)

        var timeout = setTimeout(step2, 1000)
      }
    )

    var step2 = protect(
      function() {
        var timeout = setTimeout(
          protect(
            function() {
              plugin.disconnect()
              assert.ok(false)
              done()
            }
          ),
          1000
        )

        var cb = protect(
          function() {
            clearTimeout(timeout)
            assert.ok(true)
            step3()
          }
        )

        plugin.remote.brokenDelayed(cb)
      }
    )

    var step3 = protect(
      function() {
        var cb = protect(
          function() {
            clearTimeout(timeout)
            plugin.disconnect()
            assert.ok(false)
            done()
          }
        )

        plugin.remote.broken(cb)
        var timeout = setTimeout(step4, 500)
      }
    )

    var step4 = protect(
      function() {
        var val = 6
        var cb = protect(
          function(result) {
            plugin.disconnect()
            assert.ok(result = val * val)
            done()
          }
        )

        plugin.remote.square(val, cb)
      }
    )

    var path = currentPath + 'stage19/plugin19.js'
    var plugin = new jailed.Plugin(path)
    plugin.whenConnected(step1)
    plugin.whenFailed(whenFailed(done))
  })

  it('Broken application method', function(done) {
    var api = {
      // intentionally not protected, must fail
      broken: function(cb) {
        somethingWrong()
        cb()
      },

      // intentionally not protected, must fail
      brokenDelayed: function(cb) {
        setTimeout(cb, 500)
        somethingWrong()
      },

      square: protect(
        function(val, cb) {
          cb(val * val)
        }
      ),

      check: protect(
        function(result, cb) {
          assert.ok(result)
          cb()
        }
      ),

      done: protect(
        function() {
          plugin.disconnect()
          done()
        }
      )
    }

    var path = currentPath + 'stage20/plugin20.js'
    var plugin = new jailed.Plugin(path, api)
    plugin.whenFailed(whenFailed(done))
  })

  it('Several plugin methods execution', function(done) {
    var cubeFinished = false
    var squareFinished = false

    var step1 = protect(
      function() {
        var valCube = 7

        var cbCube = protect(
          function(result) {
            assert.ok(result == valCube * valCube * valCube)
            cubeFinished = true
            finalize()
          }
        )

        plugin.remote.cubeDelayed(valCube, cbCube)
        step2()
      }
    )

    var step2 = protect(
      function() {
        var val = 8

        var cb = protect(
          function(result) {
            assert.ok(result == val * val)
            squareFinished = true
            finalize()
          }
        )

        plugin.remote.square(val, cb)
      }
    )

    var finalize = protect(
      function() {
        if (cubeFinished && squareFinished) {
          plugin.disconnect()
          assert.ok(true)
          done()
        }
      }
    )

    var path = currentPath + 'stage21/plugin21.js'
    var plugin = new jailed.Plugin(path)
    plugin.whenFailed(whenFailed(done))
    plugin.whenConnected(step1)
  })

  it('Several application methods execution', function(done) {
    var api = {
      square: protect(
        function(val, cb) {
          cb(val * val)
        }
      ),
      cubeDelayed: protect(
        function(val, cb) {
          setTimeout(
            protect(
              function() {
                cb(val * val * val)
              }
            ), 1000
          )
        }
      ),
      check: protect(
        function(result, cb) {
          assert.ok(result)
          cb()
        }
      ),

      done: protect(
        function() {
          plugin.disconnect()
          done()
        }
      )
    }

    var path = currentPath + 'stage22/plugin22.js'
    var plugin = new jailed.Plugin(path, api)
    plugin.whenFailed(whenFailed(done))
  })

  it('Plugin method with several callbacks', function(done) {
    var step1 = protect(
      function() {
        var cb0 = protect(
          function() {
            assert.ok(false)
            step2()
          }
        )

        var cb1 = protect(
          function() {
            assert.ok(true)
            step2()
          }
        )

        plugin.remote.callback(1, cb0, cb1)
      }
    )

    var step2 = protect(
      function() {
        var cb0 = protect(
          function() {
            assert.ok(true)
            finalize()
          }
        )

        var cb1 = protect(
          function() {
            assert.ok(false)
            finalize()
          }
        )

        plugin.remote.callback(0, cb0, cb1)
      }
    )

    var finalize = protect(
      function() {
        plugin.disconnect()
        done()
      }
    )

    var path = currentPath + 'stage23/plugin23.js'
    var plugin = new jailed.Plugin(path)
    plugin.whenFailed(whenFailed(done))
    plugin.whenConnected(step1)
  })

  it('Application method with several callbacks', function(done) {
    var api = {
      callback: protect(
        function(num, cb0, cb1) {
          if (num == 0) {
            cb0()
          } else {
            cb1()
          }
        }
      ),

      check: protect(
        function(result, cb) {
          assert.ok(result)
          cb()
        }
      ),

      done: protect(
        function() {
          plugin.disconnect()
          done()
        }
      )
    }

    var path = currentPath + 'stage24/plugin24.js'
    var plugin = new jailed.Plugin(path, api)
    plugin.whenFailed(whenFailed(done))
  })

  it('Two-sided communication, initiated by the plugin', function(done) {
    var api = {
      squareDelayed: protect(
        function(val, cb) {
          plugin.remote.wait(
            protect(
              function() {
                cb(val * val)
              }
            )
          )
        }
      ),

      check: protect(
        function(result, cb) {
          assert.ok(result)
          cb()
        }
      ),

      done: protect(
        function() {
          plugin.disconnect()
          done()
        }
      )
    }

    var path = currentPath + 'stage25/plugin25.js'
    var plugin = new jailed.Plugin(path, api)
    plugin.whenFailed(whenFailed(done))
  })

  it('Two-sided communication, initiated by the application', function(done) {
    var api = {
      wait: function(cb) {
        setTimeout(cb, 1000)
      }
    }

    var step1 = protect(
      function() {
        var val = 54
        var cb = protect(
          function(result) {
            plugin.disconnect()
            assert.ok(result == val * val)
            done()
          }
        )

        plugin.remote.squareDelayed(val, cb)
      }
    )

    var path = currentPath + 'stage26/plugin26.js'
    var plugin = new jailed.Plugin(path, api)
    plugin.whenFailed(whenFailed(done))
    plugin.whenConnected(step1)
  })

  it('Calling plugin callbacks from the same arguments several times', function(done) {

    var api = {
      callme: function(cb0, cb1) {
        var step1 = function() {
          setTimeout(finalize, 1000)
          assert.throws(cb1)
        }

        setTimeout(step1, 1000)

        cb0()

        assert.throws(cb0)
      },

      check: protect(
        function(result) {
          assert.ok(result)
        }
      )
    }

    var finalize = protect(
      function() {
        plugin.disconnect()
        done()
      }
    )

    var path = currentPath + 'stage27/plugin27.js'
    var plugin = new jailed.Plugin(path, api)
    plugin.whenFailed(whenFailed(done))
  })

  it('Calling application callbacks from the same arguments several times', function(done) {

    var init = protect(
      function() {
        var notYetCalled = true
        var cb = protect(
          function() {
            assert.ok(notYetCalled)
            notYetCalled = false
          }
        )

        plugin.remote.callme(cb, cb)
      }
    )

    var api = {
      check: protect(
        function(result) {
          assert.ok(result)
        }
      ),

      done: protect(
        function() {
          plugin.disconnect()
          done()
        }
      )
    }

    var path = currentPath + 'stage28/plugin28.js'
    var plugin = new jailed.Plugin(path, api)
    plugin.whenFailed(whenFailed(done))
    plugin.whenConnected(init)
  })

  it('Delayed plugin error', function(done) {

    var init = protect(
      function() {
        var cb = protect(
          function() {
            plugin.disconnect()
            assert.ok(true)
          }
        )

        // Node.js child process will exit,
        // Worker will throw, but proceed
        plugin.remote.brokenDelayed(cb)
      }
    )

    var disconnect = protect(
      function() {
        assert.ok(true)
        setTimeout(finalize, 300)
      }
    )

    var finalize = protect(
      function() {
        done()
      }
    )

    var path = currentPath + 'stage29/plugin29.js'
    var plugin = new jailed.Plugin(path)
    plugin.whenFailed(whenFailed(done))
    plugin.whenConnected(init)
    plugin.whenDisconnected(disconnect)
  })

  it('Subscribing non-functions to events in the application environment', function(done) {
    var plugin = new jailed.DynamicPlugin('')

    var step1 = function() {
      setTimeout(step2, 100)
      assert.throws(function() {
        plugin.whenConnected([])
      })
    }

    var step2 = function() {
      setTimeout(step3, 100)
      assert.throws(function() {
        plugin.whenFailed('something')
      })
    }

    var step3 = function() {
      setTimeout(step4, 100)
      assert.throws(function() {
        plugin.whenDisconnected(new Date)
      })
    }

    var step4 = function() {
      assert.doesNotThrow(function() {
        plugin.whenConnected(step5)
      })
    }

    var step5 = function() {
      plugin.disconnect()
      assert.ok(true)
      done()
    }

    setTimeout(step1, 100)
  })

  it('Subscribing non-functions to events in the plugin environment', function(done) {
    var fail = protect(
      function() {
        plugin.disconnect()
        assert.ok(true)
        setTimeout(finalize, 300)
      }
    )

    var connect = protect(
      function() {
        plugin.disconnect()
        assert.ok(false)
        done()
      }
    )

    var disconnected = false
    var disconnect = protect(
      function() {
        assert.ok(true)
        disconnected = true
      }
    )

    var finalize = protect(
      function() {
        assert.ok(disconnected)
        done()
      }
    )

    var path = currentPath + 'stage30/plugin30.js'
    var plugin = new jailed.Plugin(path)
    plugin.whenFailed(fail)
    plugin.whenConnected(connect)
    plugin.whenDisconnected(disconnect)
  })

  it('Delayed event subscription in the application', function(done) {
    this.timeout(10000)

    var stage1 = protect(
      function() {
        var plugin = new jailed.DynamicPlugin('')

        var connectionCompleted = false

        var connectCheck = protect(
          function() {
            plugin.disconnect()
            assert.isTrue(connectionCompleted)
            setTimeout(stage2, 300)
          }
        )

        var tryConnect = protect(
          function() {
            plugin.whenConnected(connected)
          }
        )

        var connected = function() {
          connectionCompleted = true
        }

        setTimeout(tryConnect, 300)
        setTimeout(connectCheck, 600)
      }
    )

    var stage2 = protect(
      function() {
        var plugin = new jailed.DynamicPlugin('uau}')

        var failureCompleted = false

        var failureCheck = protect(
          function() {
            plugin.disconnect()
            assert.ok(failureCompleted)
            setTimeout(stage3, 300)
          }
        )

        var tryFailure = protect(
          function() {
            plugin.whenFailed(failed)
          }
        )

        var failed = function() {
          failureCompleted = true
        }

        setTimeout(tryFailure, 300)
        setTimeout(failureCheck, 600)
      }
    )

    var stage3 = protect(
      function() {
        var plugin = new jailed.DynamicPlugin('application.disconnect();')

        var disconnectCompleted = false

        var disconnectCheck = protect(
          function() {
            plugin.disconnect()
            assert.ok(disconnectCompleted)
            done()
          }
        )

        var tryDisconnect = protect(
          function() {
            plugin.whenDisconnected(disconnected)
          }
        )

        var disconnected = function() {
          disconnectCompleted = true
        }

        setTimeout(tryDisconnect, 300)
        setTimeout(disconnectCheck, 600)
      }
    )

    stage1()
  })

  it('Delayed event subscription in the plugin', function(done) {
    var api = {
      check: protect(function(result, cb) {
        assert.ok(result)
        cb()
      }, done),

      done: protect(function() {
        plugin.disconnect()
        assert.ok(true)
        done()
      }, done)
    }

    var path = currentPath + 'stage31/plugin31.js'
    var plugin = new jailed.Plugin(path, api)

  })

  it('Subscibing to Whenable events several times before and after emission', function(done) {

    var pluginFinished = 0
    var api = {
      check: protect(function(result, cb) {
        assert.ok(result)
        cb()
      }, done),

      finished: protect(function() {
        assert.ok(true)
        pluginFinished++
        disconnect()
      }, done)
    }

    var beforeConnect1Finished = 0
    var beforeConnect1 = protect(
      function() {
        beforeConnect1Finished++
        assert.ok(true)
        finalize()
      }
    )

    var beforeConnect2Finished = 0
    var beforeConnect2 = protect(
      function() {
        beforeConnect2Finished++
        assert.ok(true)
        finalize()
      }
    )

    var beforeDisconnect1Finished = 0
    var beforeDisconnect1 = protect(
      function() {
        beforeDisconnect1Finished++
        assert.ok(true)
        finalize()
      }
    )

    var beforeDisconnect2Finished = 0
    var beforeDisconnect2 = protect(
      function() {
        beforeDisconnect2Finished++
        assert.ok(true)
        finalize()
      }
    )

    var afterConnect1Finished = 0
    var afterConnect1 = protect(
      function() {
        afterConnect1Finished++
        assert.ok(true)
        finalize()
      }
    )

    var afterConnect2Finished = 0
    var afterConnect2 = protect(
      function() {
        afterConnect2Finished++
        assert.ok(true)
        finalize()
      }
    )

    var afterDisconnect1Finished = 0
    var afterDisconnect1 = protect(
      function() {
        afterDisconnect1Finished++
        assert.ok(true)
        finalize()
      }
    )

    var afterDisconnect2Finished = 0
    var afterDisconnect2 = protect(
      function() {
        afterDisconnect2Finished++
        assert.ok(true)
        finalize()
      }
    )

    var finalize = protect(
      function() {
        if (
          pluginFinished == 1 &&
          beforeConnect1Finished == 1 &&
          beforeConnect2Finished == 1 &&
          beforeDisconnect1Finished == 1 &&
          beforeDisconnect2Finished == 1 &&
          afterConnect1Finished == 1 &&
          afterConnect2Finished == 1 &&
          afterDisconnect1Finished == 1 &&
          afterDisconnect2Finished == 1
        ) {
          assert.ok(
            pluginFinished == 1 &&
            beforeConnect1Finished == 1 &&
            beforeConnect2Finished == 1 &&
            beforeDisconnect1Finished == 1 &&
            beforeDisconnect2Finished == 1 &&
            afterConnect1Finished == 1 &&
            afterConnect2Finished == 1 &&
            afterDisconnect1Finished == 1 &&
            afterDisconnect2Finished == 1
          )
          done()
        }
      }
    )

    var disconnect = protect(
      function() {
        plugin.disconnect()
        setTimeout(
          protect(
            function() {
              plugin.whenDisconnected(afterDisconnect)
            }
          ), 300
        )
      }
    )

    var afterDisconnect = protect(
      function() {
        plugin.whenConnected(afterConnect1)
        plugin.whenConnected(afterConnect2)
        plugin.whenDisconnected(afterDisconnect1)
        plugin.whenDisconnected(afterDisconnect2)
      }
    )

    var path = currentPath + 'stage32/plugin32.js'
    var plugin = new jailed.Plugin(path, api)
    plugin.whenConnected(beforeConnect1)
    plugin.whenConnected(beforeConnect2)
    plugin.whenDisconnected(beforeDisconnect1)
    plugin.whenDisconnected(beforeDisconnect2)
  })
})

function protect(method, done) {
  return function() {
    try {
      method.apply(this, arguments)
    } catch (e) {
      assert.ok(false)
      done()
    }
  }
}

function whenFailed(done) {
  return function(error) {
    console.error('Error:', error)
    assert.ok(false)
    done()
  }
}