function channelViewer()
{
    var parent = this;

    this.__proto__ = new panel();

    this.cb = function(){}
    this.clearCB = function(){}

    this.messages = [];
    this.channelIdx = {};

    this.createPanel = function(channelClickCB)
    {
        if (channelClickCB)
            parent.cb = channelClickCB;

        var wrapper = $('<div />', {'class' : 'channel-viewer'});

        var tableWrapper = $('<div />', { 'class' : 'table-responsive' });
        var table = $('<table />', { 'class' : 'table table-hover table-striped ' +
                                               'list-table-fixed noselect' });

        var header = $('<tr />');
        header.append($('<th />', { 'class' : 'col-md-5' }).text("Channel Name"));
        header.append($('<th />', { 'class' : 'col-md-5' }).text("Type"));
        header.append($('<th />', { 'class' : 'hz col-md-2' }).text("Hz"));
        header = $('<thead />').append(header);

        var body = $('<tbody />', { 'class' : 'channel-viewer-table' });

        table.append(header).append(body);
        tableWrapper.append(table);

        var panel = parent.__proto__.createPanel(null, tableWrapper);
        parent.__proto__.overrideClose(parent.clearHistory);
        panel.ready(function(){setTimeout(parent.__proto__.pinPanel,1);});

        calcHertzLoop();

        wrapper.append(panel);

        return wrapper;
    }

    this.handle = function(channel, msg)
    {
        var utime = now() * 1000;

        var newChannel = false;

        if (!(channel in parent.channelIdx)) {
            parent.channelIdx[channel] = parent.messages.length;
            parent.messages.push({});
            newChannel = true;
        }

        var lastUtime = utime;
        if ("utime" in parent.messages[parent.channelIdx[channel]])
            lastUtime = parent.messages[parent.channelIdx[channel]]["utime"];

        parent.messages[parent.channelIdx[channel]]["channel"]    = channel;
        parent.messages[parent.channelIdx[channel]]["utime"]      = utime;
        parent.messages[parent.channelIdx[channel]]["lastUtime"]  = lastUtime;
        parent.messages[parent.channelIdx[channel]]["msg"]        = msg;

        if (newChannel) {
            var row = newChannelDiv(channel, msg.__type, 0,
                                    parent.channelIdx[channel], parent.cb);
            $("#" + parent.__proto__.panelId + " .channel-viewer-table").append(row);
        }
    }

    this.clearHistory = function()
    {
        parent.messages = [];
        parent.channelIdx = {};
        $("#" + parent.__proto__.panelId + " .channel-viewer-table").html("");

        parent.clearCB();
    }

    this.onClear = function(clearCB)
    {
        parent.clearCB = clearCB;
    }

    now = function()
    {
        // Returns the number of milliseconds elapsed since either the browser
        // navigationStart event or the UNIX epoch, depending on availability.
        // Where the browser supports 'performance' we use that as it is more
        // accurate (microsoeconds will be returned in the fractional part) and
        // more reliable as it does not rely on the system time.
        // Where 'performance' is not available, we will fall back to Date().getTime().
        var performance = window.performance || {};

        performance.now = (function() {
            return performance.now    ||
            performance.webkitNow     ||
            performance.msNow         ||
            performance.oNow          ||
            performance.mozNow        ||
            function() { return new Date().getTime(); };
            })();

        return performance.now();
    };

    function newChannelDiv(channel, type, frequency, channelIdx, cb)
    {
        var row = $('<tr />').on('click', function(){
            cb(channel, parent.messages[channelIdx].msg);
        });

        row.append($('<td />', { 'class' : 'col-md-5' }).text(channel));
        row.append($('<td />', { 'class' : 'col-md-5' }).text(type));
        row.append($('<td />', { 'class' : 'col-md-2 hz ' +
                                           'hz-' + channelIdx })
                     .text(frequency));
        return row;
    }

    function calcHertzLoop()
    {
        setTimeout(function() {
            for (var m in parent.messages) {
                if (parent.messages[m]["utime"] != parent.messages[m]["lastUtime"]) {

                    var dt = parent.messages[m]["utime"] - parent.messages[m]["lastUtime"];
                    var dtPredict = now() * 1000 - parent.messages[m]["utime"];

                    var freq;
                    if (dtPredict > dt * 3) {
                        freq = 0;
                    } else if (dtPredict > dt) {
                        freq = 1000000 / dtPredict;
                    } else {
                        freq = 1000000 / dt;
                    }
                    var id = ".channel-viewer .hz-" +
                             parent.channelIdx[parent.messages[m]["channel"]];
                    $(id).text(freq.toFixed(2));
                }
            }
            calcHertzLoop();
        }, 500);
    }
}
