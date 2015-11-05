var z;

var viewers = [];
var viewerChannelIdx = {};

var chartViewers = [];
var channelChartMap = {};

var menuList;

function showChannel(channel, msg)
{
    if (!(channel in viewerChannelIdx)) {
        var mv = new messageViewer(channel);

        var panel = mv.createPanel(msg);
        panel.find('.json-number').attr('data-toggle', 'context')
                                  .attr('data-target', '#chart-menu');
        panel.find('.json-number').attr('oncontextmenu', 'return false;');
        $('#viewers').append(panel);

        mv.onFieldRightClick(fieldRightClick);

        viewerChannelIdx[channel] = viewers.length;
        viewers.push({});
        viewers[viewerChannelIdx[channel]] = mv
    } else {
        if (viewers[viewerChannelIdx[channel]].isClosed()) {
            var mv = new messageViewer(channel);

            var panel = mv.createPanel(msg);
            panel.find('.json-number').attr('data-toggle', 'context')
                                      .attr('data-target', '#chart-menu');
            panel.find('.json-number').attr('oncontextmenu', 'return false;');
            $('#viewers').append(panel);

            mv.onFieldRightClick(fieldRightClick);

            viewers[viewerChannelIdx[channel]] = mv
        }
    }

    $(".ui-resizable-se").removeClass("ui-icon-gripsmall-diagonal-se");
    $(".ui-resizable-se").removeClass("ui-icon");
}

function fieldRightClick(channel, field)
{
    menuList.html('');

    var newChart = $('<a />', { 'tabindex' : -1,
                                'href' : 'javascript:void(0);' })
                        .text("New Graph")
                        .attr('data-viewer-idx', -1);
    newChart = $('<li />').append(newChart);
    menuList.append(newChart);

    for (var chart in chartViewers) {
        console.log(chart);
        var item = $('<a />', { 'tabindex' : -1,
                                'href' : 'javascript:void(0);' })
                        .text(chartViewers[chart]["chart"].title)
                        .attr('data-viewer-idx', chart);
        item = $('<li />').append(item);
        menuList.append(item);
    }

    $('#chart-menu').contextmenu();

    $('#chart-menu li').on('click', function(){
        var idx = $(this).find('a').attr('data-viewer-idx');
        if (idx == -1) {
            var chart = new chartViewer(field.attr('data-field'));
            chartViewers.push({"chart" : chart,
                               "fields" : [{"channel" : channel,
                                            "fieldId" : field.attr('data-field')}]});
            idx = 0;
            $('#viewers').append(chart.createPanel())
        } else {
            chartViewers[idx]["fields"].push({"channel" : channel,
                                              "fieldId" : field.attr('data-field')});
        }
        if (!(channel in channelChartMap))
            channelChartMap[channel] = [];
        channelChartMap[channel].push(chartViewers[idx]);
    });
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

    menuList = $('<ul />', { 'class' : 'dropdown-menu',
                             'role' : 'menu' });

    var menu = $('<div />', { 'id' : 'chart-menu' }).append(menuList);

    $('body').append(menu);

    $(".ui-resizable-se").removeClass("ui-icon-gripsmall-diagonal-se");
    $(".ui-resizable-se").removeClass("ui-icon");
}
