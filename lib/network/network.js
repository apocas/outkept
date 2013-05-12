var Station = require('./station'),
  sys = require('sys'),
  events = require('events'),
  express = require('express'),
  http = require('http'),
  redisl = require('redis'),

  cluster = require("cluster"),
  numCPUs = require("os").cpus().length;


var Network = function () {
  this.redis = redisl.createClient(6379, "127.0.0.1");

  if(cluster.isMaster) {
    i = 0;
    while (i < numCPUs) {
      cluster.fork();
      i++;
      cluster.on('fork', function (worker) {
        console.log('forked worker ' + worker.process.pid);
      });
      cluster.on("listening", function (worker, address) {
        console.log("worker " + worker.process.pid + " is now connected to " + address.address + ":" + address.port);
      });
      cluster.on("exit", function (worker, code, signal) {
        console.log("worker " + worker.process.pid + " died");
      });
    }
  } else {
    var app = express();
    app.use(express.static('./public'));
    this.http_server = http.createServer(app);

    this.comm_server = new Station(this.http_server, this.redis);
    var self = this;

    this.http_server.listen(80);

    this.comm_server.on('authenticated', function (client) {
      self.emit('authenticated', client);
    });

    this.comm_server.on('connected', function (client) {
      self.emit('connected', client);
    });

    this.comm_server.start();
  }
};

sys.inherits(Network, events.EventEmitter);

/*
Network.prototype.send = function (event, data) {
  this.comm_server.send(event, data);
};
*/

module.exports = Network;