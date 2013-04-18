var reconnect = require('reconnect/shoe'),
  duplexEmitter = require('duplex-emitter');

var Outkept = function () {
  this.servers = [];
  this.counter = 0;
  this.mpoints = [0];

  var self = this;

  self.renderHeartbeat();

  r = reconnect(function(stream) {
    self.connection = duplexEmitter(stream);

    window.connection = self.connection;

    self.connection.on('authentication', function (data) {
      if(data.result === true) {
        window.logged = true;

        $.cookie('osession', data.sessionid, { expires: 15 });

        app.navigate("/", {
          trigger: true
        });
      }
    });

    self.connection.on('server', function (server) {
      self.counter++;
      var aux = self.findServer(server.id);
      if (aux === undefined) {
        self.servers.push(server);
      } else {
        aux = server;
      }

      self.refreshServer(server);
    });

    self.connection.on('stats', function (data) {
      if (data.alarmed !== undefined) {
        $('#vwarnings').html(data.alarmed);
      }
      if (data.warned !== undefined) {
        $('#valerts').html(data.warned);
      }
      if (data.reactives !== undefined) {
        $('#vreactives').html(data.reactives);
      }
    });

    stream.on('end', function () {
      console.log('Disconnected');
      window.logged = false;
    });
  }).connect('/websocket');

  r.on('connect', function() {
    console.log('Connected');
    if(window.logged === undefined || window.logged !== true) {
      window.connection.emit('authenticate', {'sessionid': $.cookie('osession')});
    }
  });
};

Outkept.prototype.isLogged = function () {
  this.connection.emit('authenticate', {'username': username, 'password': password});
};

Outkept.prototype.login = function (username, password) {
  this.connection.emit('authenticate', {'username': username, 'password': password});
};

Outkept.prototype.refreshServer = function (server) {
  if(server.remove) {
    $('#servers_dashboard').isotope('remove', $('#servers_dashboard').find('#' + server.id), function() {
      $('#servers_dashboard').isotope('reloadItems');
    });
  } else {
    var serverg = Server.render(server);
    if ($('#servers_dashboard').find('#' + server.id).length <= 0) {
      $('#servers_dashboard').isotope('insert', serverg, function() {
        $('#servers_dashboard').isotope('reloadItems');
      });
    }
    $('#servers_dashboard').isotope({ filter: $('.filters a .btn-primary').attr('data-filter') });
  }
};

Outkept.prototype.findServer = function (id) {
  for (var i = 0; i < this.servers.length; i++) {
    if (this.servers[i].id === id) {
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