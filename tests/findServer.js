var vendors = require('../vendors'),
  async = require('async');


vendors.mongo(function(db) {
  db.collection('servers').find({
    $or: [{
      id: ''
    }, {
      address: ''
    }, {
      ips: {
        $elemMatch: {
          $in: ['']
        }
      }
    }]
  }).toArray(function(err, servers) {
    if (servers.length !== 0) {
      console.log('#### FOUND ####');
      console.log(servers);
    }
  });
});
