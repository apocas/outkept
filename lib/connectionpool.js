var conf = require('../conf/config');

var ConnectionPool = function (connection) {
  this.connection = connection;
  this.queue = [];
  this.counter = 0;

  this.running = false;
};

ConnectionPool.prototype.start = function () {
  var self = this;
  if (!this.running) {
    this.running = true;
    this.interval = setInterval(function () {
      if(self.counter < (conf.channels || 8)) {
        var saux = self.queue.shift();
        if (self.queue.length < 1) {
          self.stop();
        }
        if (saux !== undefined) {
          self.counter--;
          self.connection.exec(saux.cmd, function (err, stream) {
            if (err) {
              self.counter++;
            } else {
              stream.on('data', function (data, extended) {
                if (extended !== 'stderr' && saux.callback !== undefined) {
                  saux.callback(data); 
                }
              });

              stream.on('exit', function (code, signal) {
                stream.destroy();
                self.counter++;
              });
            }
          });
        }
      }
    }, 100);
  }
};

ConnectionPool.prototype.stop = function () {
  this.running = false;
  clearInterval(this.interval);
};

ConnectionPool.prototype.send = function (cmd, callback) {
  this.queue.push({'cmd': cmd, 'callback': callback});

  if (!this.running) {
    this.start();
  }
};

module.exports = ConnectionPool;