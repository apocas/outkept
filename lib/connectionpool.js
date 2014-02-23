var ConnectionQueuer = require('ssh2-multiplexer');

var ConnectionPool = function (connection) {
  this.queuer = new ConnectionQueue(connection);
};

ConnectionPool.prototype.send = function (cmd, callback) {
  this.queuer.exec(cmd, function(err, stream) {
    stream.on('data', function (data, extended) {
      if (extended !== 'stderr' && callback) {
        callback(data);
      }
    });
  });
};

module.exports = ConnectionPool;