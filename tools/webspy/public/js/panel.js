var __PANEL_KEYS_ZCM__ = [];
function panel()
{
    var parent = this;

    this.panelId = "panel-" + __PANEL_KEYS_ZCM__.push(__PANEL_KEYS_ZCM__.length);
    this.closed = false;
    this._close = null;

    this.panel = null;
    this.btnPin = null;
    this.btnClose = null;

    this.createPanel = function(header, body, panelClass)
    {
        if (!panelClass) panelClass = "panel-default";

        parent.panel = $('<div />', { 'id' : parent.panelId,
                                   'class' : 'panel ' + panelClass });

        var panelHeading = $('<div />', { 'class' : 'clearfix row' });
        if (header)
            panelHeading.append(header);

        var panelBody = $('<div />', { 'class' : 'panel-body' });
        if (body)
            panelBody.append(body);

        parent.btnClose = $('<div />', { 'class' : 'btn btn-xs glyphicon ' +
                                             'glyphicon-remove pull-right',
                                  'stlye' : 'z-index:99;' });
        parent.btnClose.on('click', parent.close);
        parent.btnPin = $('<div />', { 'class' : 'btn btn-xs glyphicon ' +
                                              'glyphicon-pushpin pull-right',
                                    'stlye' : 'z-index:99;' });
        parent.btnPin.on('click', function(){
            if ($(this).hasClass('active'))
                parent.unpinPanel();
            else
                parent.pinPanel();
        });
        var tools = $('<div />', { 'class' : 'clearfix pull-right' })
                        .append(parent.btnClose)
                        .append(parent.btnPin);

        panelHeading.append(tools);
        panelHeading = $('<div />', { 'class' : 'panel-heading' }).append(panelHeading);

        parent.panel.append(panelHeading);
        parent.panel.append($('<div />', { 'class' : 'panel-panel-body' }).append(panelBody));

        parent.panel.resizable();
        parent.panel.draggable();
        parent.panel.css("cursor", "move");

        return parent.panel;
    }

    this.unpinPanel = function()
    {
        parent.btnPin.removeClass('active');
        parent.panel.resizable({ disabled : false });
        parent.panel.draggable({ disabled : false });
        parent.panel.css("cursor", "move");
    }

    this.pinPanel = function()
    {
        parent.btnPin.addClass('active');
        parent.panel.resizable({ disabled : true });
        parent.panel.draggable({ disabled : true });
        parent.panel.css("cursor", "");
    }

    this.close = function()
    {
        if (parent._close) {
            parent._close();
            return;
        }
        parent.closed = true;
        parent.panel.remove();
    }

    this.isClosed = function()
    {
        return parent.closed;
    }

    this.overrideClose = function(override)
    {
        parent._close = override;
    }
}
