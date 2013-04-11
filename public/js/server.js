var Server = {
  render: function (server) {
    var serverg;
    if ($("#" + server.id).length <= 0) {
      serverg = Server.create(server);
    } else {
      serverg = $('#' + server.id);
      var cpus = Server.getSensor(server, 'load');
      $("#sload", serverg).html(cpus.value);
      $("#sload", serverg).attr('class', Sensor.getClass(cpus));
      $("#susers", serverg).html(Server.getSensor(server, 'users').value);
    }

    serverg.attr('class', 'server, ' + server.status);

    Server.renderSensors(server, serverg);

    return serverg;
  },

  renderSensors: function (server, serverg) {
    for (var i = 0; i < server.sensors.length; i++) {
      if (server.sensors[i].name !== 'users' && server.sensors[i].name !== 'load') {
        if ($("#" + server.sensors[i].name, serverg).length > 0) {
          $("#" + server.sensors[i].name , serverg).attr('class', Sensor.getClass(server.sensors[i]));
          $("#s" + server.sensors[i].name , serverg).html(server.sensors[i].value);
        } else {
          $(".scontent", serverg).append(Sensor.render(server.sensors[i]));
        }
      }
    }
  },

  create: function (server) {
    var serverg = $('<div id="' + server.id + '" class="server"><div class="swrapper"><div class="scontent"></div></div></div>');

    $(".scontent", serverg).html("<p class='hostname'>" + server.hostname.substr(0, 16) + "</p>");
    $(".scontent", serverg).append("<p class='address'>" + server.address + "</p>");

    var cpus = Server.getSensor(server, 'load');
    var users = Server.getSensor(server, 'users');

    var ostats_content = "<i class='icon-user'></i><span id='susers'>" + users.value + "</span> | <i class='icon-signal'></i>  <span id='sload' class='" + Sensor.getClass(cpus) + "'>" + cpus.value + "</span>";

    $(".scontent", serverg).append("<p class='ostats'>" + ostats_content + "</p>");

    return serverg;
  },

  getSensor: function (server, name) {
    for (var i = 0; i < server.sensors.length; i++) {
      if (server.sensors[i].name === name) {
        return server.sensors[i];
      }
    }
    return undefined;
  }
};