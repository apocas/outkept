module.exports = [
  {
    'name': 'zone-h', //feed name
    'feed': 'http://www.zone-h.org/rss/defacements', //feed url
    'verify': true, //verify if field contains a ip/domain/address contained in any crawler range
    'field': 'title', //field to be processed
    'interval': 2 //pooling interval (mins)
  },
  {
    'name': 'phishtank',
    'feed': 'http://rss.phishtank.com/rss/asn/?asn=12345',
    'verify': false,
    'field': 'link',
    'interval': 2
  }
];