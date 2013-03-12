var Outkept = require(__dirname + '/lib/outkept'),
  prompt = require('prompt');

function main(passphrase) {
  var outk = new Outkept(passphrase);

  outk.addServer('abru.pt', 22);
  outk.addServer('beta.ptisp.pt', 22);
  outk.addServer('sadfasdfasfaf.com', 22);

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