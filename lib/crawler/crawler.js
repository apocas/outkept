var sys = require('sys'),
  events = require('events'),
  outils = require('../utils'),
  config = require('../../conf/config'),
  vendors = require('../../vendors'),
  Server = require('../server'),
  fs = require('fs');

var Crawler = function(range, passphrase, key) {

  this.inverted = true;
  if (Math.floor((Math.random() * 10) + 1) % 2 === 1) {
    this.inverted = false;
  }

  this.start = outils.dot2num(range.start);
  this.end = outils.dot2num(range.end);
  this.current = this.start;

  if (this.inverted === true) {
    var aux = this.start;
    this.start = this.end;
    this.end = aux;
    this.current = this.start;
  }

  this.passphrase = passphrase;
  this.key = key;
};

sys.inherits(Crawler, events.EventEmitter);

Crawler.prototype.getCurrent = function() {
  return outils.num2dot(this.current);
};

Crawler.prototype.next = function() {
  if (this.inverted === false && this.current < this.end) {
    this.current++;
    return outils.num2dot(this.current);
  } else if (this.inverted === true && this.current > this.end) {
    this.current--;
    return outils.num2dot(this.current);
  } else {
    return undefined;
  }
};

Crawler.prototype.createServer = function(hostname, sshport, cb) {
  var self = this;
  var s = new Server(hostname, sshport, config.crawler_user, this.passphrase, this.key, config.timer);

  s.on('ready', function() {
    self.loadServer(this);
  });

  s.on('closed', function(connected) {
    cb();
  });

  s.connect();
};

Crawler.prototype.loadServer = function(serverSelf) {
  var self = this;

  vendors.mongo(function(db) {
    db.collection('servers').find({
      $or: [{
        id: serverSelf.id
      }, {
        address: serverSelf.conf.host
      }, {
        ips: {
          $elemMatch: {
            $in: [serverSelf.conf.host]
          }
        }
      }]
    }).toArray(function(err, servers) {
      if (servers.length === 0) {
        if (serverSelf.hostname.indexOf(' ') === -1) {
          serverSelf.save();
          outils.sendMessage('message', 'Server ' + serverSelf.conf.host + ' found.');
        }
      } else {
        var server = servers[0];
        if (server.id && server.hostname && server.hostname !== serverSelf.hostname) {
          db.collection('servers').remove({
            'id': server.id
          }, function(err, removed) {
            if(removed) {
              serverSelf.save();
              outils.sendMessage('message', 'Server ' + serverSelf.conf.host + ' found.');
            }
          });
        } else {
          if (server.address !== serverSelf.conf.host && (!server.ips || server.ips.indexOf(serverSelf.conf.host) === -1)) {
            server.ips = server.ips || [];
            console.log('Adding address ' + serverSelf.conf.host + ' to ' + server.address);
            server.ips.push(serverSelf.conf.host);

            db.collection('servers').update({
                id: server.id
              }, {
                $set: {
                  ips: server.ips
                }
              },
              function(err, docs) {
                if (err) console.log('Mongo error in crawler->createServer');
              }
            );
          }
        }
      }
      serverSelf.disconnect();
    });
  });
};

Crawler.prototype.crawl = function() {
  console.log('Crawler running...');
  var self = this;

  function loop() {
    var current = self.getCurrent();
    if (config.crawler_port instanceof Array) {
      for (var i = 0; i < config.crawler_port.length; i++) {
        self.createServer(current, config.crawler_port[i]);
      }
    } else {
      self.createServer(current, config.crawler_port, function() {
        if (self.next() !== undefined) {
          loop();
        } else {
          console.log('Crawler done!!');
          process.exit(0);
        }
      });
    }
  }

  loop();
};


process.on('message', function(m) {
  //console.log('Starting crawler...');
  new Crawler(m.range, m.boot, m.key).crawl();
});
