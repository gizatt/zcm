var z;

var messages = [];
var channelIdx = {};

var viewers = [];
var viewerChannelIdx = {};

function handle(channel, msg)
{
    var utime = now() * 1000;

    var newChannel = false;

    if (!(channel in channelIdx)) {
        channelIdx[channel] = messages.length;
        messages.push({});
        newChannel = true;
    }

    var freq = 0;
    if ("frequency" in messages[channelIdx[channel]])
        freq = messages[channelIdx[channel]]["frequency"];

    var lastUtime = utime;
    if ("utime" in messages[channelIdx[channel]])
        lastUtime = messages[channelIdx[channel]]["utime"];

    messages[channelIdx[channel]]["channelIdx"] = channelIdx[channel];
    messages[channelIdx[channel]]["channel"]    = channel;
    messages[channelIdx[channel]]["type"]       = msg.__type,
    messages[channelIdx[channel]]["utime"]      = utime;
    messages[channelIdx[channel]]["lastUtime"]  = lastUtime;
    messages[channelIdx[channel]]["frequency"]  = freq;
    messages[channelIdx[channel]]["msg"]        = msg;

    if (newChannel)
        setupChannelList();

    if (channel in viewerChannelIdx) {
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
    var channelSanitized = channel.replace(" ", "_");

    if (channel in viewerChannelIdx) {
        return;
    }

    viewerChannelIdx[channel] = viewers.length;
    viewers.push({});
    viewers[viewerChannelIdx[channel]]["channel"] = channelSanitized;

    var source   = $("#viewer-template").html();
    var template = Handlebars.compile(source);
    var data = { channel: channelSanitized }
    var res = template(data);
    $("#viewers").append(res);


    $("#viewer-" + channelSanitized + " .viewer-channel").text(channel);
    delete msg["__type"];
    delete msg["__hash"];
    $("#viewer-" + channelSanitized + " .viewer-content").jsonView(msg, {collapsed: true},
                                                                   channelSanitized);

    $("#viewer-" + channelSanitized).resizable({
        resize: function(event, ui){
            var currentHeight = ui.size.height;


            var padding = $("#viewer-" + channelSanitized +
                            " .panel-heading").height() +
                          parseInt($("#viewer-" + channelSanitized +
                                     " .panel-heading").css("padding-top"), 10) +
                          parseInt($("#viewer-" + channelSanitized +
                                     " .panel-heading").css("padding-bottom"), 10) +
                          parseInt($("#viewer-" + channelSanitized +
                                     " .viewer-content").css("padding-bottom"), 10) +
                          parseInt($(this).css("margin-bottom"), 10) - 4;

            // this accounts for some lag in the ui.size value, if you take this away
            // you'll get some instable behaviour
            $(this).height(currentHeight);

            // set the content panel width
            $("#viewer-" + channelSanitized +
              " .viewer-content").height(currentHeight - padding);
        }
    });

    $(".ui-resizable-se").removeClass("ui-icon-gripsmall-diagonal-se");
    $(".ui-resizable-se").removeClass("ui-icon");

    pinViewer(channelSanitized, false);
}

function updateViewer(channel, msg)
{
    var c = channel.replace(" ", "_");
    delete msg["__type"];
    delete msg["__hash"];

    for (var field in msg) {
        updateField(c, c + field, msg[field]);
    }

    if ($("#viewer-" + c + " .viewer-content").css("visibility") == "hidden") {
        $(".viewer-content").css("visibility", "visible");
    }
}

function updateField(channel, prefix, field)
{
    var type = $.type(field);
    switch(type) {

        case 'object':
            for (var f in field) {
                updateField(channel, prefix + f, field[f]);
            }
            break;

        case 'array':
            for (var i = 0; i < field.length; ++i) {
                updateField(channel, prefix + i, field[i]);
            }
            break;

        default:
            $("#viewer-" + channel + " .viewer-content #" + prefix).text(field);
            break;
    }
}

function showChannel(channel)
{
    if (channel in channelIdx)
        setupViewer(channel, messages[channelIdx[channel]].msg);
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
    $(".viewer-content").css("visibility", "hidden");
}

function pinViewer(channel, enabled)
{
    $("#viewer-" + channel).resizable({disabled:enabled});
    $("#viewer-" + channel).draggable({disabled:enabled});
    $("#viewer-" + channel).css("cursor", enabled ? "" : "move");
    $(".ui-resizable-se").removeClass("ui-icon-gripsmall-diagonal-se");
    $(".ui-resizable-se").removeClass("ui-icon");
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
