var FeedParser = require('feedparser'),
  request = require('request');

/*
request('http://rss.phishtank.com/rss/asn/?asn=24768')
  .pipe(new FeedParser())

  .on('error', function(error) {
    // always handle errors
  })
  .on('meta', function (meta) {
    // do something
  })
  .on('article', function (article) {
    // do something else
    console.log(article.source);
  })
  .on('end', function () {
   // do the next thing
  });
  */

  request('http://www.zone-h.org/rss/specialdefacements').pipe(new FeedParser()).on('article', function (article) {
    // do something else
    console.log(article['title']);
  });
