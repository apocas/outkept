var Router = Backbone.Router.extend({
  routes: {
    "timeline": "timeline",
    "login": "login",
    "": "index"
  },

  initialize: function() {
    this.outkept = new Outkept();

    this.bind('all', function(route) {
      //auth
      if((window.logged === undefined || window.logged !== true) && window.connection !== undefined) {
        window.connection.emit('authenticate', {'sessionid': $.cookie('osession')});
      }
    });
  },

  index: function() {
    if(window.logged === true) {
      templateLoader.load(["DashboardView"], function() {
        $('#app_container').html(new DashboardView().render().el);
      });
    } else {
      app.navigate("/login", {
        trigger: true
      });
    }
  },

  login: function() {
    var self = this;

    templateLoader.load(["LoginView"], function() {
      $('#app_container').html(new LoginView().render().el);
    });
  },

  timeline: function() {
    var self = this;

    templateLoader.load(["TimelineView"], function() {
      $('#app_container').html(new TimelineView().render().el);
    });
  }
});

app = new Router();
Backbone.history.start();
