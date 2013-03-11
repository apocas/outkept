var Server = require(__dirname + '/lib/server'),
  path = require('path'),
  config = require(__dirname + '/conf/config'),
  prompt = require('prompt');

function main(passphrase) {
  var conf = {
    port: 22,
    username: config.crawler_user,
    passphrase: passphrase,
    privateKey: require('fs').readFileSync(config.crawler_key)
  };


  conf.host = 'abru.pt';
  var s1 = new Server(conf);

  s1.on("ready", function () {
    this.send("hostname; uptime");
  });

  s1.connect();


  conf.host = 'beta.ptisp.pt';
  var s2 = new Server(conf);

  s2.on("ready", function () {
    this.send("hostname; uptime");
  });

  s2.connect();
}

var schema = {
  properties: {
    passphrase: {
      hidden: true
    }
  }
};

prompt.start();
prompt.get(schema, function (err, result) {
  main(result.passphrase);
});