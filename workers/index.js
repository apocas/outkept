var cp = require('child_process');


var Workers = function() {
  this.workers = [];
};


Workers.prototype.load = function(passphrase, key) {
  console.log('Workers starting up...');
  var self = this;

  require('fs').readdirSync(__dirname + '/').filter(function(file) {
    return file.match(/.+\.js/g) !== null && file !== 'index.js';
  }).forEach(function(file) {
    var loader = cp.fork(__dirname + '/' + file);
    loader.send({
      'boot': passphrase,
      'key': key
    });
    self.workers.push(loader);
  });
};

Workers.prototype.kill = function(type) {
  for (var i = 0; i < this.workers.length; i++) {
    this.workers[i].kill(type);
  }
};


module.exports = Workers;
