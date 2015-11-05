function messageViewer(channel)
{
    var parent = this;

    this.__proto__ = new panel();

    this.graphs = [];
    this.graphFieldIdx = {};
    this.c = channel.replace(new RegExp(" ", 'g'), "")
    this.channel = channel;
    this.closed = false;

    this.createPanel = function(msg)
    {
        var wrapper = $('<div />', {'class' : 'message-viewer'});

        var body = $('<div />', { 'class' : 'content' });
        delete msg["__type"];
        delete msg["__hash"];
        body.jsonView(msg, { collapsed : true }, parent.c);

        var header = $('<div />', { 'class' : 'channel' }).text(parent.channel);

        var panel = parent.__proto__.createPanel(header, body, "panel-info");

        wrapper.append(panel);

        return wrapper;
    }

    this.hidePanel = function()
    {
        $('#' + parent.__proto__.panelId +
          ' .content').css('visibility', 'hidden');
    }

    this.showPanel = function()
    {
        $('#' + parent.__proto__.panelId +
          ' .content').css('visibility', 'visible');
    }

    this.updateViewer = function(msg, utime)
    {
        for (var f in msg)
            parent.updateField(parent.c + f, msg[f], utime);
    }

    this.updateField = function(prefix, field, utime)
    {
        var type = $.type(field);
        switch(type) {

            case 'object':
                for (var f in field)
                    parent.updateField(prefix + f, field[f], utime);
                break;

            case 'array':
                for (var i = 0; i < field.length; ++i) {
                    parent.updateField(prefix + i, field[i], utime);
                }
                break;

            case 'number':
                if (!(prefix in parent.graphFieldIdx)) {
                    var chart = new SmoothieChart({interpolation:'linear',
                                                   grid:{fillStyle:'#ffffff',
                                                         strokeStyle:'#ebebeb'},
                                                   labels:{disabled:true}});
                    var line = new TimeSeries();

                    var canvas = document.getElementById(prefix + "-graph");
                    chart.streamTo(canvas);
                    chart.addTimeSeries(line, {lineWidth:1,
                                               strokeStyle:'#000000'});

                    parent.graphFieldIdx[prefix] = parent.graphs.length;
                    parent.graphs.push({});
                    parent.graphs[parent.graphFieldIdx[prefix]]["graph"] = chart;
                    parent.graphs[parent.graphFieldIdx[prefix]]["line"] = line;
                }

                parent.graphs[parent.graphFieldIdx[prefix]]["line"].append(new Date().getTime(), Number(field));
                // Intentionally no "break;"
            default:
                $("#" + prefix).text(field);
                break;
        }
    }

    this.onFieldRightClick = function(fieldRightClickCB)
    {
        var ready;
        $('.message-viewer .json-number').on('mousedown', function(event){
            if (event.which == 3)
                return false;
            else
                return true;
        });
        $('.message-viewer .json-number').on('mouseup', function(event){
            if (event.which == 3) {
                ready = true;
                fieldRightClickCB(parent.channel, $(this).find(".num"));
            }
            return true;
        });
    }
}
