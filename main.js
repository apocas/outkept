var prompt = require('prompt'),
  fs = require('fs'),
  outils = require('./lib/utils'),
  cp = require('child_process'),
  vendors = require('./vendors'),
  Runner = require('./lib/crawler/runner'),
  config = require('./conf/config'),
  Workers = require('./workers'),
  Feeds = require('./lib/feeds/feeds');


var loaderMain,
  workersLoader,
  runnerCrawlers,
  shutting = false,
  schema = {
    properties: {
      passphrase: {
        hidden: true
      }
    }
  };

process.on('exit', function() {
  console.log('Killing everything...');
  loaderMain.removeAllListeners('exit');
  loaderMain.kill('SIGHUP');
  workersLoader.kill('SIGHUP');
  runnerCrawlers.kill('SIGHUP');
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

function loadFeeds() {
  var feeds = new Feeds();

  feeds.on('alert', function (feed, data) {
    //console.log(feed.template.name + ' reported ' + data);
    outils.sendFeed(feed.template.name, data);
  });
}

prompt.get(schema, function (err, result) {
  if (err) return console.log(err);

  var passphrase = result.passphrase;
  var key = fs.readFileSync(config.crawler_key).toString('utf-8');
  outils.secureDelete(config.crawler_key);

  loadMain(passphrase, key);

  runnerCrawlers = new Runner();
  runnerCrawlers.start(passphrase, key);

  workersLoader = new Workers();
  workersLoader.load(passphrase, key);

  loadFeeds();
});
