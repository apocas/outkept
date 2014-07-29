var FeedParser = require('feedparser'),
  request = require('request');

/*
request('http://rss.phishtank.com/rss/asn/?asn=12345')
  .pipe(new FeedParser())

  .on('error', function(error) {
    console.log(error);
  })
  .on('readable', function() {
    // This is where the action is!
    var stream = this
      , meta = this.meta // **NOTE** the "meta" is always available in the context of the feedparser instance
      , item;

    while (item = stream.read()) {
      console.log(item.source.title);
    }
  })
  .on('end', function () {
   // do the next thing
  });
*/

request('http://www.zone-h.org/rss/specialdefacements')
  .pipe(new FeedParser())

  .on('error', function(error) {
    console.log(error);
  })
  .on('readable', function() {
    // This is where the action is!
    var stream = this
      , meta = this.meta // **NOTE** the "meta" is always available in the context of the feedparser instance
      , item;

    while (item = stream.read()) {
      console.log(item['rss:title']['#']);
    }
  })
  .on('end', function () {
   // do the next thing
  });
