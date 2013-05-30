window.DashboardView = Backbone.View.extend({

  events: {
    'click .filters a': 'filter',
    'click .opin': 'click_pin',
    'click .btn_pin': 'click_pin_on',
    'click #btn_console': 'click_console',
    'click #btn_logout': 'click_logout'
  },

  initialize: function (outkept) {
    this.outkept = outkept;
  },

  click_console: function (e) {
    e.preventDefault();
    window.terminal.slideToggle('fast');
    window.terminal.terminal.focus(focus = !focus);
    window.terminal.terminal.attr({
      scrollTop: window.terminal.terminal.attr("scrollHeight")
    });
  },

  click_logout: function (e) {
    e.preventDefault();
    $.removeCookie('osession');
    app.navigate("/login", {
      trigger: true
    });
  },

  click_pin_on: function (e) {
    var btn = $(e.target);
    var server = this.outkept.findServer(btn.parent().parent().attr('data-serverid'));
    server.locked = true;
    server.render();
    btn.button('loading');
  },

  click_pin: function (e) {
    var server = this.outkept.findServer($(e.target).parent().attr('id'));
    server.locked = false;

    $('#servers_dashboard').isotope('remove', $(e.target).parent(), function() {
      server.rendered = false;
      $('#servers_dashboard').isotope('reloadItems');
      $('#servers_dashboard').isotope({ filter: $('.filters a .btn-primary').attr('data-filter') });
    });
  },

  filter: function (e) {
    $('.filters a').removeClass('btn-primary');
    $(e.target).addClass('btn-primary');
    var selector = $(e.target).attr('data-filter');
    $('#servers_dashboard').isotope({ filter: selector });
    return false;
  },

  render:function () {
    $(this.el).html(this.template());

    $('#servers_dashboard', this.el).isotope({
      animationEngine : 'css',
      itemSelector: '.server',
      filter: '*',
      masonry: {
        columnWidth: 10,
        isAnimated: false
      }
    });

    $.fn.tilda = function(eval, options) {
      if ($('body', this.el).data('tilda')) {
        return $('body').data('tilda').terminal;
      }
      this.addClass('tilda');
      options = options || {};
      eval = eval || function(command, term) {
        term.echo("you don't set eval for tilda");
      };
      var settings = {
        prompt: 'outkept> ',
        name: 'tilda',
        height: 100,
        enabled: false,
        greetings: 'Outkept console - http://outke.pt/documentation',
        keypress: function(e) {
          if (e.which == 20) {
            return false;
          }
        }
      };
      if (options) {
        $.extend(settings, options);
      }
      this.append('<div class="td"></div>');
      var self = this;
      self.terminal = this.find('.td').terminal(eval, settings);
      window.terminal = self;
      var focus = false;
      $(document.documentElement).keypress(function(e) {
        //console.log(e.which);
        if (e.which == 20) {
          self.slideToggle('fast');
          self.terminal.focus(focus = !focus);
          self.terminal.attr({
            scrollTop: self.terminal.attr("scrollHeight")
          });
        }
      });
      $('body', this.el).data('tilda', this);
      this.hide();
      return self;
    };

    $('#tilda', this.el).tilda(function(command, terminal) {
      if(command == 'help') {
        terminal.echo('Visit http://outke.pt/documentation');
        terminal.echo('Ctrl+t to show/hide console');
      }
    });

    this.outkept.renderStats(this.outkept.stats, this.el);

    return this;
  }

});
