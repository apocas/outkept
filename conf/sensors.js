module.exports = [
  {
    'name': 'load', //sensor name
    'alarm': 8, //alarm threshold
    'warning': 6, //warning threshold
    'exported': true,
    'cmd': 'uptime | awk -F \'load average:\' \'{ print $2 }\' | awk -F \\, \'{ print $1 }\'', //sensor command
    'reactive': '', //counter command ran when alarm value is reached
    'verifier': '', //boolean command that specifies if sensor is available
    'inverted': false, //inverted
    'zero': false //zero triggers or not
  },
  {
    'name': 'users',
    'alarm': 25,
    'warning': 20,
    'exported': true,
    'cmd': 'w | grep -v load | grep -v USER | wc -l;',
    'reactive': '',
    'verifier': '',
    'inverted': false,
    'zero': false
  },
  {
    'name': 'apache',
    'alarm': 390,
    'warning': 250,
    'exported': true,
    'cmd': 'ps aux | grep httpd | grep -v grep | wc -l',
    'reactive': 'killall httpd php; sleep 3; killall httpd php; sleep 3; service httpd start;',
    'verifier': 'if which httpd >/dev/null; then echo yes; else echo no; fi;',
    'inverted': false,
    'zero': false
  },
  {
    'name': 'mysql',
    'alarm': 65,
    'warning': 30,
    'exported': true,
    'cmd': 'mysqladmin process 2> /dev/null | grep localhost | grep -v Sleep | grep -v Delayed | wc -l',
    'reactive': 'killall httpd php; sleep 1; service httpd start;',
    'verifier': 'if [ -f ~/.my.cnf ]; then echo yes; else echo no; fi;',
    'inverted': false,
    'zero': true
  },
  {
    'name': 'exim',
    'alarm': 600,
    'warning': 500,
    'exported': true,
    'cmd': 'exim -bpc',
    'reactive': 'exim -bpru | grep -e \'<>\' -e \'root@\' | awk {\'print $3\'} | xargs exim -Mrm 2> /dev/null',
    'verifier': 'if which exim >/dev/null; then echo yes; else echo no; fi;',
    'inverted': false,
    'zero': false,
    'timer': 60000 //sensor specific timer (millis)
  },
  {
    'name': 'memory',
    'alarm': 10,
    'warning': 70,
    'exported': true,
    'cmd': 'free -m | grep \'-\' | awk \'{print $4}\'',
    'reactive': '',
    'verifier': '',
    'inverted': true,
    'zero': false
  },
  {
    'name': 'tmp',
    'alarm': 85,
    'warning': 80,
    'exported': true,
    'cmd': 'aux=$(df -h | grep /tmp | awk \'{print $5}\'); echo ${aux%\\%}',
    'reactive': 'rm -rf /tmp/eaccelerator; rm -vf /tmp/cache_*; rm -vf /tmp/*.dat; rm -vf /tmp/*.cache;',
    'verifier': 'aux=$(df -h | grep /tmp | awk \'{ print $6 }\';); if [ -z "$aux" ]; then echo no; else echo yes; fi;',
    'inverted': false,
    'zero': false,
    'timer': 120000
  },
  {
    'name': 'adaptec',
    'alarm': 1,
    'warning': 1,
    'exported': true,
    'cmd': '/usr/sbin/arcconf getconfig 1 | grep -i optimal | wc -l',
    'reactive': '',
    'verifier': 'if [ -f /usr/sbin/arcconf ]; then echo yes; else echo no; fi;',
    'inverted': true,
    'zero': true,
    'timer': 3600000
  },
  {
    'name': 'lsi',
    'alarm': 1,
    'warning': 1,
    'exported': true,
    'cmd': '/usr/sbin/megasasctl | grep -i degraded | wc -l',
    'reactive': '',
    'verifier': 'if [ -f /usr/sbin/megasasctl ]; then echo yes; else echo no; fi;',
    'inverted': false,
    'zero': true,
    'timer': 3600000
  },
  {
    'name': 'phpfpm',
    'alarm': 500,
    'warning': 400,
    'exported': true,
    'cmd': 'netstat -nap | grep 80 | grep EST | wc -l',
    'reactive': '',
    'verifier': 'if which php-fpm >/dev/null; then echo yes; else echo no; fi;',
    'inverted': false,
    'zero': true
  },
  {
    'name': 'kernel',
    'exported': true,
    'cmd': 'uname -r | awk -F. \'{ printf("%d.%d.%d",$1,$2,$3); }\'',
    'verifier': 'if which uname >/dev/null; then echo yes; else echo no; fi;',
    'timer': 6000000
  }
];
