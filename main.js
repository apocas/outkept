var prompt = require('prompt'),
  forever = require('forever-monitor'),
  fs = require('fs'),
  outils = require('./lib/utils');

prompt.start();

var schema = {
  properties: {
    passphrase: {
      hidden: true
    }
  }
};

prompt.get(schema, function (err, result) {
  fs.writeFile('conf/.p', result.passphrase, function (err) {
    if (err) return console.log(err);

    var loader = new (forever.Monitor)('lib/outkept.js').on('exit', function () {
      console.log('Loader has exited!');
    });

    var network = new (forever.Monitor)('lib/network/network.js').on('exit', function () {
      console.log('Network has exited!');
    });

    loader.start();
    network.start();
  });
});

process.on('exit', function () {
  outils.secureDelete('conf/.p');
});