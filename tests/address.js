var Crawler = require('../lib/crawler');


var c = new Crawler({
  'start': '130.185.80.1',
  'end': '130.185.83.254'
});

for (var i = 0; i < 500; i++) {
  console.log(c.getCurrent());
  c.next();
}

