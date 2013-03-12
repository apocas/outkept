var Server = require('./server'),
  Crawler = require('./crawler'),
  config = require('../conf/config');


var Outkept  = function (passphrase) {
  this.servers = [];
  this.passphrase = passphrase;
};

Outkept.prototype.addServer = function (hostname, sshport) {
  var self = this;
  var s = new Server(hostname, sshport, self.passphrase);
  s.on('ready', function () {
    self.servers.push(this);
  });
  s.connect();
};

Outkept.prototype.crawl = function () {
  config.ranges.forEach(function (range){
    var c = new Crawler(range);
    var ip = c.getCurrent();
    do {
      this.addServer(ip, config.port);
      ip = c.next();
    } while (ip !== null);
  });
};

module.exports = Outkept;