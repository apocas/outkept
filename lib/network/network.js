var express = require('express'),
  passport = require('passport'),
  http = require('http'),
  ecstatic = require('ecstatic'),
  Station = require('./station');


var Network = function () {
  this.http_server = http.createServer();
  this.static_server = ecstatic('./public');
  this.comm_server = new Station(this.http_server);

  this.http_server('request', this.static_server);

  this.http_server.listen(80, function () {
    console.log('HTTP Server booted...');
  });

  this.comm_server.start();
};

module.exports = Network;