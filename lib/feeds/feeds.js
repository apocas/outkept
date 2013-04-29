var feeds_templates = require('../../conf/feeds'),
  sys = require('sys'),
  events = require('events'),
  Feed = require('./feed');

var Feeds = function () {
  this.feeds = [];
  var self = this;

  feeds_templates.forEach(function (feed_template) {
    var feed = new Feed(feed_template);

    feed.on('alert', function (data) {
      self.emit('alert', this, data);
    });

    feed.start();
    self.feeds.push(feed);
  });
};

sys.inherits(Feeds, events.EventEmitter);

module.exports = Feeds;