var reconnect = require('reconnect/shoe'),
  duplexEmitter = require('duplex-emitter');

var Outkept = function () {
  this.servers = [];
  this.counter = 0;
  this.mpoints = [0];

  var self = this;

  self.renderHeartbeat();

  var opts = {
    randomisationFactor: 0,
    initialDelay: 10,
    maxDelay: 3000000
  };

  r = reconnect(opts, function(stream) {
    self.connection = duplexEmitter(stream);

    window.connection = self.connection;

    self.connection.on('authentication', function (data) {
      if(data.result === true) {
        window.logged = true;

        console.log('Authenticated');
        self.notification('Connection status', 'Connected and authenticated.');

        if($.cookie('osession') === undefined) {
          $.cookie('osession', data.sessionid, { expires: 15 });
        }

        app.navigate("/", {
          trigger: true
        });

      } else {
        $.removeCookie('osession');
      }
    });

    self.connection.on('server', function (server) {
      self.counter++;
      var aux = self.findServer(server.id);
      if (aux === undefined) {
        self.servers.push(new Server(server));
      } else {
        aux.props = server;
        aux.render();
      }
    });

    self.connection.on('stats', function (data) {
      self.counter++;
      if (data.alarmed !== undefined) {
        $('#vwarnings').html(data.alarmed);
      }
      if (data.warned !== undefined) {
        $('#valerts').html(data.warned);
      }
      if (data.reactives !== undefined) {
        $('#vreactives').html(data.reactives);
      }
      if (data.servers !== undefined) {
        $('#vservers').html(data.servers);
      }
      if (data.sensors !== undefined) {
        $('#vsensors').html(data.sensors);
      }
      if (data.feeds !== undefined) {
        $('#vfeeds').html(data.feeds);
      }
    });

    stream.on('end', function () {
      console.log('Disconnected');
      self.notification('Connection status', 'Disconnected.');
      window.logged = false;
    });
  }).connect('/websocket');

  r.on('backoff', function(number, delay) {
    console.log(number + ' ' + delay + 'ms');
  });

  r.on('connect', function() {
    console.log('Connected');
    if(window.logged === undefined || window.logged !== true) {
      console.log('Authenticating');
      window.connection.emit('authenticate', {'sessionid': $.cookie('osession')});
    }
  });
};


Outkept.prototype.notification = function (title, message) {
  $.pnotify({
      title: title,
      text: message,
      delay: 2000,
      sticker: false
  });
};

Outkept.prototype.isLogged = function () {
  this.connection.emit('authenticate', {'username': username, 'password': password});
};

Outkept.prototype.login = function (username, password) {
  this.connection.emit('authenticate', {'username': username, 'password': password});
};

Outkept.prototype.findServer = function (id) {
  for (var i = 0; i < this.servers.length; i++) {
    if (this.servers[i].props.id === id) {
      return this.servers[i];
    }
  }
};

Outkept.prototype.renderHeartbeat = function () {
  var mpoints_max = 30;
  var self = this;

  setInterval(function () {
    self.mpoints.push(self.counter);
    if (self.mpoints.length > mpoints_max) {
      self.mpoints.splice(0,1);
    }

    $('.sparkline').sparkline(self.mpoints, {
      width: 110,
      height: 20,
      lineColor: '#f8844b',
      fillColor: '#f2f7f9',
      spotColor: '#467e8c',
      maxSpotColor: '#b9e672',
      minSpotColor: '#FA5833',
      spotRadius: 2,
      lineWidth: 1,
      tooltipSuffix: ' events per sec'
    });

    self.counter = 0;
  },1000);
};