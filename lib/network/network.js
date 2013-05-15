var Station = require('./station'),
  express = require('express'),
  http = require('http'),
  outils = require('../utils'),
  redisl = require('redis');

var Network = function () {
  var app = express();
  app.use(express.static('./public'));
  var http_server = http.createServer(app);
  this.redis = redisl.createClient();
  var comm_server = new Station(http_server);

  var self = this;

  /*
  app.get('/timeline', function (req, res) {
    self.buildTimeline(function (jsono) {
      var jj = JSON.stringify(jsono);
      res.writeHead(200, {'Content-Length': jj.length, 'Content-Type': 'application/json'});
      res.end(jj);
      //res.json(200, jsono);
    });
  });
  */

  http_server.listen(80);

  comm_server.start();
};

Network.prototype.buildTimeline = function(callback) {
  var payload = {};
  payload.timeline = {};
  payload.timeline.headline = "Event history";
  payload.timeline.type = "default";
  payload.timeline.text = "Events over time";

  var args1 = [ 'messages', '-200', '-1' ];
  this.redis.lrange(args1, function (err, response) {
    payload.timeline.startDate = outils.dateFormat(new Date(), "%Y,%m,%d", true);
    payload.timeline.date = [];
    for (var i = 0; i < response.length; i++) {
      var ooo = JSON.parse(response[i]);
      var d = new Date(0);
      d.setUTCSeconds(ooo.date);
      payload.timeline.date.push({
        "startDate": outils.dateFormat(d, "%Y,%m,%d,%H,%M", true),
        "headline": ooo.hostname,
        "text": "<p>Sensor " + ooo.sensor + " " + ooo.level + " at " + ooo.hostname + " with value " + ooo.value + "</p>",
        "asset":
        {
          "media":"",
          "credit":"",
          "caption":""
        }
      });
    }
    callback(payload);
  });
};

new Network();