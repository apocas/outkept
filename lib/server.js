var Connection = require('ssh2'),
  events = require('events'),
  Sensor = require('./sensor'),
  ConnectionPool = require('./connectionpool'),
  sensors_templates = require('../conf/sensors'),
  process = require('process'),
  sys = require('sys'),
  crypto = require('crypto'),
  vendors = require('../vendors');


var Server = function (hostname, sshport, user, password, key, timing) {
  var self = this;

  this.booted = new Date().getTime();

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
    self.emit('offline', err);
  });

  this.connection.on('end', function () {
    self.emit('end');
  });

  this.connection.on('close', function (had_error) {
    if(self.connectionPool) {
      self.connectionPool.queuer.flush();
    }
    self.emit('closed', self.connected);
    self.disconnect();
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

Server.prototype.save = function () {
  var aux = this.extract();
  var self = this;

  aux.status = 'normal';

  for (var i = 0; i < this.sensors.length; i++) {
    if(this.sensors[i].alarmed === true || this.sensors[i].fired === true) {
      aux.status = 'alarmed';
      break;
    } else if(this.sensors[i].warned === true) {
      aux.status = 'warned';
    }
  }

  vendors.mongo(function(db) {
    db.collection('servers').update({id: self.id}, {$set: aux}, {upsert: true}, function(err, docs) {
      if(err) console.log('Mongo error in servers->save');
    });
  });
};

Server.prototype.extract = function () {
  var aux = {};
  aux.address = this.conf.host;
  aux.port = this.conf.port;
  aux.id = this.id;
  aux.hostname = this.hostname;
  aux.ips = this.ips;
  aux.connected = this.connected;

  aux.sensors = [];
  this.sensors.forEach(function (sensor) {
    var sens = {
      'name': sensor.conf.name,
      'value': sensor.value,
      'status': sensor.getStatus()
    };
    aux.sensors.push(sens);
  });

  return aux;
};


Server.prototype.loadSensors = function () {
  var self = this;
  this.sensors.length = 0;

  sensors_templates.forEach(function (template) {
    var aux = new Sensor(self.connectionPool, template, self.timing);

    aux.on('available', function () {
      this.start();
    });

    aux.on('error', function () {
      self.disconnect();
      self.emit('close');
    });

    aux.on('data', function () {
      if(this.added === false) {
        self.sensors.push(this);
        self.emit('available', this);
        this.added = true;
      }
      var now = new Date().getTime() / 1000;
      if(now - this.latest > 10) {
        self.save();
        this.latest = now;
      }
      vendors.mongopubsub.publish('updates', self);
      self.emit('data', this);
    });

    aux.on('fired', function () {
      self.save();
      self.emit('fired', this);
    });

    aux.on('alarmed', function () {
      self.save();
      if(new Date().getTime() - self.booted > (2 * 60 * 1000)) {
        self.emit('alarmed', this);
      }
    });

    aux.on('warned', function () {
      self.save();
      self.emit('warned', this);
    });

    aux.check();
  });
};


Server.prototype.loadInfo = function (done) {
  var self = this;

  if (this.mac === undefined || this.hostname === undefined) {
    this.connectionPool.send('ifconfig | grep `route | grep default | awk {\'print $8\'}` | tr -s \' \' | cut -d \' \' -f5 | tail -1', function (err, data) {
      if(err) {
        console.log(err);
        self.disconnect();
        self.emit('close');
      } else {
        self.mac = data.toString('utf-8').replace('\n', '');
        self.loadHostname(done);
      }
    });
  } else {
    done();
  }
};


Server.prototype.loadHostname = function (done) {
  var self = this;

  this.connectionPool.send('hostname', function (err, data) {
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
