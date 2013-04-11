window.LoginView = Backbone.View.extend({

  events: {
    "click #go": "login"
  },

  render:function () {
    $(this.el).html(this.template());
    return this;
  },

  login: function () {
    window.connection.emit('authenticate', {'username': $("#username").val(), 'password': $("#password").val()});
    return false;
  }

});