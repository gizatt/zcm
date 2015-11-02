function messageViewer(channel)
{
    var parent = this;

    function sanitize(str) { return str.replace(" ", "_"); }

    function uiResizePanel(event, ui)
    {
        resizePanel(ui.size.height);
    }

    function resizePanel(height)
    {
        var padding = $("#message-viewer-" + parent.c +
                        " .panel-heading").height() +
                      parseInt($("#message-viewer-" + parent.c +
                                 " .panel-heading").css("padding-top"), 10) +
                      parseInt($("#message-viewer-" + parent.c +
                                 " .panel-heading").css("padding-bottom"), 10) +
                      parseInt($("#message-viewer-" + parent.c +
                                 " .message-viewer-content").css("padding-bottom"), 10) +
                      parseInt($("#message-viewer-" + parent.c).css("margin-bottom"), 10) - 4;

        // this accounts for some lag in the ui.size value, if you take this away
        // you'll get some instable behaviour
        $("#message-viewer-" + parent.c).height(height);

        // set the content panel width
        $("#message-viewer-" + parent.c +
          " .message-viewer-content").height(height - padding);
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
                $("#message-viewer-" + this.c + " .message-viewer-content #" + prefix).text(field);
                break;
        }
    }

    this.createPanel = function(msg)
    {
        var wrapper = $('<div />', {'class' : 'panel-' + this.c + ' col-xs-1'});

        var panel = $('<div />', { 'id' : 'message-viewer-' + this.c,
                                   'class' : 'message-viewer panel panel-default ' +
                                             'ui-widget-conent',
                                   'style': 'position: fixed;' });

        var panelHeading = $('<div />', { 'class' : 'clearfix' });


        panelHeading.append($('<div />', { 'class' : 'message-viewer-channel col-xs-10' })
                            .text(this.channel));

        var close = $('<div />', { 'class' : 'btn btn-xs glyphicon ' +
                                            'glyphicon-remove pull-right',
                                  'stlye' : 'z-index:99;' });
        close.on('click', function(){
            parent.close();
        });
        var pin = $('<div />', { 'class' : 'btn btn-xs glyphicon ' +
                                            'glyphicon-pushpin pull-right',
                                  'stlye' : 'z-index:99;' });
        pin.on('click', function(){
            $(this).toggleClass('active');

            if ($(this).hasClass('active'))
                parent.pinPanel();
            else
                parent.unpinPanel();
        });
        pin = $('<div />', { 'class' : 'clearfix pull-right' }).append(close).append(pin);

        panelHeading.append(pin);
        panelHeading = $('<div />', { 'class' : 'panel-heading' }).append(panelHeading);

        var panelBody = $('<div />', { 'class' : 'message-viewer-content panel-body',
                                       'style' : 'height:100%; width:100%; ' +
                                                 'overflow:auto;' });
        delete msg["__type"];
        delete msg["__hash"];
        panelBody.jsonView(msg, { collapsed : true }, this.c);

        panel.append(panelHeading);
        panel.append(panelBody);

        panel.resizable({ resize : uiResizePanel });
        panel.draggable();
        // XXX Very hacky but cant get it to work without the delay of 1ms
        panel.ready(function(){
            setTimeout(function(){
                panel.css(panel.position());
            }, 1);
        });
        panel.css("cursor", "move");

        wrapper.append(panel);

        return wrapper;
    }

    this.unpinPanel = function()
    {
        $("#message-viewer-" + this.c).resizable({ disabled : false });
        $("#message-viewer-" + this.c).draggable({ disabled : false });
        $("#message-viewer-" + this.c).css("cursor", "move");
    }

    this.pinPanel = function()
    {
        $("#message-viewer-" + this.c).resizable({ disabled : true });
        $("#message-viewer-" + this.c).draggable({ disabled : true });
        $("#message-viewer-" + this.c).css("cursor", "");
    }

    this.hidePanel = function()
    {
        $('#message-viewer-' + this.c + ' .message-viewer-content').css('visibility', 'hidden');
    }

    this.showPanel = function()
    {
        $('#message-viewer-' + this.c + ' .message-viewer-content').css('visibility', 'visible');
    }

    this.close = function()
    {
        this.closed = true;
        $('.panel-' + parent.c).remove();
    }

    this.isClosed = function()
    {
        return this.closed;
    }

    this.c = sanitize(channel);
    this.channel = channel;
    this.closed = false;
}
