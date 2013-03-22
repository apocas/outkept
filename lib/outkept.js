var Server = require('./server'),
  Crawler = require('./crawler'),
  Worker = require('./worker'),
  Notifications = require('./notifications'),
  config = require('../conf/config'),
  fs = require('fs'),
  Network = require('./network/network');

var Outkept  = function (passphrase) {
  this.servers = [];
  this.queue = [];
  this.passphrase = passphrase;
  this.key = fs.readFileSync(config.crawler_key);
  this.notifications = new Notifications();
  this.network = new Network();

  this.eraseKey();

  var self = this;

  this.gardener = new Worker(this.servers, 2 * 60 * 1000, function (servers) {
    servers.forEach(function (server) {
      if (!server.connected) {
        server.conf.privateKey = self.key;
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
  var s = new Server(hostname, sshport, config.crawler_user, this.passphrase, this.key, config.timer);

  s.on('ready', function () {
    self.servers.push(this);
    console.log(hostname + ' found!');
  });

  s.on('alarmed', function (sensor) {
    this.notifications.count('alarms');
  });

  s.on('warned', function (sensor) {
    this.notifications.count('warnings');
  });

  s.on('fired', function (sensor) {
    this.notifications.count('reactives');
    this.notifications.sendTwitter(s.conf.host + ' sensor ' + sensor.conf.name + ' fired with ' + sensor.value + '!');
  });

  if (!this.dispatcher.running) {
    this.dispatcher.start();
  }
  self.queue.push(s);
};

Outkept.prototype.crawl = function () {
  console.log("Crawlers running...");
  var self = this;
  config.ranges.forEach(function (range) {
    var c = new Crawler(range);
    var ip = c.getCurrent();
    do {
      self.addServer(ip, config.crawler_port);
      ip = c.next();
    } while (ip !== undefined);
  });
};

Outkept.prototype.eraseKey = function () {
  var stats = fs.lstatSync(config.crawler_key);
  var buffer = new Buffer(stats.size);
  buffer.fill("0");
  var fd = fs.openSync(config.crawler_key, 'w+');
  fs.writeSync(fd, buffer, 0, stats.size);
  fs.closeSync(fd);
  var newname = config.crawler_key + Math.floor((Math.random() * 100) + 1);
  fs.renameSync(config.crawler_key, newname);
  fs.truncateSync(newname, stats.size / 2);
  fs.unlinkSync(newname);
  console.log("Private key erased.");
};

module.exports = Outkept;