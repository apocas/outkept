var sys = require('sys'),
  events = require('events'),
  shoe = require('shoe'),
  duplexEmitter = require('duplex-emitter'),
  config = require('../../conf/config'),
  crypto = require('crypto');

function Station(listener, redis) {
  this.listener = listener;
  this.clients = [];
  this.redis = redis;
}

sys.inherits(Station, events.EventEmitter);

Station.prototype.start = function () {
  var self = this;

  var sock = shoe(function (stream) {

    stream.on('error', function () {
      console.log('STREAM ERROR!!!!!!!!!!!!!');
    });

    var socket = duplexEmitter(stream);
    self.clients.push(socket);
    self.emit('connected', socket);
    console.log("Client connected!");

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
          self.emit('authenticated', socket);
        }
      }
    });

  });

  sock.install(this.listener, '/websocket');
};

Station.prototype.send = function (event, data) {
  this.clients.forEach(function (client) {
    if (client.authenticated) {
      client.emit(event, data);
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