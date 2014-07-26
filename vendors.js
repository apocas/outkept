var mongoClient = require('mongodb').MongoClient,
  mubsub = require('mubsub'),
  config = require('./conf/config');

var db = null;

exports.mongo = function(cb){
  if(db){
    cb(db);
    return;
  }

  mongoClient.connect('mongodb://' + config.mongo_host + ':' + config.mongo_port + '/' + config.mongo_database, function(err, conn) {
    if(err){
      console.log(err.message);
      throw new Error(err);
    } else {
      db = conn;
      var channel = mubsub(db).channel('pubsub');
      channel.on('error', console.error);
      exports.mongopubsub = channel;
      cb(db);
    }
  });
};
