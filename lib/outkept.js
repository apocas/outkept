var Server = require('./server');

var Outkept  = function (passphrase) {
  this.servers = [];
  this.passphrase = passphrase;
};

Outkept.prototype.addServer = function (hostname, sshport) {
  var self = this;
  var s = new Server('sadfasdfasfaf.com', 22, self.passphrase);
  s.on('ready', function () {
    this.loadSensors();
    self.servers.push(this);
  });
  s.connect();
};

module.exports = Outkept;