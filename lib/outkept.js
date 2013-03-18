var Server = require('./server'),
  Crawler = require('./crawler'),
  Worker = require('./worker'),
  config = require('../conf/config');


var Outkept  = function (passphrase) {
  this.servers = [];
  this.queue = [];
  this.passphrase = passphrase;

  var self = this;

  this.gardener = new Worker(this.servers, 2 * 60 * 1000, function (servers) {
    servers.forEach(function (server) {
      if (!server.connected) {
        console.log(server.conf.host + " retrying...");
        server.connect();
      }
    });
  });

  this.dispatcher = new Worker(this.queue, 250, function (servers) {
    var saux = servers.shift();
    if (servers.length < 1) {
      this.stop();
    }
    if (saux !== undefined) {
      saux.connect();
    }
  });

  process.on('exit', function () {
    console.log('disconnecting...');
    self.servers.forEach(function (server) {
      server.disconnect();
    });
  });
};

Outkept.prototype.addServer = function (hostname, sshport) {
  var self = this;
  var s = new Server(hostname, sshport, self.passphrase);
  s.on('ready', function () {
    self.servers.push(this);
    console.log(hostname + ' found!');
  });
  if (!this.dispatcher.running) {
    this.dispatcher.start();
  }
  self.queue.push(s);
};

Outkept.prototype.run = function () {
  var self = this;
  this.interval = setInterval(function () { self.worker(); }, 250);
};

Outkept.prototype.crawl = function () {
  var self = this;
  config.ranges.forEach(function (range) {
    var c = new Crawler(range);
    var ip = c.getCurrent();
    do {
      self.addServer(ip, config.port);
      ip = c.next();
    } while (ip !== undefined);
  });
};

module.exports = Outkept;