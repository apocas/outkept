var config = require('../../conf/config'),
  cp = require('child_process');

var Runner = function() {
  this.crawlers = [];
};

Runner.prototype.start = function (passphrase, key) {
  console.log('Crawlers starting up...');
  var self = this;

  config.ranges.forEach(function (range) {
    var loader = cp.fork('./lib/crawler/crawler.js');
    loader.send({
      'boot': passphrase,
      'key': key,
      'range': range
    });
    self.crawlers.push(loader);
  });
};

Runner.prototype.kill = function(type) {
  for (var i = 0; i < this.crawlers.length; i++) {
    this.crawlers[i].kill(type);
  }
};

module.exports = Runner;
