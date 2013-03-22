var Outkept = require(__dirname + '/lib/outkept'),
  prompt = require('prompt');


function main(passphrase) {
  var outk = new Outkept(passphrase);
  outk.crawl();
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