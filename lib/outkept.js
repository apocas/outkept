var Server = require('./server'),
  config = require('../conf/config'),
  vendors = require('../vendors'),
  outils = require('./utils'),
  async = require('async');

var Outkept  = function (passphrase, key) {
  this.servers = [];
  this.queue = [];
  this.passphrase = passphrase;
  this.key = key;

  this.loadGardeners();
};


Outkept.prototype.loadGardeners = function () {
  var self = this;

  setInterval(function() {
    self.servers.forEach(function (server) {
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
  }, 2 * 60 * 1000);
};


Outkept.prototype.createServer = function (hostname, sshport) {
  var self = this;
  var s = new Server(hostname, sshport, config.crawler_user, this.passphrase, this.key, config.timer);

  s.on('ready', function () {
    this.loadSensors();
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

Outkept.prototype.start = function () {
  this.loadServers();
};

Outkept.prototype.loadServers = function() {
  var self = this;

  vendors.mongo(function(db) {
    db.collection('servers').find().toArray(function(err, replies) {

      async.mapLimit(replies, 3, function(server, callback) {
        if(server.address !== undefined  && self.findServer(server.id) === undefined) {
          console.log('Loading server: ' + server.id);
          var s = self.createServer(server.address, server.port);
          s.id = server.id;
          s.hostname = server.hostname;

          s.once('loaded', function() {
            console.log('Server loaded: ' + this.id);
            self.servers.push(s);
            callback();
          });

          s.once('closed', function(connected) {
            callback();
          });

          s.once('offline', function(err) {
            console.log(err);
          });

          s.connect();
        } else {
          callback();
        }
      }, function(err, results) {
        console.log('Servers loaded!');

        setTimeout(function() {
          self.loadServers();
        }, 30000);
      });
    });
  });
};

Outkept.prototype.findServer = function (id, cb) {
  for (var i = 0; i < this.servers.length; i++) {
    if (this.servers[i].id === id) {
      return this.servers[i];
    }
  }
};

process.on('message', function(m) {
  console.log('Starting...');
  new Outkept(m.boot, m.key).start();
});
