var Server = require('./server'),
  Crawler = require('./crawler'),
  Worker = require('./worker'),
  Notifications = require('./notifications'),
  config = require('../conf/config'),
  fs = require('fs'),
  Network = require('./network/network'),
  redisl = require('redis'),
  Feeds = require('./feeds/feeds');

var Outkept  = function (passphrase) {
  this.servers = [];
  this.queue = [];
  this.passphrase = passphrase;
  this.key = fs.readFileSync(config.crawler_key);
  this.notifications = new Notifications();
  this.redis = redisl.createClient(6379, "127.0.0.1");
  this.network = new Network(this.redis);
  this.feeds = new Feeds();

  //this.eraseKey();
  this.redis.hset(this.getHashDate(), 'sensors', 0);

  var self = this;

  this.feeds.on('alert', function (feed, data) {
    self.redis.sismember(['feeds', data], function (err, member) {
      if(member != 1) {
        self.notifications.sendMail(feed.template.name + ' reported ' + data);
        self.redis.sadd('feeds', data);
        self.redis.hincrby(self.getHashDate(), 'feeds', 1);
      }
    });
  });

  this.network.on('authenticated', function (client) {
    self.sendStats(client);
    self.redis.sadd('sessions', client.sessionid);
  });

  //this.network.on('connected', function (client) {});

  this.loadWorkers();

  process.on('exit', function () {
    console.log('disconnecting...');
    self.servers.forEach(function (server) {
      server.disconnect();
    });
  });
};


Outkept.prototype.countSensors = function () {
  var stotal = 0;
  for (var i = 0; i < this.servers.length; i++) {
    stotal += this.servers[i].sensors.length;
  }
  this.redis.hset(this.getHashDate(), 'sensors', stotal);
};

Outkept.prototype.sendStats = function (client) {
  var self = this;
  this.redis.hgetall(this.getHashDate(), function (err, data) {
    if (client !== undefined) {
      client.emit('stats', data);
    } else {
      self.network.send('stats', data);
    }
  });
};


Outkept.prototype.loadWorkers = function () {
  var self = this;

  this.gardener = new Worker(this.servers, 2 * 60 * 1000, function (servers) {
    servers.forEach(function (server) {
      if (!server.connected) {
        server.conf.privateKey = self.key;
        server.conf.passphrase = self.passphrase;
        console.log(server.conf.host + " retrying...");
        server.connect();
      }
    });
  });

  this.dumper = new Worker(this.servers, 60 * 1000, function (servers) {
    servers.forEach(function (server) {
      if (server.connected) {
        self.redis.hmset('server-' + server.id, server.extract(false));
      }
    });
  });

  this.stats = new Worker(this.servers, 30 * 1000, function (servers) {
    self.sendStats();
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
};


Outkept.prototype.extract = function () {
  var aux = [];
  this.servers.forEach(function (server) {
    aux.push(server.extract());
  });

  return aux;
};


Outkept.prototype.addServer = function (hostname, sshport) {
  var self = this;
  var s = new Server(hostname, sshport, config.crawler_user, this.passphrase, this.key, config.timer);

  s.on('ready', function () {
    console.log(hostname + ' connected!');
    var server = self.findServer(this.id);
    if (server === undefined) {
      self.servers.push(this);
      this.loadSensors();
      self.redis.hset(self.getHashDate(), 'servers', self.servers.length);
      self.countSensors();
    } else {
      if (server.conf.host !== this.conf.host) {
        server.ips.push(hostname);
        this.disconnect();
      }
    }
  });

  s.on('alarmed', function (sensor) {
    self.notifications.count('alarms');
    self.redis.hincrby(self.getHashDate(), 'alarmed', 1);
    console.log(this.hostname + ' ALARM!');
  });

  s.on('warned', function (sensor) {
    self.notifications.count('warnings');
    self.redis.hincrby(self.getHashDate(), 'warned', 1);
    console.log(this.hostname + ' WARNING!');
  });

  s.on('fired', function (sensor) {
    self.notifications.count('reactives');
    self.redis.hincrby(self.getHashDate(), 'reactives', 1);
    self.notifications.sendTwitter(s.conf.host + '(' +  s.hostname + ') sensor ' + sensor.conf.name + ' fired with ' + sensor.value + '!');
    console.log(this.conf.host + ' sensor ' + sensor.conf.name + ' fired with value ' + sensor.value);
  });

  s.on('data', function () {
    var aux = s.extract();
    if (aux.remove || aux.status === 'warned' || aux.status === 'alarmed') {
      self.network.send('server', aux);
      aux.remove = false;
    }
  });

  self.queue.push(s);

  if (!this.dispatcher.running) {
    this.dispatcher.start();
  }
};

Outkept.prototype.start = function () {
  var self = this;
  this.load(function() {
    self.crawl();
  });
};

Outkept.prototype.load = function(finished) {
  var self = this;
  this.redis.keys("server-*", function (err, replies) {
    self.redis.mget(replies, function () {
      for (var i = 0; i < replies.length; i++) {
        self.redis.hgetall(replies[i], function (err, obj) {
          console.log("Loading " + obj.address);
          self.addServer(obj.address, config.crawler_port);
        });
      }
      finished();
    });
  });
};

Outkept.prototype.crawl = function () {
  console.log('Crawlers running...');
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


Outkept.prototype.getHashDate = function () {
  var currentTime = new Date();
  var month = currentTime.getMonth() + 1;
  var day = currentTime.getDate();
  var year = currentTime.getFullYear();
  return '' + day + month + year;
};


Outkept.prototype.eraseKey = function () {
  var stats = fs.lstatSync(config.crawler_key);
  var buffer = new Buffer(stats.size);
  buffer.fill('0');
  var fd = fs.openSync(config.crawler_key, 'w+');
  fs.writeSync(fd, buffer, 0, stats.size);
  fs.closeSync(fd);
  var newname = config.crawler_key + Math.floor((Math.random() * 100) + 1);
  fs.renameSync(config.crawler_key, newname);
  fs.truncateSync(newname, stats.size / 2);
  fs.unlinkSync(newname);
  console.log("Private key erased.");
};


Outkept.prototype.findServer = function (id) {
  for (var i = 0; i < this.servers.length; i++) {
    if (this.servers[i].id === id) {
      return this.servers[i];
    }
  }
};

module.exports = Outkept;