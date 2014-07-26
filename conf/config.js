module.exports = {
  'mongo_host': '127.0.0.1', //mongodb server address
  'mongo_port': '27017',
  'mongo_database': 'outkept',

  'alarm': 2,
  'reactive': true, //reactive commands enabled
  'timer': 5000, //default pooling interval, each sensor may have its own (millis)

  'crawler_user': 'user', //username to be used
  'crawler_key': '/Users/user/.ssh/id_rsa', //auth key
  'crawler_port': 22, //ports

  'mail_enable': true,
  'mail_host': 'mail.yourcompany.com',
  'mail_user': 'outkept@yourcompany.com',
  'mail_password': 'password123',
  'mail_from': 'outkept@yourcompany.com',
  'notification_mail': 'reports@yourcompany.com',

  'twitter_enable': false,
  'twitter_consumer_key': 'XXXXXXXXXXXX',
  'twitter_consumer_secret': 'XXXXXXXXXXXX',
  'twitter_access_token': 'XXXXXXXXXXXX',
  'twitter_token_secret': 'XXXXXXXXXXXX',

  'ranges': [
    {
      'start': '192.168.1.2',
      'end': '192.168.1.254'
    }
  ]
};
