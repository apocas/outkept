window.TimelineView = Backbone.View.extend({

  events: {
  },

  initialize: function () {
  },

  render:function () {
    $(this.el).html(this.template());
    return this;
  }

});