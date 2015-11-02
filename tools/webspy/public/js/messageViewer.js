function messageViewer(channel)
{
    var parent = this;

    function sanitize(str) { return str.replace(" ", "_"); }

    function resizePanel(event, ui)
    {
        var currentHeight = ui.size.height;

        var padding = $("#viewer-" + this.c +
                        " .panel-heading").height() +
                      parseInt($("#viewer-" + this.c +
                                 " .panel-heading").css("padding-top"), 10) +
                      parseInt($("#viewer-" + this.c +
                                 " .panel-heading").css("padding-bottom"), 10) +
                      parseInt($("#viewer-" + this.c +
                                 " .viewer-content").css("padding-bottom"), 10) +
                      parseInt($(this).css("margin-bottom"), 10) - 4;

        // this accounts for some lag in the ui.size value, if you take this away
        // you'll get some instable behaviour
        $(this).height(currentHeight);

        // set the content panel width
        $("#viewer-" + this.c +
          " .viewer-content").height(currentHeight - padding);
    }

    this.updateViewer = function(msg)
    {
        for (var f in msg)
            this.updateField(this.c + f, msg[f]);
    }

    this.updateField = function(prefix, field)
    {
        var type = $.type(field);
        switch(type) {

            case 'object':
                for (var f in field)
                    this.updateField(prefix + f, field[f]);
                break;

            case 'array':
                for (var i = 0; i < field.length; ++i) {
                    this.updateField(prefix + i, field[i]);
                }
                break;

            default:
                $("#viewer-" + this.c + " .viewer-content #" + prefix).text(field);
                break;
        }
    }

    this.createPanel = function(msg)
    {
        var wrapper = $('<div />', {'class' : 'col-xs-1'});

        var panel = $('<div />', { 'id' : 'viewer-' + this.c,
                                   'class' : 'viewer panel panel-default ' +
                                             'ui-widget-conent',
                                   'style': 'position: fixed;' });

        var panelHeading = $('<div />', { 'class' : 'clearfix' });


        panelHeading.append($('<div />', { 'class' : 'viewer-channel col-xs-10' })
                            .text(this.channel));

        var pin = $('<div />', { 'class' : 'btn btn-xs glyphicon ' +
                                            'glyphicon-pushpin pull-right',
                                  'stlye' : 'z-index:99;' });
        pin.prepend($('<div />', { 'class' : 'clearfix' }));
        pin.on('click', function(){
            $(this).toggleClass('active');

            if ($(this).hasClass('active'))
                parent.pinPanel();
            else
                parent.unpinPanel();
        });

        panelHeading.append(pin);
        panelHeading = $('<div />', { 'class' : 'panel-heading' }).append(panelHeading);

        var panelBody = $('<div />', { 'class' : 'viewer-content panel-body',
                                       'style' : 'height:100%; width:100%; ' +
                                                 'overflow:auto;' });
        delete msg["__type"];
        delete msg["__hash"];
        panelBody.jsonView(msg, { collapsed : true }, this.c);

        panel.append(panelHeading);
        panel.append(panelBody);

        panel.resizable({ resize : resizePanel });
        panel.draggable();
        panel.css("cursor", "move");

        wrapper.append(panel);

        return wrapper;
    }

    this.unpinPanel = function()
    {
        $("#viewer-" + this.c).resizable();
        $("#viewer-" + this.c).draggable();
        $("#viewer-" + this.c).css("cursor", "move");
    }

    this.pinPanel = function()
    {
        $("#viewer-" + this.c).resizable({ disabled : true });
        $("#viewer-" + this.c).draggable({ disabled : true });
        $("#viewer-" + this.c).css("cursor", "");
    }

    this.hidePanel = function()
    {
        $('#viewer-' + this.c + ' .viewer-content').css('visibility', 'hidden');
    }

    this.showPanel = function()
    {
        $('#viewer-' + this.c + ' .viewer-content').css('visibility', 'visible');
    }

    this.c = sanitize(channel);
    this.channel = channel;
}
