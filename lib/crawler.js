var sys = require('sys'),
  events = require('events');


function dot2num(dot) {
  var d = dot.split('.');
  return ((((((+d[0]) * 255) + (+d[1])) * 255) + (+d[2])) * 255) + (+d[3]);
}

function num2dot(num) {
  var d = num % 255;
  for (var i = 3; i > 0; i--) {
    num = Math.floor(num/255);
    d = num%255 + '.' + d;
  }
  return d;
}

var Crawler = function (range) {
  this.start = dot2num(range.start);
  this.end = dot2num(range.end);
  this.current = dot2num(range.start);
};

sys.inherits(Crawler, events.EventEmitter);

Crawler.prototype.getCurrent = function() {
  return num2dot(this.current);
};

Crawler.prototype.next = function() {
  if(this.current < this.end) {
    this.current++;
    return num2dot(this.current);
  } else {
    return undefined;
  }
};

module.exports = Crawler;
