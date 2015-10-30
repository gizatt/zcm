var z;

var messages = [];
var channelIdx = {};
var viewIdx = null;
var lastIdx = null;

function handle(channel, msg)
{
    var utime = now() * 1000;

    var newChannel = false;

    if (!(channel in channelIdx)) {
        channelIdx[channel] = messages.length;
        messages.push({});
        newChannel = true;
    }

    var lastUtime = utime;
    if ("utime" in messages[channelIdx[channel]])
        lastUtime = messages[channelIdx[channel]]["utime"];

    messages[channelIdx[channel]]["channelIdx"] = channelIdx[channel];
    messages[channelIdx[channel]]["channel"]    = channel;
    messages[channelIdx[channel]]["type"]       = msg.__type,
    messages[channelIdx[channel]]["utime"]      = utime;
    messages[channelIdx[channel]]["lastUtime"]  = lastUtime;
    messages[channelIdx[channel]]["msg"]        = msg;

    if (newChannel)
        setupChannelList();

    if (viewIdx != null && channelIdx[channel] == viewIdx) {
        updateViewer(channel, messages[channelIdx[channel]].msg);
    }
}

function setupChannelList()
{
    var source   = $("#messages-template").html();
    var template = Handlebars.compile(source);
    var data = { messages: messages }
    var res = template(data);
    $(res).css("background-color", "red");
    $("#message-table").html(res);
    if (messages.length > 0)
        $("#clear").css("visibility", "visible");
    else
        $("#clear").css("visibility", "hidden");
}

function setupViewer(channel, msg)
{
    $("#message-viewer-channel").text(channel);
    delete msg["__type"];
    delete msg["__hash"];
    $("#message-viewer-content").jsonView(msg, {collapsed: true},
                                          channel.replace(" ", "_"));
}

function updateViewer(channel, msg)
{
    delete msg["__type"];
    delete msg["__hash"];
    for (var field in msg) {
        updateField(channel.replace(" ", "_") + field, msg[field]);
    }
}

function updateField(prefix, field)
{
    var type = $.type(field);
    switch(type) {

        case 'object':
            for (var f in field) {
                updateField(prefix + f, field[f]);
            }
            break;

        case 'array':
            for (var i = 0; i < field.length; ++i) {
                updateField(prefix + i, field[i]);
            }
            break;

        default:
            $("#message-viewer-content #" + prefix).text(field);
            break;
    }
}

function showChannel(channel)
{
    if (channel in channelIdx) {
        viewIdx = channelIdx[channel];
        setupViewer(channel, messages[channelIdx[channel]].msg);
    }
}

function calcHertzLoop()
{
    setTimeout(function() {
        for (var m in messages) {
            if (messages[m]["utime"] != messages[m]["lastUtime"]) {

                var dt = messages[m]["utime"] - messages[m]["lastUtime"];
                var dtPredict = now() * 1000 - messages[m]["utime"];

                var freq;
                if (dtPredict > dt * 3) {
                    freq = 0;
                } else if (dtPredict > dt) {
                    freq = 1000000 / dtPredict;
                } else {
                    freq = 1000000 / dt;
                }

                messages[m]["frequency"] = freq;
                var id = "#channel-" + channelIdx[messages[m]["channel"]] + "-hz";
            } else {
                messages[m]["frequency"] = 0;
            }

            $(id).text(messages[m]["frequency"].toFixed(2));
        }
        calcHertzLoop();
    }, 500);
}

function clearHistory()
{
    messages = [];
    channelIdx = {};
    var source   = $("#messages-template").html();
    var template = Handlebars.compile(source);
    var data = { messages: messages }
    var res = template(data);
    $(res).css("background-color", "red");
    $("#message-table").html(res);
    $("#clear").css("visibility", "hidden");
    $("#message-viewer-channel").html("");
    $("#message-viewer-content").html("");
}

var subscriptions = [];

onload = function()
{
    z = zcm.create()
    subscriptions.push({channel: ".*",
                        subscription: z.subscribe_all(handle)});

    calcHertzLoop();
}

now = function()
{
    // Returns the number of milliseconds elapsed since either the browser navigationStart event or
    // the UNIX epoch, depending on availability.
    // Where the browser supports 'performance' we use that as it is more accurate (microsoeconds
    // will be returned in the fractional part) and more reliable as it does not rely on the system time.
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
