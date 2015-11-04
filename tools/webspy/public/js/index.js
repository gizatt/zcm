var z;

var viewers = [];
var viewerChannelIdx = {};

function showChannel(channel, msg)
{
    if (!(channel in viewerChannelIdx)) {
        var mv = new messageViewer(channel);
        $('#viewers').append(mv.createPanel(msg));

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

var subscriptions = [];

onload = function()
{
    z = zcm.create()
    cv = new channelViewer();
    subscriptions.push({channel: ".*",
                        subscription: z.subscribe_all(function(channel, msg){
                            cv.handle(channel, msg);
                            if (channel in viewerChannelIdx) {
                                viewers[viewerChannelIdx[channel]].updateViewer(msg);
                                viewers[viewerChannelIdx[channel]].showPanel();
                            }
                        })});

    $('#channelViewer').append(cv.createPanel(showChannel));
    cv.onClear(function(){
        for (var mv in viewers) {
            viewers[mv].hidePanel();
        }
    });

    var chart = new chartViewer("utime");
    $('#viewers').append(chart.createPanel());

    $(".ui-resizable-se").removeClass("ui-icon-gripsmall-diagonal-se");
    $(".ui-resizable-se").removeClass("ui-icon");
}
