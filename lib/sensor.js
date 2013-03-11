var sys = require('sys'),
  events = require('events');

var Sensor = function (connection, conf) {
  this.connection = connection;
  this.conf = conf;
};

sys.inherits(Sensor, events.EventEmitter);

Sensor.prototype.check = function () {
  var self = this;

  this.connection.exec(self.conf.verifier, function (err, stream) {
    if (err) { throw err; }
    stream.on('data', function (data, extended) {
      console.log((extended === 'stderr' ? 'SENSOR STDERR: ' : 'SENSOR STDOUT: ') + data);
    });
  });
};

Sensor.prototype.run = function () {
  var self = this;

  this.connection.exec(self.command, function (err, stream) {
    if (err) { throw err; }
    stream.on('data', function (data, extended) {
      console.log((extended === 'stderr' ? 'STDERR: ' : 'STDOUT: ') + data);
    });
    stream.on('end', function () {
      console.log('Stream :: EOF');
    });
    stream.on('close', function () {
      console.log('Stream :: close');
    });
    stream.on('exit', function (code, signal) {
      console.log('Stream :: exit :: code: ' + code + ', signal: ' + signal);
      self.connection.end();
    });
  });
};