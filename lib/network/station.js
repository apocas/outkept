var sys = require('sys'),
  events = require('events'),
  config = require('../../conf/config'),
  crypto = require('crypto'),
  outils = require('../utils'),
  Worker = require('../worker'),
  shoe = require('shoe'),
  duplexEmitter = require('duplex-emitter'),
  redisl = require('redis');

function Station(listener) {
  this.listener = listener;
  this.clients = [];
  this.redis = redisl.createClient();
}

sys.inherits(Station, events.EventEmitter);

Station.prototype.start = function () {
  var self = this;

  var sock = shoe(function (stream) {

    var socket = duplexEmitter(stream);
    self.clients.push(socket);
    self.emit('connected', socket);

    socket.on('disconnect', function () {
      self.removeClient(socket);
      self.emit('disconnected', socket);
      console.log("Client disconnected!");
    });

    socket.on('authenticate', function (credentials) {
        if (credentials.sessionid !== undefined) {
          self.redis.sismember(['sessions', credentials.sessionid], function (err, member) {
            if (member == 1) {
              socket.authenticated = true;
              console.log("Client authenticated!");
              socket.sessionid = credentials.sessionid;
              socket.emit('authentication', {'result': socket.authenticated, 'sessionid': socket.sessionid});
              self.sendStats(socket);
            } else {
              socket.emit('authentication', {'result': false});
            }
          });
        } else {
          socket.authenticated = self.authenticate(credentials);
          if (socket.authenticated === true) {
            console.log("Client authenticated!");
            var md5sum = crypto.createHash('md5');
            var d = new Date();
            md5sum.update(credentials.password + ':' + credentials.username + ':' + d.getTime());
            socket.sessionid = md5sum.digest('hex');
            socket.emit('authentication', {'result': socket.authenticated, 'sessionid': socket.sessionid});

            self.redis.sadd('sessions', socket.sessionid);

            self.emit('authenticated', socket);
            self.sendStats(socket);
          }
        }
        self.loadWorkers();
    });
  });

  sock.install(this.listener, '/websocket');

};

Station.prototype.loadWorkers = function() {
  var self = this;

  this.stats = new Worker(this.servers, 30 * 1000, function (servers) {
    self.sendStats();
  });

  this.pusher = new Worker(this.servers, 6 * 1000, function (servers) {
    self.redis.keys('server-*', function (err, replies) {
      self.redis.mget(replies, function () {
        for (var i = 0; i < replies.length; i++) {
          self.redis.hgetall(replies[i], function (err, obj) {

            self.redis.keys('sensors-' + obj.id + '-*', function (err, replies2) {

              var redis_multi = self.redis.multi();

              for (var i = 0; i < replies2.length; i++) {
                redis_multi.hgetall('sensors-' + obj.id + '-' + i);
              }

              redis_multi.exec(function (err, replies3) {
                obj.sensors = [];
                for (var i = 0; i < replies3.length; i++) {
                  obj.sensors.push(replies3[i]);
                }
                self.send('server', obj);
              });

            });
          });
        }
      });
    });
  });
};

Station.prototype.send = function (event, data) {
  //this.io.sockets.clients().forEach(function (client) {
  this.clients.forEach(function (client) {
    if (client.authenticated) {
      client.emit(event, data);
    }
  });
};

Station.prototype.sendStats = function (client) {
  var self = this;
  this.redis.hgetall('stats-' + outils.getHashDate(), function (err, data) {
    if (client !== undefined) {
      client.emit('stats', data);
    } else {
      self.send('stats', data);
    }
  });
};

Station.prototype.authenticate = function (credentials) {
  if (credentials.username === config.web_user && credentials.password === config.web_password) {
    return true;
  }
  return false;
};

Station.prototype.removeClient = function (rclient) {
  for (i = 0; i < this.clients.length; i++) {
    if (this.clients[i].id === rclient.id) {
      this.clients.splice(i, 1);
      i = this.clients.length + 1;
    }
  }
};

module.exports = Station;