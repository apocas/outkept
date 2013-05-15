var sys = require('sys'),
  events = require('events'),
  outils = require('../utils');

var Crawler = function (range) {
  this.start = outils.dot2num(range.start);
  this.end = outils.dot2num(range.end);
  this.current = outils.dot2num(range.start);
};

sys.inherits(Crawler, events.EventEmitter);

Crawler.prototype.getCurrent = function() {
  return outils.num2dot(this.current);
};

Crawler.prototype.next = function() {
  if(this.current < this.end) {
    this.current++;
    return outils.num2dot(this.current);
  } else {
    return undefined;
  }
};

module.exports = Crawler;
