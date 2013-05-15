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
  var loader = new (forever.Monitor)('lib/outkept.js', {
    options: ['--passphrase=' + result.passphrase]
  }).on('exit', function () {
    console.log('Loader has exited!');
  });

  var network = new (forever.Monitor)('lib/network/network.js').on('exit', function () {
    console.log('Network has exited!');
  });

  loader.start();
  network.start();
});