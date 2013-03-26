var Outkept = function () {
  this.servers = [];
  this.connection = io.connect();
  this.counter = 0;

  this.mpoints = [0];
  this.mpoints_max = 30;

  var self = this;

  setInterval(function(){
    self.mpoints.push(self.counter);
    if (self.mpoints.length > self.mpoints_max) {
      self.mpoints.splice(0,1);
    }
    $('.sparkline').sparkline(self.mpoints, {
      width: 110,
      height: 20,//Height of the chart - Defaults to 'auto' (line height of the containing tag)
      lineColor: '#f8844b',//Used by line and discrete charts to specify the colour of the line drawn as a CSS values string
      fillColor: '#f2f7f9',//Specify the colour used to fill the area under the graph as a CSS value. Set to false to disable fill
      spotColor: '#467e8c',//The CSS colour of the final value marker. Set to false or an empty string to hide it
      maxSpotColor: '#b9e672',//The CSS colour of the marker displayed for the maximum value. Set to false or an empty string to hide it
      minSpotColor: '#FA5833',//The CSS colour of the marker displayed for the mimum value. Set to false or an empty string to hide it
      spotRadius: 2,//Radius of all spot markers, In pixels (default: 1.5) - Integer
      lineWidth: 1,//In pixels (default: 1) - Integer
      tooltipSuffix: ' requests per sec'
    });
    self.counter = 0;
  },1000);

  this.connection.on('connect', function () {
    self.connection.emit('authenticate', {username: 'demo', password: 'demo'});
  });

  this.connection.on('servers', function (servers) {
    //console.log(servers);
    self.servers = self.servers.concat(servers);

    self.servers.forEach(function (server) {
      self.refreshServer(server);
    });
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
    //console.log(data);
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

Outkept.prototype.refreshServer = function (server) {
  var serverg = Server.render(server);
  if ($('#servers_dashboard').find('#' + server.id).length <= 0) {
    $('#servers_dashboard').isotope('insert', serverg, function() {
      $('#' + server.id).parent().isotope('reloadItems');
    });
  }
  $('#servers_dashboard').isotope({ filter: $('.filters a .btn-primary').attr('data-filter') });
};

Outkept.prototype.findServer = function (id) {
  for (var i = 0; i < this.servers.length; i++) {
    if (this.servers[i].id === id) {
      return this.servers[i];
    }
  }
};