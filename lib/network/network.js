var Station = require('./station'),
  sys = require('sys'),
  events = require('events'),
  express = require('express'),
  http = require('http');


var Network = function () {
  var app = express();
  app.use(express.static('./public'));
  this.http_server = http.createServer(app);

  this.comm_server = new Station(this.http_server);
  var self = this;

  this.http_server.listen(80);

  this.comm_server.on('authenticated', function (client) {
    self.emit('authenticated', client);
  });

  this.comm_server.on('connected', function (client) {
    self.emit('connected', client);
  });

  this.comm_server.start();
};

sys.inherits(Network, events.EventEmitter);

Network.prototype.send = function (event, data) {
  this.comm_server.send(event, data);
};

module.exports = Network;