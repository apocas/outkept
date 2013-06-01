var Server = require('./server'),
  Crawler = require('./network/crawler'),
  Worker = require('./worker'),
  Notifications = require('./notifications'),
  config = require('../conf/config'),
  fs = require('fs'),
  redisl = require('redis'),
  Feeds = require('./feeds/feeds'),
  outils = require('./utils'),
  argv = require('optimist').argv,
  fs = require('fs');

var Outkept  = function (passphrase) {
  this.servers = [];
  this.queue = [];
  this.passphrase = passphrase;
  this.key = fs.readFileSync(config.crawler_key);
  this.notifications = new Notifications();
  this.redis = redisl.createClient(6379, "127.0.0.1");
  this.feeds = new Feeds();

  //outils.secureDelete(config.crawler_key);
  this.redis.hset('stats-' + outils.getHashDate(), 'sensors', 0);
  this.redis.del('messages');
  //this.redis.del('addresses');

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
      if(this.hostname.indexOf(" ") !== -1) {
        this.disconnect();
      } else {
        self.servers.push(this);
        this.loadSensors();
        self.redis.hset('stats-' + outils.getHashDate(), 'servers', self.servers.length);
        self.countSensors();

        outils.sendMessage(self.redis, 'message', 'Server ' + this.conf.host + ' found.');

        this.save(self.redis);
      }
      //console.log(hostname);
      self.redis.sadd('addresses', hostname);
    } else {
      if (server.conf.host !== this.conf.host) {
        server.ips.push(hostname);
        this.disconnect();
      }
    }
  });

  s.on('available', function (sensor) {
    outils.sendMessage(self.redis, 'message', 'New sensor detected at ' + this.conf.host + ', ' + sensor.conf.name + '.');
  });

  s.on('closed', function (was) {
    if(was) {
      this.connected = false;
      this.save(self.redis);

      outils.sendMessage(self.redis, 'message', 'Server disconnected: ' + this.conf.host);
    }
  });

  s.on('alarmed', function (sensor) {
    self.notifications.count('alarms');
    self.redis.hincrby('stats-' + outils.getHashDate(), 'alarmed', 1);
    console.log(this.hostname + ' ALARM!');

    outils.sendEvent(self.redis, 'trigger', 'alarmed', sensor.conf.name, sensor.value, s.hostname);
  });

  s.on('warned', function (sensor) {
    self.notifications.count('warnings');
    self.redis.hincrby('stats-' + outils.getHashDate(), 'warned', 1);
    console.log(this.hostname + ' WARNING!');

    outils.sendEvent(self.redis, 'trigger', 'warned', sensor.conf.name, sensor.value, s.hostname);
  });

  s.on('fired', function (sensor) {
    self.notifications.count('reactives');
    self.redis.hincrby('stats-' + outils.getHashDate(), 'reactives', 1);
    self.notifications.sendTwitter(s.conf.host + '(' +  s.hostname + ') sensor ' + sensor.conf.name + ' fired with ' + sensor.value + '!');
    console.log(this.conf.host + ' sensor ' + sensor.conf.name + ' fired with value ' + sensor.value);

    outils.sendEvent(self.redis, 'reactive', 'fired', sensor.conf.name, sensor.value, s.hostname);
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

  self.redis.sismember(['addresses', hostname], function (err, member) {
    if(member != 1) {
      self.queue.push(self.createServer(hostname, sshport));

      if (!self.dispatcher.running) {
        self.dispatcher.start();
      }
    }
  });
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
            if(obj.address !== undefined) {
              var s = self.createServer(obj.address, config.crawler_port);
              s.id = obj.id;
              s.hostname = obj.hostname;
              s.connect();
            }
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

Outkept.prototype.findServer = function (id) {
  for (var i = 0; i < this.servers.length; i++) {
    if (this.servers[i].id === id) {
      return this.servers[i];
    }
  }
};

fs.readFile('conf/.p', 'utf8', function (err,passphrase) {
  if (err) {
    return console.log(err);
  }
  new Outkept(passphrase).start();
});

