var Outkept = require(__dirname + '/lib/outkept'),
  argv = require('optimist').argv;


function main(passphrase) {
  var outk = new Outkept(passphrase);
  outk.crawl();
}

main(argv.passphrase);
