/**
 * Contains the routines loaded by the plugin process under Node.js
 *
 * Initializes the Node.js environment version of the
 * platform-dependent connection object for the plugin site
 */

application = {}
connection = {}

__basedir = __dirname.substring(0, __dirname.lastIndexOf('/'))

process.on('uncaughtException', function(e) {
  printError(e.stack || e)
})

/**
 * Event lisener for the plugin message
 */
process.on('message', function(m) {
  switch (m.type) {
    case 'import':
      importScript(m.url)
      break
    case 'importJailed':
      importScriptJailed(m.url)
      break
    case 'execute':
      execute(m.code)
      break
    case 'message':
      // unhandled exception would break the IPC channel
      try {
        conn._messageHandler(m.data);
      } catch (e) {
        printError(e.stack);
      }
      break;
  }
})

/**
 * Loads and executes the JavaScript file with the given url
 *
 * @param {String} url of the script to load
 */
var importScript = function(url) {
  var done = _onImportScript(url)
  loadScript(
    url,
    function runScript(err, code) {
      if (err) return done(err)
      executeNormal(code, url, done)
    }
  )
}

/**
 * Loads and executes the JavaScript file with the given url in a
 * jailed environment
 *
 * @param {String} url of the script to load
 */
var importScriptJailed = function(url) {
  var done = _onImportScript(url)
  loadScript(
    url,
    function runScript(err, code) {
      if (err) return done(err)
      executeJailed(code, url, done)
    }
  )
}

function _onImportScript(path) {
  return function(error) {
    if (error) {
      printError(error.stack)
      process.send({type: 'importFailure', url: path, error: exportError(error)})
    } else {
      process.send({type: 'importSuccess', url: path})
    }
  }
}

/**
 * Executes the given code in the current environment / scope, runs
 * the corresponding callback when done
 *
 * @param {String} code to execute
 * @param {String} url of the script (for displaying the stack)
 */
var executeNormal = function(code, url, done) {
  try {
    require('vm').runInThisContext(code, url)
    done()
  } catch (e) {
    done(e)
  }
}

/**
 * Executes the given code in a jailed environment, runs the
 * corresponding callback when done
 *
 * @param {String} code to execute
 * @param {String} url of the script (for displaying the stack)
 */
var executeJailed = function(code, url, done) {
  var vm = require('vm')
  var sandbox = {}
  var expose = [
    'application',
    'setTimeout',
    'setInterval',
    'clearTimeout',
    'clearInterval'
  ]

  for (var i = 0; i < expose.length; i++) {
    sandbox[expose[i]] = global[expose[i]]
  }

  code = '"use strict";\n' + code
  try {
    vm.runInNewContext(code, vm.createContext(sandbox), url)
    done()
  } catch (e) {
    done(e)
  }
}

/**
 * Executes the given code in the jailed environment, sends the
 * corresponding message to the application site when succeeded/failed
 *
 * @param {String} code to execute
 */
var execute = function(code) {
  executeJailed(code, 'DYNAMIC PLUGIN', onExecute)

  function onExecute(error) {
    if (error) {
      printError(error.stack)
      return process.send({type: 'executeFailure', error: exportError(error)})
    }

    process.send({type: 'executeSuccess'})
  }
}

function loadScript(path, done) {
  if (isRemote(path)) {
    loadRemote(path, done)
  } else {
    try {
      done(null, loadLocal(path))
    } catch (e) {
      done(e)
    }
  }
}

/**
 * Checks if the given path is remote
 *
 * @param {String} path to check
 * @returns {Boolean} true if path is remote
 */
var isRemote = function(path) {
  return (path.substr(0, 7).toLowerCase() == 'http://' ||
  path.substr(0, 8).toLowerCase() == 'https://')
}

/**
 * Loads local file and
 *
 * @param {String} path of the file to read
 *
 * @returns {String} file contents
 */
var loadLocal = function(path) {
  return require("fs").readFileSync(path).toString()
}


/**
 * Downloads the script by remote url and provides its content as a
 * string to the callback
 *
 * @param {String} url of the remote module to load
 * @param {Function} sCb success callback
 * @param {Function} fCb failure callback
 */
var loadRemote = function(url, done) {
  var receive = function(res) {
    if (res.statusCode != 200) {
      var msg = 'Failed to load ' + url + '\n' +
        'HTTP responce status code: ' + res.statusCode
      printError(msg)
      done(new Error(msg))
    } else {
      var content = ''
      res.on('end', function() {
        done(null, content)
      })
      res.on(
        'readable',
        function() {
          var chunk = res.read()
          content += chunk.toString()
        }
      )
    }
  }

  try {
    require('http').get(url, receive).on('error', done)
  } catch (e) {
    done(e)
  }
}

function exportError(error) {
  if (error) return String(error).replace(__basedir, '')
  return null
}
/**
 * Prints error message and its stack
 *
 * @param {Object} msg stack provided by error.stack or a message
 */
function printError(msg) {
  console.error()
  console.error(msg)
}

/**
 * Connection object provided to the SandboxedSite constructor, plugin
 * site implementation for the Node.js environment
 */
var conn = {
  disconnect: function() {
    process.exit()
  },
  send: function(data) {
    process.send({type: 'message', data: data})
  },
  onMessage: function(h) {
    conn._messageHandler = h
  },
  _messageHandler: function() {
  },
  onDisconnect: function() {
  }
}

connection = conn

