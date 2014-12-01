var prompt = require('prompt'),
  fs = require('fs'),
  outils = require('./lib/utils'),
  vendors = require('./vendors'),
  Runner = require('./lib/crawler/runner'),
  config = require('./conf/config'),
  Plugins = require('./plugins'),
  Feeds = require('./lib/feeds/feeds'),
  Loader = require('./loader');


var loadersMain = [],
  pluginsLoader,
  loaded = [],
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

  for (var i = 0; i < loadersMain.length; i++) {
    loadersMain[i].kill();
  }

  pluginsLoader.kill('SIGHUP');
  runnerCrawlers.kill('SIGHUP');
});

prompt.start();

function loadMain(passphrase, key, ids) {
  var l = new Loader(loadersMain.length, passphrase, key, ids);
  l.load();
  loadersMain.push(l);
  return l;
}

function loadFeeds() {
  var feeds = new Feeds();

  feeds.on('alert', function(feed, data) {
    console.log('Feed ' + feed.template.name + ' reported ' + data);
    outils.sendFeed(feed.template.name, data);
  });
}

prompt.get(schema, function(err, result) {
  if (err) return console.log(err);

  var passphrase = result.passphrase;
  var key = fs.readFileSync(config.crawler_key).toString('utf-8');
  outils.secureDelete(config.crawler_key);

  var l = loadMain(passphrase, key, []);

  vendors.mongo(function(db) {
    setInterval(function() {
      db.collection('servers').find().toArray(function(err, replies) {
        var ids = [];

        for (var i = 0; i < replies.length; i++) {
          if (loaded.indexOf(replies[i].id) === -1) {
            if (l.ids.length < 50) {
              l.loadServer(replies[i].id);
              loaded.push(replies[i].id);
            } else {
              l = loadMain(passphrase, key, []);
              l.loadServer(replies[i].id);
              loaded.push(replies[i].id);
            }
          }
        }
      });
    }, 30000);
  });

  runnerCrawlers = new Runner();
  runnerCrawlers.start(passphrase, key);

  pluginsLoader = new Plugins();
  pluginsLoader.load(passphrase, key);

  loadFeeds();
});
