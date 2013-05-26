var Server = require('./server'),
  Crawler = require('./network/crawler'),
  Worker = require('./worker'),
  Notifications = require('./notifications'),
  config = require('../conf/config'),
  fs = require('fs'),
  redisl = require('redis'),
  Feeds = require('./feeds/feeds'),
  outils = require('./utils'),
  argv = require('optimist').argv;

var Outkept  = function (passphrase) {
  this.servers = [];
  this.queue = [];
  this.passphrase = passphrase;
  this.key = fs.readFileSync(config.crawler_key);
  this.notifications = new Notifications();
  this.redis = redisl.createClient(6379, "127.0.0.1");
  this.feeds = new Feeds();

  //this.eraseKey();
  this.redis.hset('stats-' + outils.getHashDate(), 'sensors', 0);
  this.redis.del('messages');

  var self = this;

  this.feeds.on('alert', function (feed, data) {
    self.redis.sismember(['feeds', data], function (err, member) {
      if(member != 1) {
        self.notifications.sendMail(feed.template.name + ' reported ' + data);
        self.redis.sadd('feeds', data);
        self.redis.hincrby('stats-' + outils.getHashDate(), 'feeds', 1);
      }
    });
  });

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
  this.redis.hset('stats-' + outils.getHashDate(), 'sensors', stotal);
};


Outkept.prototype.loadWorkers = function () {
  var self = this;

  this.gardener = new Worker(this.servers, 2 * 60 * 1000, function (servers) {
    servers.forEach(function (server) {
      if (!server.connected && server.started) {
        server.conf.privateKey = self.key;
        server.conf.passphrase = self.passphrase;
        console.log(server.conf.host + " retrying...");
        server.connect();
      }
    });
  });

  this.crawlers = new Worker(this.servers, 7200 * 1000, function (servers) {
    self.crawl();
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


Outkept.prototype.createServer = function (hostname, sshport) {
  var self = this;
  var s = new Server(hostname, sshport, config.crawler_user, this.passphrase, this.key, config.timer);

  s.on('ready', function () {
    var server = self.findServer(this.id);
    if (server === undefined) {
      self.servers.push(this);
      this.loadSensors();
      self.redis.hset('stats-' + outils.getHashDate(), 'servers', self.servers.length);
      self.countSensors();

      var auxx = {};
      auxx.type = 'message';
      auxx.message = 'Server ' + this.conf.host + ' found.';
      auxx.date = Math.round(new Date().getTime()/1000.0);
      self.redis.lpush('messages', JSON.stringify(auxx));
    } else {
      if (server.conf.host !== this.conf.host) {
        server.ips.push(hostname);
        this.disconnect();
      }
    }

    var auxs = this.extract();
    delete auxs.sensors;
    self.redis.hmset('server-' + this.id, auxs);
  });

  s.on('available', function (sensor) {
    var auxx = {};
    auxx.type = 'message';
    auxx.message = 'New sensor detected at ' + this.conf.host + ', ' + sensor.conf.name + '.';
    auxx.date = Math.round(new Date().getTime()/1000.0);
    self.redis.lpush('messages', JSON.stringify(auxx));
  });

  s.on('close', function (was) {
    var auxs = this.extract();
    delete auxs.sensors;
    if(was) {
      self.redis.hmset('server-' + this.id, auxs);
    }
  });

  s.on('alarmed', function (sensor) {
    self.notifications.count('alarms');
    self.redis.hincrby('stats-' + outils.getHashDate(), 'alarmed', 1);
    console.log(this.hostname + ' ALARM!');

    var auxx = {};
    auxx.type = 'trigger';
    auxx.level = 'alarmed';
    auxx.sensor = sensor.conf.name;
    auxx.value = sensor.value;
    auxx.hostname = s.hostname;
    auxx.date = Math.round(new Date().getTime()/1000.0);
    self.redis.lpush('messages', JSON.stringify(auxx));
  });

  s.on('warned', function (sensor) {
    self.notifications.count('warnings');
    self.redis.hincrby('stats-' + outils.getHashDate(), 'warned', 1);
    console.log(this.hostname + ' WARNING!');

    var auxx = {};
    auxx.type = 'trigger';
    auxx.level = 'warned';
    auxx.sensor = sensor.conf.name;
    auxx.value = sensor.value;
    auxx.hostname = s.hostname;
    auxx.date = Math.round(new Date().getTime()/1000.0);
    self.redis.lpush('messages', JSON.stringify(auxx));
  });

  s.on('fired', function (sensor) {
    self.notifications.count('reactives');
    self.redis.hincrby('stats-' + outils.getHashDate(), 'reactives', 1);
    self.notifications.sendTwitter(s.conf.host + '(' +  s.hostname + ') sensor ' + sensor.conf.name + ' fired with ' + sensor.value + '!');
    console.log(this.conf.host + ' sensor ' + sensor.conf.name + ' fired with value ' + sensor.value);

    var auxx = {};
    auxx.type = 'reactive';
    auxx.level = 'fired';
    auxx.sensor = sensor.conf.name;
    auxx.value = sensor.value;
    auxx.hostname = s.hostname;
    auxx.date = Math.round(new Date().getTime()/1000.0);
    self.redis.lpush('messages', JSON.stringify(auxx));
  });

  s.on('data', function (sensor) {
    var aux = this.extract();
    var auxs = aux.sensors;
    self.redis.hset('server-' + this.id, 'status', aux.status);
    for (var i = 0; i < auxs.length; i++) {
      if(auxs[i].name == sensor.conf.name) {
        self.redis.hmset('sensors-' + this.id + '-' + i, auxs[i]);
        break;
      }
    }
  });

  return s;
};


Outkept.prototype.addServer = function (hostname, sshport) {
  var self = this;
  this.queue.push(self.createServer(hostname, sshport));

  if (!this.dispatcher.running) {
    this.dispatcher.start();
  }
};

Outkept.prototype.start = function () {
  var self = this;
  this.loadServers();
};

Outkept.prototype.loadServers = function(finished) {
  var self = this;
  this.redis.keys("server-*", function (err, replies) {
    self.redis.mget(replies, function () {
      if(replies.length !== 0) {
        for (var i = 0; i < replies.length; i++) {
          self.redis.hgetall(replies[i], function (err, obj) {
            var s = self.createServer(obj.address, config.crawler_port);
            s.id = obj.id;
            s.hostname = obj.hostname;
            s.connect();
          });
        }
      }
      console.log("Servers loaded!");
      self.crawl();
      if(typeof finished == "function") {
        finished();
      }
    });
  });
};

Outkept.prototype.crawl = function () {
  console.log('Crawlers running...');
  var self = this;
  config.ranges.forEach(function (range) {
    var c = new Crawler(range);
    do {
      if(config.crawler_port instanceof Array) {
        for (var i = 0; i < config.crawler_port.length; i++) {
          self.addServer(c.getCurrent(), config.crawler_port[i]);
        }
      } else {
        self.addServer(c.getCurrent(), config.crawler_port);
      }
    } while (c.next() !== undefined);
  });
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


new Outkept(argv.passphrase).start();