var z;

var viewers = [];
var viewerChannelIdx = {};

var chartViewers = [];
var channelChartMap = {};

function showChannel(channel, msg)
{
    if (!(channel in viewerChannelIdx)) {
        var mv = new messageViewer(channel);

        $('#viewers').append(mv.createPanel(msg));

        mv.onFieldClick(function(channel, field){
            var chart = new chartViewer(field.attr('data-field'));
            if (!(channel in channelChartMap))
                channelChartMap[channel] = [];
            chartViewers.push({"chart" : chart,
                               "fields" : [{"channel" : channel,
                                            "fieldId" : field.attr('data-field')}]});
            channelChartMap[channel].push(chartViewers[chartViewers.length - 1]);
            $('#viewers').append(chart.createPanel())
        });

        viewerChannelIdx[channel] = viewers.length;
        viewers.push({});
        viewers[viewerChannelIdx[channel]] = mv
    } else {
        if (viewers[viewerChannelIdx[channel]].isClosed()) {
            var mv = new messageViewer(channel);
            $('#viewers').append(mv.createPanel(msg));
            viewers[viewerChannelIdx[channel]] = mv
        }
    }

    $(".ui-resizable-se").removeClass("ui-icon-gripsmall-diagonal-se");
    $(".ui-resizable-se").removeClass("ui-icon");
}

function updateChart(chart, msg, channel)
{
    return updateChartHelper(chart, msg, channel, channel);
}

function updateChartHelper(chart, msg, channel, prefix)
{
    var type = $.type(msg);

    if (type != 'object' && type != 'array') return;

    for (var field in msg) {
        updateChartHelper(chart, msg[field], channel, prefix + " " + field);
        for (var i = 0; i < chart.fields.length; ++i) {
            if ((chart.fields[i].channel == channel) &&
                (chart.fields[i].fieldId == prefix + " " + field)) {
                chart["chart"].plot(new Date().getTime(), msg[field], field);
                break;
            }
        }
    }
}

var subscriptions = [];

function playPauseToggle()
{
    if (subscriptions.length == 0) {
        subscribe_all();
        $("#playPause").removeClass("btn-success");
        $("#playPause").addClass("btn-danger");
        $("#playPause").addClass("glyphicon-pause");
        $("#playPause").removeClass("glyphicon-play");
    } else {
        z.unsubscribe(subscriptions[0]["subscription"]);
        subscriptions = [];
        $("#playPause").addClass("btn-success");
        $("#playPause").removeClass("btn-danger");
        $("#playPause").removeClass("glyphicon-pause");
        $("#playPause").addClass("glyphicon-play");
    }
}

function subscribe_all()
{
    subscriptions.push({channel: ".*",
                        subscription: z.subscribe_all(function(channel, msg){
                            cv.handle(channel, msg);
                            if (channel in viewerChannelIdx) {
                                delete msg["__type"];
                                delete msg["__hash"];
                                viewers[viewerChannelIdx[channel]].updateViewer(msg);
                                viewers[viewerChannelIdx[channel]].showPanel();
                            }

                            if (channelChartMap[channel]) {
                                for (var i = 0; i < channelChartMap[channel].length; ++i) {
                                    if (channelChartMap[channel][i]["chart"].isClosed()) {
                                        channelChartMap[channel].splice(i, 1);
                                        continue;
                                    }

                                    updateChart(channelChartMap[channel][i], msg, channel);
                                }
                            }
                        })});
}

onload = function()
{
    z = zcm.create()
    subscribe_all();

    cv = new channelViewer();

    $('#channelViewer').append(cv.createPanel(showChannel));
    cv.onClear(function(){
        for (var mv in viewers) {
            viewers[mv].hidePanel();
        }
    });

    $(".ui-resizable-se").removeClass("ui-icon-gripsmall-diagonal-se");
    $(".ui-resizable-se").removeClass("ui-icon");
}
