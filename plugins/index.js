var cp = require('child_process');


var Plugins = function() {
  this.plugins = [];
};


Plugins.prototype.load = function(passphrase, key) {
  console.log('Plugins starting up...');
  var self = this;

  require('fs').readdirSync(__dirname + '/').filter(function(file) {
    return file.match(/.+\.js+$/) !== null && file !== 'index.js';
  }).forEach(function(file) {
    var loader = cp.fork(__dirname + '/' + file);
    loader.send({
      'boot': passphrase,
      'key': key
    });
    self.plugins.push(loader);
  });
};

Plugins.prototype.kill = function(type) {
  for (var i = 0; i < this.plugins.length; i++) {
    this.plugins[i].kill(type);
  }
};


module.exports = Plugins;
