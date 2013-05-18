window.DashboardView = Backbone.View.extend({

  events: {
    'click .filters a': 'filter',
    'click .opin': 'click_pin',
    'click .btn_pin': 'click_pin_on'
  },

  initialize: function (outkept) {
    this.outkept = outkept;
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

    return this;
  }

});