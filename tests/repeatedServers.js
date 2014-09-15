var vendors = require('../vendors'),
  async = require('async');


vendors.mongo(function(db) {
  db.collection('servers').find().toArray(function(err, replies) {
    async.mapSeries(replies, function(server, callback) {
      db.collection('servers').find({
        id: {
          $ne: server.id
        },
        $or: [{
          address: server.address
        }, {
          ips: {
            $elemMatch: {
              $in: [server.address]
            }
          }
        }]
      }).toArray(function(err, servers) {
        if (servers.length !== 0) {
          console.log('#### CONFLICT ####');
          console.log(servers);
        }
        callback();
      });
    }, function(err, results) {
      console.log('DONE');
      process.exit(0);
    });
  });
});
