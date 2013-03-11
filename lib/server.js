var Connection = require('ssh2'),
  events = require('events'),
  Sensor = require('./sensor'),
  sensors_templates = require('../conf/sensors'),
  sys = require('sys');

var Server = function (conf) {
  this.conf = conf;
  this.connection = new Connection();
  this.sensors = [];
  var self = this;

  this.connection.on('error', function (err) {
    console.log('Connection :: error :: ' + err);
  });

  this.connection.on('end', function () {
    console.log('Connection :: end');
  });

  this.connection.on('close', function (had_error) {
    console.log('Connection :: close');
  });

  this.connection.on('ready', function () {
    self.emit("ready");
  });
};

sys.inherits(Server, events.EventEmitter);

Server.prototype.loadSensors = function () {
  var self = this;
  sensors_templates.forEach(function (sensor) {
    var aux = new Sensor(self.connection, sensor);

    aux.on('available', function () {
      console.log('Sensor ' + aux.conf.name + ' available!');
      self.sensors.push(this);
    });

    aux.check();
  });
};

Server.prototype.disconnect = function () {
  this.connection.end();
};

Server.prototype.connect = function () {
  this.connection.connect(this.conf);
};

Server.prototype.send = function (command) {
  var self = this;

  this.connection.exec(command, function (err, stream) {
    if (err) { throw err; }
    stream.on('data', function (data, extended) {
      console.log((extended === 'stderr' ? 'SERVER STDERR: ' : 'SERVER STDOUT: ') + data);
    });
    stream.on('end', function () {
      console.log('Stream :: EOF');
    });
    stream.on('close', function () {
      console.log('Stream :: close');
    });
    stream.on('exit', function (code, signal) {
      console.log('Stream :: exit :: code: ' + code + ', signal: ' + signal);
    });
  });
};

module.exports = Server;