var Outkept = function () {
  this.servers = [];
  this.counter = 0;
  this.mpoints = [0];

  var self = this;

  self.renderHeartbeat();
  self.connection = io.connect();
  window.connection = self.connection;

  //this.connection.on('connect', function () {});

  this.connection.on('servers', function (servers) {
    //console.log(servers);
    self.servers = self.servers.concat(servers);

    self.servers.forEach(function (server) {
      self.refreshServer(server);
    });
  });

  this.connection.on('authentication', function (result) {
    if(result === true) {
      window.logged = true;
      app.navigate("/", {
        trigger: true
      });
    }
  });

  this.connection.on('server', function (server) {
    //console.log(server);
    self.counter++;
    var aux = self.findServer(server.id);
    if (aux === undefined) {
      self.servers.push(server);
    } else {
      aux = server;
    }

    self.refreshServer(server);
  });

  this.connection.on('stats', function (data) {
    if (data.alarmed !== undefined) {
      $('#vwarnings').html(data.alarmed);
    }
    if (data.warned !== undefined) {
      $('#valerts').html(data.warned);
    }
    if (data.reactives !== undefined) {
      $('#vreactives').html();
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
  var serverg = Server.render(server);
  if ($('#servers_dashboard').find('#' + server.id).length <= 0) {
    $('#servers_dashboard').isotope('insert', serverg, function() {
      $('#' + server.id).parent().isotope('reloadItems');
    });
  }
  //$('#servers_dashboard').isotope({ filter: $('.filters a .btn-primary').attr('data-filter') });
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