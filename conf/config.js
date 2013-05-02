module.exports = {
  'redis': '127.0.0.1', //redis server address

  'web_user': 'outkept', //dashboard username
  'web_password': 'outkept', //dashboard password

  'alarm': 2,
  'reactive': true, //reactive commands enabled
  'timer': 10000, //default pooling interval, each sensor may have its own (millis)

  'crawler_user': 'outkept', //username to be used
  'crawler_key': '/home/outkept/.ssh/id_rsa', //auth key
  'crawler_port': 22, //ports

  'mail_enable': true,
  'mail_host': 'mail.yourcompany.com',
  'mail_user': 'outkept@yourcompany.com',
  'mail_password': 'password123',
  'mail_from': 'outkept@yourcompany.com',
  'notification_mail': 'reports@yourcompany.com',

  'statsd_enable': false,
  'statsd_host': '192.168.200.200',
  'statsd_port': 8125,
  'statsd_root': 'outkept',

  'twitter_enable': false,
  'twitter_consumer_key': 'XXXXXXXXXXXX',
  'twitter_consumer_secret': 'XXXXXXXXXXXX',
  'twitter_access_token': 'XXXXXXXXXXXX',
  'twitter_token_secret': 'XXXXXXXXXXXX',

  'ranges': [
    {
      'start': '192.168.1.0',
      'end': '192.168.20.225'
    },
    {
      'start': '192.168.40.0',
      'end': '192.168.60.250'
    }
  ]
};
