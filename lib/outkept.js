var Server = require('./server'),
  config = require('../conf/config'),
  vendors = require('../vendors'),
  outils = require('./utils'),
  async = require('async');

var Outkept = function(id, passphrase, key, ids) {
  this.servers = [];
  this.queue = [];
  this.passphrase = passphrase;
  this.key = key;
  this.ids = ids;
  this.id = id;
};


Outkept.prototype.loadGardeners = function() {
  var self = this;

  setInterval(function() {
    vendors.mongo(function(db) {

      async.mapSeries(self.servers, function(server, callback) {
        if (server.connected === false && server.started) {
          server.conf.privateKey = self.key;
          server.conf.passphrase = self.passphrase;
          console.log(self.id + ' - ' + server.conf.host + ' retrying...');
          server.connect();
        } else if (server.connected === true) {
          var aux = server.extract();
          aux.time = parseInt(new Date().getTime() / 1000);
          db.collection('readings').insert(aux, function(err, docs) {
            if (err) console.log(self.id + ' - Mongo error in outkept->save');
          });
        }
        callback();
      }, function(err, results) {});

      async.mapSeries(self.ids, function(id, callback) {
        db.collection('servers').findOne({
          'id': id
        }, function(err, server) {
          var now = parseInt(new Date().getTime() / 1000);
          if (server && (!server.pinged || now - server.pinged > 345600)) {
            db.collection('servers').remove({
              'id': server.id
            }, function(err, removed) {
              if (removed) {
                console.log('Server ' + server.id + ' removed after 4 days.');
                outils.sendMessage('message', 'Server ' + server.id + ' removed after 4 days.');
              }
            });
          }
          callback();
        });
      }, function(err, results) {});

    });
  }, 120000);
};


Outkept.prototype.createServer = function(hostname, sshport) {
  var self = this;
  var s = new Server(hostname, sshport, config.crawler_user, this.passphrase, this.key, config.timer);

  s.on('ready', function() {
    this.loadSensors();
    outils.sendMessage('message', 'Server ' + this.conf.host + ' connected.');
  });

  s.on('available', function(sensor) {
    outils.sendMessage('message', 'New sensor detected at ' + this.conf.host + ', ' + sensor.conf.name + '.');
    this.save();
  });

  s.on('closed', function(was) {
    if (was) {
      this.save();
      outils.sendMessage('message', 'Server disconnected: ' + this.conf.host);
    }
  });

  s.on('alarmed', function(sensor) {
    console.log(self.id + ' - ' + this.hostname + ' ALARM!');
    outils.sendTrigger('alarmed', sensor.conf.name, sensor.value, s);
  });

  s.on('warned', function(sensor) {
    console.log(self.id + ' - ' + this.hostname + ' WARNING!');
    outils.sendTrigger('warned', sensor.conf.name, sensor.value, s);
  });

  s.on('fired', function(sensor) {
    console.log(self.id + ' - ' + this.conf.host + ' sensor ' + sensor.conf.name + ' fired with value ' + sensor.value);
    outils.sendTrigger('fired', sensor.conf.name, sensor.value, s);
  });

  return s;
};

Outkept.prototype.start = function() {
  this.loadServers();
  this.loadGardeners();
};

Outkept.prototype.loadServers = function() {
  var self = this;

  vendors.mongo(function(db) {
    async.mapLimit(self.ids, 5, function(id, callback) {
      db.collection('servers').findOne({
        id: id
      }, function(err, server) {
        if (server && server.address !== undefined && self.findServer(server.id) === undefined) {
          console.log(self.id + ' - Loading server: ' + server.id);
          var s = self.createServer(server.address, server.port);
          s.id = server.id;
          s.hostname = server.hostname;

          s.once('loaded', function() {
            console.log(self.id + ' - Server loaded: ' + this.id);
            self.servers.push(s);
            callback();
          });

          s.once('closed', function(connected) {
            callback();
          });

          s.once('offline', function(err) {
            console.log(self.id + ' - ' + this.id + ' - ' + err);
          });

          s.connect();
        } else {
          callback();
        }
      });
    }, function(err, results) {
      //console.log(self.id + ' - Servers loaded!');

      setTimeout(function() {
        self.loadServers();
      }, 60000);
    });
  });
};

Outkept.prototype.findServer = function(id, cb) {
  for (var i = 0; i < this.servers.length; i++) {
    if (this.servers[i].id === id) {
      return this.servers[i];
    }
  }
};


var main;
process.on('message', function(m) {
  if (m.boot) {
    console.log(m.id + ' - Starting...');
    main = new Outkept(m.id, m.boot, m.key, m.ids);
    main.start();
  } else if (m.server) {
    main.ids.push(m.server);
  }
});
