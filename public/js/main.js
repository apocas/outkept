var Router = Backbone.Router.extend({
  routes: {
    "login": "login",
    "": "index"
  },

  initialize: function() {
  },

  index: function() {
    templateLoader.load(["DashboardView"], function() {
      $('#app_container').html(new DashboardView().render().el);
    });
  },

  login: function() {
    var self = this;

    templateLoader.load(["LoginView"], function() {
      self.verifyLogin(function() {
        $('#content').html(new LogsView().render().el);
      });
    });
  }
});

outkept = new Outkept();
app = new Router();
Backbone.history.start();

/*
templateLoader.load(["LoginView"], function() {
  app = new Router();
  Backbone.history.start();
});
*/
