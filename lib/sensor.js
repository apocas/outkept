var sys = require('sys'),
  events = require('events'),
  util = require('util');

var Sensor = function (connection, conf, timing) {
  this.connection = connection;
  this.conf = conf;
  this.alarmed = false;
  this.warned = false;
  this.timing = timing;
};

sys.inherits(Sensor, events.EventEmitter);

Sensor.prototype.extract = function () {
  var aux = {};
  aux.name = this.conf.name;
  aux.value = this.value;
  aux.alarmed = this.alarmed;
  aux.warned = this.warned;
  return aux;
};

Sensor.prototype.check = function () {
  var self = this;

  if (!this.conf.verifier || this.conf.verifier === '') {
    this.emit('available');
  } else {
    this.connection.exec(self.conf.verifier, function (err, stream) {
      if (err) { throw err; }
      stream.on('data', function (data, extended) {
        if (extended !== 'stderr') {
          if (data.toString('utf-8').indexOf("yes") !== -1) {
            self.emit('available');
          } else {
            self.emit('notavailable');
          }
        }
      });
    });
  }
};

Sensor.prototype.run = function () {
  var self = this;
  this.interval = setInterval(function () { self.worker(); }, self.timing);
};

Sensor.prototype.stop = function () {
  clearInterval(this.interval);
};

Sensor.prototype.worker = function () {
  var self = this;

  this.connection.exec(this.conf.cmd, function (err, stream) {
    //if (err) { throw err; }
    if (err) {
      self.stop();
      self.emit('error');
    } else {
      stream.on('data', function (data, extended) {
        self.value = parseFloat(data.toString('utf-8').replace(/^\s+|\s+$/g, ""));
        if ((self.value > self.conf.alarm && !self.conf.inverted) || (self.value < self.conf.alarm && self.conf.inverted)) {
          if (self.conf.reactive.length > 0 && ((self.value > self.conf.alarm && !self.conf.inverted) || (self.value < self.conf.alarm && self.conf.inverted))) {
            self.connection.exec(self.conf.reactive);
            console.log('Sensor ' + self.conf.name + ' fired!');
            self.emit('fired');
          }
          self.alarmed = true;
          self.emit('alarmed');
        } else if ((self.value > self.conf.warning && !self.conf.inverted) || (self.value < self.conf.warning && self.conf.inverted)) {
          self.warned = true;
          self.emit('warned');
        } else {
          self.alarmed = false;
          self.warned = false;
        }
        self.emit('data');
      });
    }
  });
};

module.exports = Sensor;