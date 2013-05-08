var Server = function (server) {
  this.props = server;
  this.rendered = false;
  this.locked = false;
};

Server.prototype.render = function () {
  var self = this;
  if (this.rendered === false) {
    if(this.props.status != 'normal') {
      var serverg = this.create();
      serverg.attr('class', 'server ' + this.props.status);
      this.renderSensors(serverg);
      self.rendered = true;
      $('#servers_dashboard').isotope('insert', serverg, function() {
        $('#servers_dashboard').isotope('reloadItems');
        $('#servers_dashboard').isotope({ filter: $('.filters a .btn-primary').attr('data-filter') });
      });
    }
  } else {
    if(this.props.status == 'normal') {
      $('#servers_dashboard').isotope('remove', $('#servers_dashboard').find('#' + this.props.id), function() {
        self.rendered = false;
        $('#servers_dashboard').isotope('reloadItems');
        $('#servers_dashboard').isotope({ filter: $('.filters a .btn-primary').attr('data-filter') });
      });
    } else {
      this.renderSensors($('#' + this.props.id));
    }
  }
};

Server.prototype.renderSensors = function (serverg) {
  var cpus = this.getSensor('load');
  $("#sload", serverg).html(parseFloat(cpus.value).toFixed(2));
  $("#sload", serverg).attr('class', Sensor.getClass(cpus));
  var users = this.getSensor('users');
  $("#susers", serverg).html(users.value);
  $("#susers", serverg).attr('class', Sensor.getClass(users));

  for (var i = 0; i < this.props.sensors.length; i++) {
    if (this.props.sensors[i].name !== 'users' && this.props.sensors[i].name !== 'load') {
      if ($("#" + this.props.sensors[i].name, serverg).length > 0) {
        $("#" + this.props.sensors[i].name , serverg).attr('class', Sensor.getClass(this.props.sensors[i]));
        $("#s" + this.props.sensors[i].name , serverg).html(this.props.sensors[i].value);
      } else {
        $(".scontent", serverg).append(Sensor.render(this.props.sensors[i]));
      }
    }
  }
};

Server.prototype.create = function () {
  var serverg = $('<div id="' + this.props.id + '" class="server"><div class="swrapper"><div class="scontent"></div></div></div>');

  $(".scontent", serverg).html("<p class='hostname'>" + this.props.hostname.substr(0, 16) + "</p>");
  $(".scontent", serverg).append("<p class='address'>" + this.props.address + "</p>");

  var cpus = this.getSensor('load');
  var users = this.getSensor('users');

  var ostats_content = "<i class='icon-user'></i><span id='susers'>" + users.value + "</span> | <i class='icon-signal'></i>  <span id='sload' class='" + Sensor.getClass(cpus) + "'>" + parseFloat(cpus.value).toFixed(2) + "</span>";

  $(".scontent", serverg).append("<p class='ostats'>" + ostats_content + "</p>");

  return serverg;
};

Server.prototype.getSensor = function (name) {
  for (var i = 0; i < this.props.sensors.length; i++) {
    if (this.props.sensors[i].name === name) {
      return this.props.sensors[i];
    }
  }
  return undefined;
};
