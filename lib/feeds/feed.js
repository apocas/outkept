var FeedParser = require('feedparser'),
  request = require('request'),
  sys = require('sys'),
  events = require('events'),
  outils = require('../utils'),
  dns = require('dns');

var Feed = function (template) {
  this.template = template;
};

sys.inherits(Feed, events.EventEmitter);

Feed.prototype.start = function () {
  var self = this;
  this.interval = setInterval(function () { self.worker(); }, parseInt(self.template.interval, 10) * 60 * 1000);
};

Feed.prototype.stop = function () {
  clearInterval(this.interval);
};

Feed.prototype.worker = function () {
  var self = this;
  request(this.template.feed).pipe(new FeedParser()).on('article', function (article) {
    if (!self.template.verify) {
      self.emit('alert', article[self.template.field]);
    } else {
      var aux = JSON.stringify(article[self.template.field]).split('/');
      dns.resolve4(aux[2], function (err, addresses) {
        if (!err) {
          for (var i = 0; i < addresses.length; i++) {
            if(outils.contained(addresses[i])) {
              self.emit('alert', article[self.template.field]);
            }
          }
        }
      });
    }
  });
};

module.exports = Feed;