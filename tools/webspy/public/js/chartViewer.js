function chartViewer()
{
    var parent = this;

    this.createPanel = function()
    {
        return this.prototype.createPanel();
    }

    this.prototype = new panel();

    this.plot = function()
    {
    }
}
