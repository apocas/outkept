var mongoClient = require('mongodb').MongoClient,
  redis = require('redis'),
  config = require('./conf/config');

var db = null;

exports.mongo = function(cb){
  if(db){
    return cb(db);
  }

  mongoClient.connect('mongodb://' + config.mongo_host + ':' + config.mongo_port + '/' + config.mongo_database, function(err, conn) {
    if(err){
      console.log(err.message);
      throw new Error(err);
    } else {
      db = conn;
      return cb(db);
    }
  });
};


exports.redis = redis;
exports.redis.publisher = redis.createClient();
