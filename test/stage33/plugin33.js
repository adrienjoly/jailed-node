var api = {
  returnError: function(cb) {
    setTimeout(
      function() {
        cb(new Error('Error message'))
      }, 100
    )
  }
}

application.setInterface(api)
