var Station = require('./station'),
  express = require('express'),
  http = require('http'),

  cluster = require("cluster"),
  numCPUs = require("os").cpus().length;


var Network = function () {
  /*
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
  */
    var app = express();
    app.use(express.static('./public'));
    var http_server = http.createServer(app);

    var comm_server = new Station(http_server);

    http_server.listen(80);

    comm_server.start();
  //}
};

module.exports = Network;