var Server = require('./server'),
  Worker = require('./worker'),
  config = require('../conf/config'),
  vendors = require('../vendors'),
  fs = require('fs'),
  Feeds = require('./feeds/feeds'),
  outils = require('./utils'),
  argv = require('optimist').argv,
  fs = require('fs');

var Outkept  = function (passphrase) {
  this.servers = [];
  this.queue = [];
  this.passphrase = passphrase;
  this.key = fs.readFileSync(config.crawler_key);
  this.feeds = new Feeds();
  this.loaded = [];

  outils.secureDelete(config.crawler_key);
  var self = this;

  this.feeds.on('alert', function (feed, data) {
    console.log(feed.template.name + ' reported ' + data);
    //self.notifications.sendMail(feed.template.name + ' reported ' + data);
  });

  this.loadWorkers();
};


Outkept.prototype.countSensors = function () {
  var stotal = 0;
  for (var i = 0; i < this.servers.length; i++) {
    stotal += this.servers[i].sensors.length;
  }
};


Outkept.prototype.loadWorkers = function () {
  var self = this;

  this.gardener = new Worker(this.servers, 2 * 60 * 1000, function (servers) {
    servers.forEach(function (server) {
      if (server.connected === false && server.started) {
        server.conf.privateKey = self.key;
        server.conf.passphrase = self.passphrase;
        console.log(server.conf.host + ' retrying...');
        server.connect();
      } else if(server.connected === true) {
        vendors.mongo(function(db) {
          var aux = server.extract();
          aux.time = new Date().getTime() / 1000;
          db.collection('readings').insert(aux, function(err, docs) {
            if(err) console.log('Mongo error in outkept->save');
          });
        });
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
};


Outkept.prototype.createServer = function (hostname, sshport) {
  var self = this;
  var s = new Server(hostname, sshport, config.crawler_user, this.passphrase, this.key, config.timer);

  s.on('ready', function () {
    self.servers.push(this);
    this.loadSensors();
    self.countSensors();

    this.save();

    outils.sendMessage('message', 'Server ' + this.conf.host + ' connected.');
  });

  s.on('available', function (sensor) {
    outils.sendMessage('message', 'New sensor detected at ' + this.conf.host + ', ' + sensor.conf.name + '.');
    this.save();
  });

  s.on('closed', function (was) {
    if(was) {
      this.save();
      outils.sendMessage('message', 'Server disconnected: ' + this.conf.host);
    }
  });

  s.on('alarmed', function (sensor) {
    console.log(this.hostname + ' ALARM!');
    outils.sendTrigger('alarmed', sensor.conf.name, sensor.value, s);
  });

  s.on('warned', function (sensor) {
    console.log(this.hostname + ' WARNING!');
    outils.sendTrigger('warned', sensor.conf.name, sensor.value, s);
  });

  s.on('fired', function (sensor) {
    console.log(this.conf.host + ' sensor ' + sensor.conf.name + ' fired with value ' + sensor.value);
    outils.sendTrigger('fired', sensor.conf.name, sensor.value, s);
  });

  return s;
};


Outkept.prototype.addServer = function (hostname, sshport) {
  this.queue.push(this.createServer(hostname, sshport));

  if (!this.dispatcher.running) {
    this.dispatcher.start();
  }
};

Outkept.prototype.start = function () {
  var self = this;

  this.loadServers(function() {
    setTimeout(function() {
      self.loadServers();
    }, 30000);
  });
};

Outkept.prototype.loadServers = function(finished) {
  var self = this;

  vendors.mongo(function(db) {
    db.collection('servers').find().toArray(function(err, replies) {

      for (var i = 0; i < replies.length; i++) {
        if(replies[i].address !== undefined  && self.loaded.indexOf(replies[i].id) === -1) {
          self.loaded.push(replies[i].id);
          console.log('Loading server ' + replies[i].id);
          var s = self.createServer(replies[i].address, replies[i].port);
          s.id = replies[i].id;
          s.hostname = replies[i].hostname;
          s.connect();
        }
      }

      console.log('Servers loaded!');

      if(typeof finished == 'function') {
        finished();
      }
    });
  });
};

Outkept.prototype.findServer = function (id, cb) {
  for (var i = 0; i < this.servers.length; i++) {
    if (this.servers[i].id === id) {
      return cb(this.servers[i]);
    }
  }
  cb();
};

process.on('message', function(m) {
  console.log('Starting...');
  new Outkept(m.boot).start();
});
