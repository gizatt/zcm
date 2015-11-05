function chartViewer(title)
{
    var parent = this;

    this.__proto__ = new panel();

    this.title = title;

    this.chart = null;
    this.datasets = {};

    this.createPanel = function()
    {
        var wrapper = $('<div />', {'class' : 'chart-viewer'});

        var header = $('<h4 />', { 'class' : 'title' }).text(parent.title);

        parent.chart = $('<div />', { 'class' : 'chart' })

        var panel = parent.__proto__.createPanel(header, parent.chart, "panel-success");

        wrapper.append(panel);

        return wrapper;
    }

    this.plot = function(utime, val, key, max)
    {
        if (!key) key = "__";
        if (!(key in parent.datasets))
            parent.datasets[key] = {"x":[], "y":[], "name":key};

        parent.datasets[key]["x"].push(utime);
        parent.datasets[key]["y"].push(val);

        if (!max) max = 100;
        if (parent.datasets[key]["x"].length > max) {
            parent.datasets[key]["x"].shift();
            parent.datasets[key]["y"].shift();
        }

        var data = Object.keys(parent.datasets).map(function (key) {
            return parent.datasets[key]
        });

        var opts = { margin: { t: 0 } };

        Plotly.newPlot(parent.chart[0], data, opts);
    }
}
