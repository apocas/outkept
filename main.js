var prompt = require('prompt'),
  fs = require('fs'),
  outils = require('./lib/utils'),
  cp = require('child_process'),
  vendors = require('./vendors'),
  Runner = require('./lib/crawler/runner'),
  config = require('./conf/config');


var loaderMain,
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

function loadMain(passphrase, key) {
  loaderMain = cp.fork('lib/outkept.js');
  loaderMain.send({ 'boot': passphrase,  'key': key});

  loaderMain.on('exit', function (code) {
    console.log('Main loader has exited ' + code);

    vendors.mongo(function(db) {
      db.collection('servers').update({}, {$set: {connected: false}}, { multi: true }, function() {
        loadMain(passphrase, key);
      });
    });
  });
}

prompt.get(schema, function (err, result) {
  if (err) return console.log(err);

  var passphrase = result.passphrase;
  var key = fs.readFileSync(config.crawler_key).toString('utf-8');
  outils.secureDelete(config.crawler_key);

  loadMain(passphrase, key);

  var runnerCrawlers = new Runner(passphrase, key);
  runnerCrawlers.start();
});
