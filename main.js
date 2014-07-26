var prompt = require('prompt'),
  fs = require('fs'),
  outils = require('./lib/utils'),
  cp = require('child_process'),
  vendors = require('./vendors'),
  Runner = require('./lib/crawler/runner');


var loaderMain,
  passphrase,
  shutting = false,
  schema = {
    properties: {
      passphrase: {
        hidden: true
      }
    }
  };

process.on('exit', function() {
  loaderMain.removeAllListeners('exit');
  loaderMain.kill('SIGHUP');
});

prompt.start();

function loadMain() {
  loaderMain = cp.fork('lib/outkept.js');
  loaderMain.send({ 'boot': passphrase });

  loaderMain.on('exit', function (code) {
    console.log('Main loader has exited ' + code);

    vendors.mongo(function(db) {
      db.collection('servers').update({}, {$set: {connected: false}}, { multi: true }, function() {
        loadMain();
      });
    });
  });
}

prompt.get(schema, function (err, result) {
  if (err) return console.log(err);

  passphrase = result.passphrase;
  loadMain();

  var runnerCrawlers = new Runner(passphrase);
  runnerCrawlers.start();
});
