var config = require('../conf/config'),
  Lynx = require('lynx'),
  emailjs = require('emailjs'),
  Ntwitter = require('ntwitter');

var Notifications = function () {
  if (config.statsd_enable !== undefined && config.statsd_enable) {
    this.statsd = new Lynx(config.statsd_host, config.statsd_port);
  }

  if (config.mail_enable !== undefined && config.mail_enable) {
    this.email  = emailjs.server.connect({
      user: config.mail_user,
      password: config.mail_password,
      host: config.mail_host
    });
  }

  if (config.twitter_enable !== undefined && config.twitter_enable) {
    this.twitter = new Ntwitter({
      consumer_key: config.twitter_consumer_key,
      consumer_secret: config.twitter_consumer_secret,
      access_token_key: config.twitter_access_token,
      access_token_secret: config.twitter_token_secret
    });
  }
};

Notifications.prototype.sendTwitter = function (message) {
  if (this.twitter !== undefined) {
    this.twitter.updateStatus(message,
      function (err, data) {
        console.log(data);
      }
      );
  }
};

Notifications.prototype.sendMail = function (message) {
  if (this.email !== undefined) {
    this.email.send({
      text: message,
      from: config.mail_from,
      to: config.notification_mail,
      subject: "Outkept reporting"
    }, function (err, message) {
      console.log(err || message);
    });
  }
};

Notifications.prototype.count = function (member) {
  if (this.statsd !== undefined) {
    this.statsd.increment(config.statsd_root + '.' + member);
  }
};

module.exports = Notifications;