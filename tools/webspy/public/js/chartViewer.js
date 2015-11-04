function chartViewer(title)
{
    var parent = this;

    this.createPanel = function(title)
    {
        var wrapper = $('<div />', {'class' : 'chart-viewer'});

        var header = $('<h4 />', { 'class' : 'title' }).text(parent.title);

        var panel = this.__proto__.createPanel(header, null, "panel-success");

        wrapper.append(panel);

        return wrapper;
    }

    this.__proto__ = new panel();

    this.plot = function()
    {
    }

    this.title = title;
}
