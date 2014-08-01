var config = require('../../conf/config'),
  cp = require('child_process');

var Runner = function(passphrase, key) {
  this.passphrase = passphrase;
  this.key = key;
};

/*
this.crawlers = new Worker(this.servers, 7200 * 1000, function (servers) {
  self.crawl();
});
*/

Runner.prototype.start = function () {
  console.log('Crawlers starting up...');
  var self = this;

  config.ranges.forEach(function (range) {
    var loader = cp.fork('./lib/crawler/crawler.js');
    loader.send({
      'boot': self.passphrase,
      'key': self.key,
      'range': range
    });
  });
};

module.exports = Runner;
