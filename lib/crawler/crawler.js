var sys = require('sys'),
  events = require('events'),
  outils = require('../utils'),
  config = require('../../conf/config'),
  vendors = require('../../vendors'),
  Server = require('../server'),
  fs = require('fs');

var Crawler = function (range, passphrase) {
  this.start = outils.dot2num(range.start);
  this.end = outils.dot2num(range.end);
  this.current = outils.dot2num(range.start);
  this.passphrase = passphrase;
  this.key = fs.readFileSync(config.crawler_key);
};

sys.inherits(Crawler, events.EventEmitter);

Crawler.prototype.getCurrent = function() {
  return outils.num2dot(this.current);
};

Crawler.prototype.next = function() {
  if(this.current < this.end) {
    this.current++;
    return outils.num2dot(this.current);
  } else {
    return undefined;
  }
};

Crawler.prototype.createServer = function (hostname, sshport, cb) {
  var self = this;
  var s = new Server(hostname, sshport, config.crawler_user, this.passphrase, this.key, config.timer);

  s.on('ready', function () {
    var serverSelf = this;

    vendors.mongo(function(db) {
      db.collection('servers').findOne({id: s.id}, function(err, server) {
        if (server === undefined || server === null) {
          if(serverSelf.hostname.indexOf(' ') === -1) {
            serverSelf.save();
            outils.sendMessage('message', 'Server ' + serverSelf.conf.host + ' found.');
          }
        } else {
          if (server.address !== serverSelf.conf.host) {
            server.ips.push(hostname);

            db.collection('servers').update({id: server.id}, {$set: server}, {upsert: true}, function(err, docs) {
              if(err) console.log('Mongo error in runner->save');
            });
          }
        }
        serverSelf.disconnect();
      });
    });
  });

  s.on('closed', function(connected) {
    cb();
  });

  s.connect();
};

Crawler.prototype.crawl = function () {
  console.log('Crawler running...');
  var self = this;

  function loop() {
    var current = self.getCurrent();
    if(config.crawler_port instanceof Array) {
      for (var i = 0; i < config.crawler_port.length; i++) {
        self.createServer(current, config.crawler_port[i]);
      }
    } else {
      self.createServer(current, config.crawler_port, function() {
        if(self.next() !== undefined) {
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
  console.log('Starting crawler...');
  new Crawler(m.range, m.boot).crawl();
});
