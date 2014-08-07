var vendors = require('../vendors'),
  config = require('../conf/config'),
  Server = require('../lib/server');

var CSF = function(passphrase, key) {
  this.passphrase = passphrase;
  this.key = key;
};

CSF.prototype.start = function() {
  var self = this;


  function unlock(server, event) {
    var ip = event.ip.trim().replace(/;/g, '');
    server.connectionPool.send('csf -dr "' + ip + '"; csf -tr "' + ip + '"', function (err, data) {
      //console.log(err);
      //console.log(data.toString('utf-8'));
      setTimeout(function() {
        server.disconnect();
      }, 10000);
    });
  }

  vendors.mongo(function(db) {
    vendors.mongopubsub.subscribe('unlock', function (event) {
      var ev = {
        type: 'unlock',
        message: event.hostname + ' -> Unlock failed.'
      };
      var ip = event.ip.trim().replace(/;/g, '');

      if(event.hostname) {
        console.log(event);
        var server = new Server(event.hostname, config.crawler_port, config.crawler_user, self.passphrase, self.key, config.timer);

        server.on('ready', function () {
          var selfs = this;
          this.connectionPool.send('csf -g "' + ip + '"', function (err, data) {

            //console.log(err);
            //console.log(data.toString('utf-8'));

            if (data && data.toString('utf-8').indexOf('No matches found for ' + ip + ' in iptables') === -1) {
              var aux = data.toString('utf-8');
              aux = aux.trim().split('\n');
              var motive = aux[aux.length - 1];

              unlock(selfs, event);

              ev.message = event.hostname + ' -> ' + motive;
            } else {
              ev.message = event.hostname + ' -> IP not blocked.';
              server.disconnect();
            }
          });
        });

        server.on('closed', function(connected) {
          vendors.mongopubsub.publish('events', ev);
        });

        server.connect();
      } else {
        vendors.mongopubsub.publish('events', ev);
      }
    });
  });
};

process.on('message', function(m) {
  console.log('Starting CSF plugin...');
  new CSF(m.boot, m.key).start();
});
