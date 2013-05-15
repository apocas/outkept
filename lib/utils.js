var config = require('../conf/config');

module.exports = {
  contained: function (ip) {
      var aux = this.dot2num(ip);
      for (var i = 0; i < config.ranges.length; i++) {
        if(aux >= this.dot2num(config.ranges[i].start) && aux <= this.dot2num(config.ranges[i].end)) {
          return true;
        }
      }
      return false;
  },

  dot2num: function (dot) {
    var d = dot.split('.');
    return ((((((+d[0]) * 255) + (+d[1])) * 255) + (+d[2])) * 255) + (+d[3]);
  },

  num2dot: function (num) {
    var d = num % 255;
    for (var i = 3; i > 0; i--) {
      num = Math.floor(num/255);
      d = num%255 + '.' + d;
    }
    return d;
  },

  getHashDate: function () {
    return this.dateFormat (new Date (), "%d%m%Y", true);
  },

  dateFormat: function (date, fstr, utc) {
    utc = utc ? 'getUTC' : 'get';
    return fstr.replace (/%[YmdHMS]/g, function (m) {
      switch (m) {
        case '%Y': return date[utc + 'FullYear'] ();
        case '%m': m = 1 + date[utc + 'Month'] (); break;
        case '%d': m = date[utc + 'Date'] (); break;
        case '%H': m = 1 + date[utc + 'Hours'] (); break;
        case '%M': m = date[utc + 'Minutes'] (); break;
        case '%S': m = date[utc + 'Seconds'] (); break;
        default: return m.slice (1);
      }

      return ('0' + m).slice (-2);
    });
  }
};

