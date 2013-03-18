var Connection = require('ssh2'),
  events = require('events'),
  Sensor = require('./sensor'),
  sensors_templates = require('../conf/sensors'),
  config = require('../conf/config'),
  process = require('process'),
  sys = require('sys');

var Server = function (hostname, sshport, password) {
  var self = this;
  this.conf = {
    host: hostname,
    port: sshport,
    username: config.crawler_user,
    passphrase: password,
    privateKey: require('fs').readFileSync(config.crawler_key)
  };
  this.connection = new Connection();
  this.sensors = [];
  this.connected = false;

  this.connection.on('error', function (err) {
    self.emit('offline', err);
  });

  this.connection.on('end', function () {
    self.emit('end');
  });

  this.connection.on('close', function (had_error) {
    self.connected = false;
    self.emit('close');
  });

  this.connection.on('ready', function () {
    self.loadSensors();
    self.connected = true;
    self.emit('ready');
  });
};

sys.inherits(Server, events.EventEmitter);

Server.prototype.loadSensors = function () {
  var self = this;
  sensors_templates.forEach(function (template) {
    var aux = new Sensor(self.connection, template);

    aux.on('available', function () {
      //console.log(self.conf.host + ' sensor ' + this.conf.name + ' available!');
      self.sensors.push(this);
      this.run();
    });

    aux.on('error', function () {
      self.disconnect();
      self.emit('close');
    });

    aux.on('data', function () {
      //coming soon...
    });

    aux.check();
  });
};

Server.prototype.disconnect = function () {
  this.sensors.forEach(function (sensor) {
    sensor.stop();
  });
  this.connection.end();
};

Server.prototype.connect = function () {
  this.connection.connect(this.conf);
};

module.exports = Server;