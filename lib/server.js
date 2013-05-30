var Connection = require('ssh2'),
  events = require('events'),
  Sensor = require('./sensor'),
  ConnectionPool = require('./connectionpool'),
  sensors_templates = require('../conf/sensors'),
  process = require('process'),
  sys = require('sys'),
  crypto = require('crypto');


var Server = function (hostname, sshport, user, password, key, timing) {
  var self = this;
  this.conf = {
    host: hostname,
    port: sshport,
    username: user,
    passphrase: password,
    privateKey: key
  };

  this.connection = new Connection();
  this.sensors = [];
  this.connected = false;
  this.started = false;
  this.timing = timing;
  this.ips = [];

  this.connection.on('error', function (err) {
    //self.connected = false;
    self.emit('offline', err);
  });

  this.connection.on('end', function () {
    //self.connected = false;
    self.emit('end');
  });

  this.connection.on('close', function (had_error) {
    self.emit('closed', self.connected);
    self.connected = false;
  });

  this.connection.on('ready', function () {
    self.connectionPool = new ConnectionPool(this);
    self.loadInfo(function () {
      self.conf.privateKey = undefined;
      self.conf.passphrase = undefined;
      self.connected = true;

      if (self.mac.indexOf("00-00-00-00-00-00") !== -1) {
        self.id = crypto.createHash('md5').update(self.hostname).digest('hex');
      } else {
        self.id = crypto.createHash('md5').update(self.mac).digest('hex');
      }

      self.emit('ready');
    });
  });
};


sys.inherits(Server, events.EventEmitter);

Server.prototype.save = function (redis) {
  var auxs = this.extract();
  delete auxs.sensors;
  redis.hmset('server-' + this.id, auxs);
};

Server.prototype.extract = function () {
  var aux = {};
  aux.sensors = [];
  aux.connected = this.connected;
  aux.address = this.conf.host;
  aux.port = this.conf.port;
  aux.id = this.id;
  aux.hostname = this.hostname;
  aux.ips = this.ips;

  if(this.connectionPool !== undefined && this.connectionPool.queue.length > 8) {
    aux.queued = true;
  } else {
    aux.queued = false;
  }

  var w = false, a = false;
  this.sensors.forEach(function (sensor) {
    if (sensor.conf.exported) {
      if (sensor.alarmed) {
        a = true;
      } else if (sensor.warned) {
        w = true;
      }

      var s = sensor.extract();
      aux.sensors.push(s);
    }
  });

  if (a) {
    aux.status = 'alarmed';
  } else if (w) {
    aux.status = 'warned';
  } else {
    aux.status = 'normal';
  }

  return aux;
};


Server.prototype.loadSensors = function () {
  var self = this;
  this.sensors.length = 0;

  sensors_templates.forEach(function (template) {
    var aux = new Sensor(self.connectionPool, template, self.timing);

    aux.on('available', function () {
      self.sensors.push(this);
      this.start();
      self.emit('available', this);
    });

    aux.on('error', function () {
      self.disconnect();
      self.emit('close');
    });

    aux.on('fired', function () {
      self.emit('fired', this);
    });

    aux.on('data', function () {
      self.emit('data', this);
    });

    aux.on('alarmed', function () {
      self.emit('alarmed', this);
    });

    aux.on('warned', function () {
      self.emit('warned', this);
    });

    aux.check();
  });
};


Server.prototype.loadInfo = function (done) {
  var self = this;

  if (this.mac === undefined || this.hostname === undefined) {
    this.connectionPool.send('ifconfig | grep `route | grep default | awk {\'print $8\'}` | tr -s \' \' | cut -d \' \' -f5 | tail -1', function (data) {
        self.mac = data.toString('utf-8').replace('\n', '');
        self.loadHostname(done);
    });
  } else {
    done();
  }
};


Server.prototype.loadHostname = function (done) {
  var self = this;

  this.connectionPool.send('hostname', function (data) {
    self.hostname = data.toString('utf-8').replace('\n', '');
    done();
  });
};


Server.prototype.disconnect = function () {
  this.sensors.forEach(function (sensor) {
    sensor.stop();
  });
  this.connected = false;
  this.connection.end();
};


Server.prototype.connect = function () {
  this.started = true;
  this.connection.connect(this.conf);
};

module.exports = Server;