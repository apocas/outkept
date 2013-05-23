var sys = require('sys'),
  events = require('events'),
  util = require('util');

var Sensor = function (connection, conf, timing) {
  this.connection = connection;
  this.conf = conf;
  this.alarmed = false;
  this.warned = false;
  this.fired = false;
  this.timing = this.conf.timer || timing;
};

sys.inherits(Sensor, events.EventEmitter);

Sensor.prototype.extract = function () {
  var aux = {};
  aux.name = this.conf.name;
  aux.value = this.value;
  aux.alarmed = this.alarmed;
  aux.warned = this.warned;
  aux.fired = this.fired;
  if(this.connectionPool !== undefined && this.connectionPool.queue.length > (this.conf.channels || 8)) {
    aux.queued = true;
  } else {
    aux.queued = false;
  }
  return aux;
};

Sensor.prototype.check = function () {
  var self = this;

  if (!this.conf.verifier || this.conf.verifier === '') {
    this.emit('available');
  } else {
    this.connection.send(self.conf.verifier, function (data) {
      if (data.toString('utf-8').indexOf("yes") !== -1) {
        self.emit('available');
      } else {
        self.emit('notavailable');
      }
    });
  }
};

Sensor.prototype.start = function () {
  var self = this;
  setTimeout(function () {
    self.worker();
  }, 5000);
  this.interval = setInterval(function () { self.worker(); }, self.timing);
};

Sensor.prototype.stop = function () {
  clearInterval(this.interval);
};

Sensor.prototype.worker = function () {
  var self = this;

  this.connection.send(this.conf.cmd, function (data) {
    if(self.conf.warning === undefined && self.conf.alarm === undefined) {
       self.value = data.toString('utf-8').replace(/^\s+|\s+$/g, "");
    } else {
      self.value = parseFloat(data.toString('utf-8').replace(/^\s+|\s+$/g, ""));
      if ((self.value > self.conf.alarm && !self.conf.inverted) || (self.value < self.conf.alarm && self.conf.inverted)) {
        if (self.conf.reactive !== undefined && self.conf.reactive.length > 0 && ((self.value > self.conf.alarm && !self.conf.inverted) || (self.value < self.conf.alarm && self.conf.inverted))) {
          if (!self.fired) {
            self.connection.send(self.conf.reactive);
            self.emit('fired');
            self.fired = true;
          }
        }
        if (!self.alarmed) {
          self.emit('alarmed');
        }
        self.alarmed = true;
        self.warned = false;
      } else if ((self.value > self.conf.warning && !self.conf.inverted) || (self.value < self.conf.warning && self.conf.inverted)) {
        if (!self.warned) {
          self.emit('warned');
        }
        self.warned = true;
        self.alarmed = false;
        self.fired = false;
      } else {
        self.alarmed = false;
        self.warned = false;
        self.fired = false;
      }
    }
    self.emit('data');
  });
};

module.exports = Sensor;