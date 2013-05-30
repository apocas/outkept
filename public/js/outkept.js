var reconnect = require('reconnect/shoe'),
  duplexEmitter = require('duplex-emitter');

var Outkept = function () {
  this.servers = [];
  this.counter = 0;
  this.mpoints = [0];
  this.stats = {};

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

    self.connection.on('servers', function (servers) {
      for (var i = 0; i < servers.length; i++) {
        self.counter++;
        var aux = self.findServer(servers[i].id);
        if (aux === undefined) {
          self.servers.push(new Server(servers[i]));
        } else {
          aux.props = servers[i];
          aux.render();
        }
      }

      self.renderSearch();
    });

    self.connection.on('message', function (message) {
      //console.log(message);
      var d = new Date(0);
      d.setUTCSeconds(message.date);
      var aux = '';
      if(message.type == 'trigger') {
        aux = '(' + d.getHours() + ':' + d.getMinutes() + ') Sensor ' + message.sensor + ' ' + message.level + ' at ' + message.hostname + ' with value ' + parseFloat(message.value).toFixed(2);
      } else if(message.type == 'message') {
        aux = '(' + d.getHours() + ':' + d.getMinutes() + ') ' + message.message;
      }
      window.terminal.terminal.echo(aux);
      $('#output_message').html(aux);
    });

    self.connection.on('stats', function (data) {
      self.stats = data;

      self.counter++;
      self.renderStats(data);
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
      if($.cookie('osession') !== undefined) {
        $('#username').val('previous session detected, logging in...');
      }
      window.connection.emit('authenticate', {'sessionid': $.cookie('osession')});
    }
  });
};


Outkept.prototype.notification = function (title, message) {
  $.pnotify({
      title: title,
      text: message,
      delay: 2000,
      sticker: false,
      history: false
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

Outkept.prototype.renderSearch = function() {
  var search_strings = [];
  var self = this;
  for (var i = 0; i < this.servers.length; i++) {
    search_strings.push(this.servers[i].props.hostname);
    search_strings.push(this.servers[i].props.address);

    for (var y = 0; y < this.servers[i].props.sensors.length; y++) {
      if(this.servers[i].props.sensors[y] !== null && search_strings.indexOf(this.servers[i].props.sensors[y].name) < 0) {
        search_strings.push(this.servers[i].props.sensors[y].name);
      }
    }
  }

  $('.typeahead_search').typeahead({source: search_strings, updater:function (item) {
      var s = self.searchServer(item);
      if(s !== undefined) {
        s.locked = true;
        s.render();
      } else {
        var results = self.searchSensor(item);
        var container = $('#searchModal').find('.modal-body');
        container.html('');
        var html = '';
        html += '<table class="table table-striped table-hover">';
        html += '<thead><tr><th>Value</th><th>Hostname</th><th>Address</th><th></th></tr></thead><tbody>';
        for (var i = 0; i < results.length; i++) {
          html += '<tr data-serverid="' + results[i].id + '"><td ><span class="spvalue">' + results[i].value + '</span></td><td>' + results[i].hostname + '</td><td>' + results[i].address + '</td><td><button type="button" class="btn_pin btn btn-primary" data-loading-text="Pinned">Pin</button></td></tr>';
        }
        html += '</tbody></table>';
        container.append(html);
        $('#searchModal').modal();
      }
      return '';
    }
  });
};

Outkept.prototype.searchSensor = function(expression) {
  var sbuffer = [];
  for (var i = 0; i < this.servers.length; i++) {
    for (var y = 0; y < this.servers[i].props.sensors.length; y++) {
      if (this.servers[i].props.sensors[y] !== null && this.servers[i].props.sensors[y].name == expression) {
        sbuffer.push({id: this.servers[i].props.id, address: this.servers[i].props.address, hostname: this.servers[i].props.hostname, value: this.servers[i].props.sensors[y].value});
      }
    }
  }
  return sbuffer;
};

Outkept.prototype.searchServer = function(expression) {
  for (var i = 0; i < this.servers.length; i++) {
    if(this.servers[i].props.hostname == expression || this.servers[i].props.address == expression) {
      return this.servers[i];
    }
  }
};

Outkept.prototype.renderStats = function(data, parent) {
  if(parent === undefined) {
    parent = $('#stats');
  }

  if (data.alarmed !== undefined) {
    $('#vwarnings', parent).html(data.alarmed);
  }
  if (data.warned !== undefined) {
    $('#valerts', parent).html(data.warned);
  }
  if (data.reactives !== undefined) {
    $('#vreactives', parent).html(data.reactives);
  }
  if (data.servers !== undefined) {
    $('#vservers', parent).html(data.servers);
  }
  if (data.sensors !== undefined) {
    $('#vsensors', parent).html(data.sensors);
  }
  if (data.feeds !== undefined) {
    $('#vfeeds', parent).html(data.feeds);
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