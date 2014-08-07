var cp = require('child_process');

var Loader = function(id, passphrase, key, ids) {
  this.id = id;
  this.passphrase = passphrase;
  this.key = key;
  this.ids = ids;
};

Loader.prototype.load = function() {
  var self = this;
  this.proc = cp.fork('lib/outkept.js');
  this.proc.send({'boot': this.passphrase, 'key': this.key, 'ids': this.ids, 'id': this.id});

  this.proc.on('exit', function (code) {
    console.log(self.id  + ' - Loader has exited ' + code);

    /*
    //TODO: each loader has it's servers to mark as offline
    vendors.mongo(function(db) {
      db.collection('servers').update({}, {$set: {connected: false}}, { multi: true }, function() {
        self.load();
      });
    });
    */
    self.load();
  });
};

Loader.prototype.loadServer = function(id) {
  this.ids.push(id);
  this.proc.send({'server': id});
};

Loader.prototype.kill = function() {
  this.proc.removeAllListeners('exit');
  this.proc.kill('SIGHUP');
};

module.exports = Loader;
