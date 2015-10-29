var z;

var messages = [];
var channelIdx = {};
var viewIdx = null;

function handle(channel, msg)
{
    var utime = Date.now() * 1000;
    var freq = 0;

    if (!(channel in channelIdx)) {
        channelIdx[channel] = messages.length;
        messages.push({});
    } else {
        var freq_now = 1000000 / (utime - messages[channelIdx[channel]].utime);
        freq = messages[channelIdx[channel]].frequency * 0.1 + freq_now * 0.9;
    }

    messages[channelIdx[channel]] = {channel: channel,
                                     type: msg.__type,
                                     frequency: freq.toFixed(2),
                                     utime: utime,
                                     msg: msg};

    var source   = $("#messages-template").html();
    var template = Handlebars.compile(source);
    var data = { messages: messages }
    $("#message-table").html(template(data));

    if (viewIdx != null && channelIdx[channel] == viewIdx) {
        setupViewer(channel, messages[channelIdx[channel]].msg);
    }
}

function setupViewer(channel, msg) {
    $("#message-viewer-channel").text(channel);
    $("#message-viewer-content").html("");
    delete msg["__type"];
    delete msg["__hash"];
    $("#message-viewer-content").jsonView(msg);
}

function showChannel(channel) {
    if (channel in channelIdx) {
        viewIdx = channelIdx[channel];
        setupViewer(channel, messages[channelIdx[channel]].msg);
    }
}

var subscriptions = [];

onload = function() {
    z = zcm.create()
    subscriptions.push({channel: ".*",
                        subscription: z.subscribe_all(handle)});
}

