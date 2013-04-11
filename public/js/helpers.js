window.templateLoader = {
    load: function(views, callback) {

        var deferreds = [];

        $.each(views, function(index, view) {
            if (window[view] && window[view].prototype.template == undefined) {
                deferreds.push($.get('../templates/' + view + '.html', function(data) {
                    window[view].prototype.template = _.template(data);
                }, 'html'));
            } else if(!window[view]) {
                alert(view + " not found");
            }
        });

        $.when.apply(null, deferreds).done(callback);
    }
};