$(document).on('ready', function() {
  var socket = io.connect();

  socket.on('connect', function() {
    socket.emit('authenticate', {username: 'demo', password: 'demo'});
  });

  socket.on('servers', function(servers) {
    console.log(servers);
  });
});