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
    var currentTime = new Date();
    var month = currentTime.getMonth() + 1;
    var day = currentTime.getDate();
    var year = currentTime.getFullYear();
    return '' + day + month + year;
  }
};

