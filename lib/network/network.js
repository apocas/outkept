var http = require('http'),
  ecstatic = require('ecstatic'),
  Station = require('./station'),
  sys = require('sys'),
  events = require('events');


var Network = function () {
  this.http_server = http.createServer();
  this.static_server = ecstatic('./public');
  this.comm_server = new Station(this.http_server);
  var self = this;

  this.http_server.on('request', this.static_server);

  this.http_server.listen(80, function () {
    console.log('HTTP Server booted...');
  });

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