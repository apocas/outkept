window.DashboardView = Backbone.View.extend({

  events: {
    'click .filters a': 'filter'
  },

  initialize: function () {
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
      itemSelector: '.server',
      filter: '.alarmed, .warned',
      masonry: {
        columnWidth: 10,
        isAnimated: false
      }
    });

    return this;
  }

});