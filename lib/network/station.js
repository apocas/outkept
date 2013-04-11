var sys = require('sys'),
  events = require('events'),
  socketio = require('socket.io'),
  config = require('../../conf/config');

function Station(listener) {
  this.listener = listener;
  this.clients = [];
}

sys.inherits(Station, events.EventEmitter);

Station.prototype.start = function () {
  var self = this;
  var io = socketio.listen(this.listener, {
    log: false
  });

  io.sockets.on('connection', function (socket) {
    self.clients.push(socket);
    self.emit('connected', socket);
    console.log("Client connected!");

    socket.on('disconnect', function () {
      self.removeClient(this);
      self.emit('disconnected', this);
    });

    socket.on('authenticate', function (credentials) {
      this.authenticated = self.authenticate(credentials);
      console.log("AUTH: " + socket.authenticated);
      this.emit('authentication', socket.authenticated);
    });

    socket.on('rendered', function (credentials) {
      if(socket.authenticated === true) {
        this.rendered = true;
        self.emit('authenticated', socket);
      }
    });

  });
};

Station.prototype.send = function (event, data) {
  this.clients.forEach(function (client) {
    if (client.authenticated && client.rendered) {
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