var Server = {
  render: function (server) {
    if ($("#" + server.id).length <= 0) {
      serverg = Server.create(server);
    } else {
      serverg = $('#' + server.id);
      var cpus = Server.getSensor(server, 'load');
      $("#sload", serverg).html(cpus.value);
      $("#sload", serverg).attr('class', Server.getClass(cpus));
      $("#susers", serverg).html(Server.getSensor(server, 'users').value);
    }

    Server.renderSensors(server, serverg);

    return serverg;
  },

  renderSensors: function (server, serverg) {
    for (var i = 0; i < server.sensors.length; i++) {
      var classn = Server.getClass(server.sensors[i]);
      if (server.sensors[i].alarmed) {
        serverg.addClass('alarmed');
        serverg.removeClass('warned');
        serverg.removeClass('normal');
      } else if (server.sensors[i].warned && !serverg.hasClass('alarmed')) {
        serverg.removeClass('alarmed');
        serverg.addClass('warned');
        serverg.removeClass('normal');
      } else if (!serverg.hasClass('alarmed') && !serverg.hasClass('warned')) {
        serverg.removeClass('alarmed');
        serverg.removeClass('warned');
        serverg.addClass('normal');
      }
      if (server.sensors[i].name !== "users" && server.sensors[i].name !== "load") {
        if ($("#" + server.sensors[i].name, serverg).length > 0) {
          $("#s" + server.sensors[i].name , serverg).html(server.sensors[i].value);
        } else {
          $(".scontent", serverg).append("<p class='" + classn + "' id='" + server.sensors[i].name + "' style='padding:0px;margin:0px;'>" + server.sensors[i].name + " <span id='s" + server.sensors[i].name + "'>" + server.sensors[i].value + "</span></p>");
        }
      }
    }
  },

  getClass: function (sensor) {
    var classn = "snormal";
      if (sensor.alarmed) {
        classn = "salarmed";
      } else if (sensor.warned) {
        classn = "swarned";
      }
      return classn;
  },

  create: function (server) {
    var serverg;
    serverg = $('<div id="' + server.id + '" class="server"><div class="swrapper"><div class="scontent"></div></div></div>');

    $(".scontent", serverg).html("<p style='padding:0px;margin:0px;margin-bottom:3px;font-weight:bold;font-size:14px;'>" + server.hostname.substr(0, 16) + "</p>");
    $(".scontent", serverg).append("<p style='padding:0px;margin:0px;margin-bottom:3px;font-weight:bold;font-size:14px;'>" + server.address + "</p>");

    var cpus = Server.getSensor(server, 'load');

    var ostats_content = "<i class='icon-user'></i><span id='susers'>" + Server.getSensor(server, 'users').value + "</span> | <i class='icon-signal'></i>  <span id='sload' class='" + Server.getClass(cpus) + "'>" + cpus.value + "</span>";

    $(".scontent", serverg).append("<p class='ostats' style='padding:0px;margin:0px;margin-top:4px;margin-bottom:4px;'>" + ostats_content + "</p>");

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