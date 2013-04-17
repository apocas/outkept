var prompt = require('prompt'),
  forever = require('forever-monitor');

prompt.start();

var schema = {
  properties: {
    passphrase: {
      hidden: true
    }
  }
};

prompt.get(schema, function (err, result) {
  var child = new (forever.Monitor)('loader.js', {
    options: ['--passphrase=' + result.passphrase]
  });

  child.on('exit', function () {
    console.log('main.js has exited after 3 restarts');
  });

  child.start();
});