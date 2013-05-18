var Crawler = require('../lib/network/crawler');


var c = new Crawler({
  'start': '130.185.80.1',
  'end': '130.185.80.56'
});

do {
  console.log(c.getCurrent());
} while (c.next() != undefined);
