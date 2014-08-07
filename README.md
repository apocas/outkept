# Outkept - http://outke.pt


* The idea behind `Outkept` was to build a tool that could auto-discover your cluster profile and simultaneously start monitoring and controlling each node it finds.

* If you have a heterogeneous cluster constantly changing, `Outkept` allows you to easily automate control behaviour and cluster monitoring.

* There is no hardcoded behaviour, instead it features a user defined pool of available sensors and stabilization/reactive action for each sensor.

* When it finds a new server in one of the monitored subnets, it looks for supported sensors by running a verifier command that each sensor has (ex. mysql exists? in a mysql thread number sensors).


## Architecture

### Crawlers

* You don't need to specify which servers and what do they support, `Outkept` will auto-discover this information for you.

* This is what the crawlers do, they crawl the subnets you specified in config.js looking for machines that allow SSH connections using the ssh key you specified.

* If `Outkept` finds a machine, it will look for a few properties (hostname, etc) about the machine and then it will look which sensors the machine supports by running the verifier command of each sensor.

### Processes

#### `Outkept` uses multiples processes.

* Each subnet is crawled in a separated process.
* Each 50 servers are managed and monitored by a process.
* A main controller process.

### SSH Connections

* Each server has a SSH connection to it, inside this connection `Outkept` will use multiple channels in order to acquire it's sensor's data.

* By default the majority of SSH daemons support 10 channels per connection, this does NOT mean that `Outkept` will only support 10 sensors for each server, instead `Outkept` multiplexes the available channels in each connection.

* If you set all your sensors in the millisecond range and your network's latency is high, your server will queue up since the channel pool will not be able to dispatch it in time. When this happens a queued alert is shown in the dashboard in the affected server. To avoid this adjust sensors accordingly or increase the channel limit in your SSH daemon.

## Configuration

### Sensors

* In `Outkept` you dont need to specify which sensors each server supports, `Outkept` automatically does that for you using the `verifier` field. Instead you specify a library of sensors, which then will be used by the system.

* Each sensor is defined in the `sensors.js` file in the JSON format (inside `conf` folder).

#### Floating point sensor

``` js
{
  'name': 'load', //sensor name
  'alarm': 8, //alarm threshold
  'warning': 6, //warning threshold
  'exported': true, //exported to dashboard
  'cmd': 'uptime | awk -F \'load average:\' \'{ print $2 }\' | awk -F \\, \'{ print $1 }\'', //sensor command
  'reactive': '', //counter command ran when alarm value is reached
  'verifier': '', //yes/no command that specifies if sensor is available
  'inverted': false, //inverted
  'zero': false, //zero triggers or not
  'timer': 3600000 //interval pooling (milli)
}
```

#### String sensor

* If you omit the warning and alarm field, sensor will be defined as string.

``` js
{
  'name': 'kernel',
  'exported': true,
  'cmd': 'uname -r | awk -F. \'{ printf("%d.%d.%d",$1,$2,$3); }\'',
  'verifier': 'if which uname >/dev/null; then echo yes; else echo no; fi;',
  'timer': 60000
}
```

* **cmd** - Command that is run with timer interval, this command returns the sensor value.
* reactive** - Command that is run when the sensor reaches the alarm value.
* **verifier** - This command must return yes or no strings, if positive this sensor is added to the server where it was ran.
* **zero** - If true then zero will put the sensor in alarm state. (ex. daemon not running)
* **timer** - Pooling interval in milliseconds, in each tick cmd is sent to the server.

### Feeds

* Using feeds, you may listen for external events and notify your team using the available notification hooks.

#### Examples

``` js
module.exports = [
  {
    'name': 'zone-h',
    'feed': 'http://www.zone-h.org/rss/defacements',
    'verify': true,
    'field': 'title',
    'interval': 2
  },
  {
    'name': 'phishtank',
    'feed': 'http://rss.phishtank.com/rss/asn/?asn=12345',
    'verify': false,
    'field': 'link',
    'interval': 2
  },
  {
    //...
  }
];
```

## External modules

* Latest versions of `Outkept` don't include notification nor dashboard, all that is done externally now.

### Dashboard

* Main dashboard: [https://github.com/apocas/outkept-dashboard](https://github.com/apocas/outkept-dashboard)

### Notifications

* Twitter notifications: [https://github.com/ptisp/outkept-twitter](https://github.com/ptisp/outkept-twitter)
* Hipchat notifications: [https://github.com/ptisp/outkept-hipchat](https://github.com/ptisp/outkept-hipchat)
* Email notifications: [https://github.com/ptisp/outkept-email](https://github.com/ptisp/outkept-email)

### Other examples

* Canvas based live status page: [https://github.com/ptisp/biostatus](https://github.com/ptisp/biostatus)
