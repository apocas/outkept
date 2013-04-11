window.DashboardView = Backbone.View.extend({

  initialize: function () {



  },

  render:function () {
    $(this.el).html(this.template());

    $('#servers_dashboard', this.el).isotope({
      itemSelector: '.server',
      filter: '.alarmed, .warned',
      masonry: {
        columnWidth: 10,
        isAnimated: true
      }
    });

    $('.filters a', this.el).click(function () {
      $('.filters a', this.el).removeClass('btn-primary');
      $(this).addClass('btn-primary');
      var selector = $(this).attr('data-filter');
      $('#servers_dashboard', this.el).isotope({ filter: selector });
      return false;
    });

    window.connection.emit('rendered');

    return this;
  }

});