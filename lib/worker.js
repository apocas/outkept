var Worker = function (servers, time, work) {
  this.work = work;
  this.time = time;
  this.servers = servers;
  this.running = false;

  this.start();
};

Worker.prototype.start = function () {
  var self = this;
  if (!this.running) {
    this.running = true;
    this.interval = setInterval(function () { self.work(self.servers); }, self.time);
  }
};

Worker.prototype.stop = function () {
  this.running = false;
  clearInterval(this.interval);
};

module.exports = Worker;
