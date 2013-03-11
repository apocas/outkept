var Server = require(__dirname + '/lib/server'),
  path = require('path'),
  config = require(__dirname + '/conf/config'),
  config = require(__dirname + '/lib/outkept'),
  prompt = require('prompt');

function main(passphrase) {
  var outk = new Outkept(passphrase);

  outk.addServer('abru.pt', 22);
  outk.addServer('beta.ptisp.pt', 22);
  outk.addServer('sadfasdfasfaf.com', 22);
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