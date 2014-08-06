var FeedParser = require('feedparser'),
  request = require('request'),
  sys = require('sys'),
  events = require('events'),
  outils = require('../utils'),
  dns = require('dns'),
  vendors = require('../../vendors');

var Feed = function (template) {
  this.template = template;
};

sys.inherits(Feed, events.EventEmitter);

Feed.prototype.start = function () {
  var self = this;

  this.interval = setInterval(function () {
      self.worker();
    }, parseInt(self.template.interval, 10) * 60 * 1000
  );
};

Feed.prototype.stop = function () {
  clearInterval(this.interval);
};

Feed.prototype.worker = function () {
  var self = this;
  var sfeed = request(self.template.feed);
  var feedparser = new FeedParser();

  sfeed.on('error', function(err) {
    self.emit('error', err);
  });

  sfeed.on('response', function(res) {
    if (res.statusCode != 200) return this.emit('error', new Error('Bad status code'));
    this.pipe(feedparser);
  });

  feedparser.on('error', function(error) {
    self.emit('error', err);
  });

  feedparser.on('readable', function () {
    var stream = this, item;

    while (item = stream.read()) {
      if (!self.template.verify) {
        self.trigger(item);
      } else {
        var aux = JSON.stringify(item['rss:' + self.template.field]['#']).split('/');
        dns.resolve4(aux[2], function (err, addresses) {
          if (!err) {
            for (var i = 0; i < addresses.length; i++) {
              if(outils.contained(addresses[i])) {
                self.trigger(item);
              }
            }
          }
        });
      }
    }
  });
};

Feed.prototype.trigger = function(item) {
  var self = this;
  vendors.mongo(function(db) {
    db.collection('feeds').findOne({url: item['rss:' + self.template.field]['#']}, function(err, feed) {
      if (feed === undefined || feed === null) {
        self.emit('alert', item['rss:' + self.template.field]['#']);

        db.collection('feeds').insert({date: Math.round(new Date().getTime()/1000.0), feed: self.template.name, url: item['rss:' + self.template.field]['#']}, function(err, docs) {
          if(err) console.log('Mongo error in feed->trigger');
        });
      }
    });
  });
};

module.exports = Feed;
