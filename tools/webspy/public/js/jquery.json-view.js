/**
 * json-view - jQuery collapsible JSON plugin
 * @version v1.0.0
 * @link http://github.com/bazh/jquery.json-view
 * @license MIT
 */
;(function ($) {
    'use strict';

    var collapser = function(name, collapsed) {
        var item = $('<span />', {
            'data-field': name,
            'class': 'collapser',
            on: {
                click: function() {
                    var $this = $(this);

                    $this.toggleClass('collapsed');
                    var block = $this.parent().children('.block');
                    var ul = block.children('ul');

                    if ($this.hasClass('collapsed')) {
                        ul.hide();
                        block.children('.dots, .comments').show();
                    } else {
                        ul.show();
                        block.children('.dots, .comments').hide();
                    }
                }
            }
        });

        if (collapsed) {
            item.addClass('collapsed');
        }

        return item;
    };

    var formatter = function(json, opts, collapsed, prefix) {
        var options = $.extend({}, {
            nl2br: true
        }, opts);

        var htmlEncode = function(html) {
            if (!html.toString()) {
                return '';
            }

            return html.toString().replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
        };

        var span = function(val, cls) {
            return $('<span />', {
                'class': cls,
                html: htmlEncode(val)
            });
        };

        var genBlock = function(prefix, val, level) {
            switch($.type(val)) {
                case 'object':
                    if (!level) {
                        level = 0;
                    }

                    var output = $('<span />', {
                        'class': 'block'
                    });

                    var cnt = Object.keys(val).length;
                    if (!cnt) {
                        return output;
                    }

                    var attr;
                    if (level != 0) {
                        output.append(span('{', 'b'));

                        attr = {'class': 'obj collapsible level' + level}

                    } else {
                        attr = {'class': 'obj collapsible level' + level,
                                'style': 'border-left:none;'};
                    }

                    var items = $('<ul />', attr);

                    $.each(val, function(key, data) {
                        cnt--;
                        var item = $('<li />')
                            .append(span('"', 'q'))
                            .append(key)
                            .append(span('"', 'q'))
                            .append(': ')
                            .append(genBlock(prefix + key, data, level + 1));

                        if (['object', 'array'].indexOf($.type(data)) !== -1 && !$.isEmptyObject(data)) {
                            var tmp;
                            if (collapsed != null) {
                                if (key in collapsed)
                                    tmp = collapser(key, collapsed[key]);
                                else
                                    tmp = collapser(key, options.collapsed);
                            } else {
                                tmp = collapser(key, options.collapsed);
                            }
                            item.prepend(tmp)
                            if (tmp.hasClass("collapsed")) {
                                var block = tmp.parent().children('.block');
                                var ul = block.children('ul');

                                ul.hide();
                                block.children('.dots, .comments').show();
                            }
                        }

                        if ($.type(data) == 'number') {
                            item.wrapInner($('<div />', {'style': 'float: left;'}));
                            item.append($("<canvas />", {'style': 'float: right; overflow: hidden;',
                                                         'id': prefix + key + '-graph' })
                                         .prop({'height':'20', 'width':'100'}));
                            item.append($('<div />', { 'class' : 'clearfix' }));
                        }

                        items.append(item);
                    });

                    output.append(items);
                    output.append(span('...', 'dots'));
                    if (level != 0)
                        output.append(span('}', 'b'));
                    if (Object.keys(val).length === 1) {
                        output.append(span('// 1 item', 'comments'));
                    } else {
                        output.append(span('// ' + Object.keys(val).length + ' items', 'comments'));
                    }

                    return output;

                case 'array':
                    if (!level) {
                        level = 0;
                    }

                    var cnt = val.length;

                    var output = $('<span />', {
                        'class': 'block'
                    });

                    if (!cnt) {
                        return output
                            .append(span('[', 'b'))
                            .append(' ')
                            .append(span(']', 'b'));
                    }

                    output.append(span('[', 'b'));

                    var items = $('<ul />', {
                        'class': 'obj collapsible level' + level,
                    });

                    $.each(val, function(key, data) {
                        cnt--;
                        var item = $('<li />')
                            .append(genBlock(prefix + key, data, level + 1));

                        if (['object', 'array'].indexOf($.type(data)) !== -1 && !$.isEmptyObject(data)) {
                            var tmp;
                            if (collapsed != null) {
                                if (key in collapsed)
                                    tmp = collapser(key, collapsed[key]);
                                else
                                    tmp = collapser(key, options.collapsed);
                            } else {
                                tmp = collapser(key, options.collapsed);
                            }
                            item.prepend(tmp)
                            if (tmp.hasClass("collapsed")) {
                                var block = tmp.parent().children('.block');
                                var ul = block.children('ul');

                                ul.hide();
                                block.children('.dots, .comments').show();
                            }
                        }

                        if ($.type(data) == 'number') {
                            item.wrapInner($('<div />', {'style': 'float: left;'}));
                            item.append($("<canvas />", {'style': 'float: right; overflow: hidden;',
                                                         'id': prefix + key + '-graph' })
                                         .prop({'height':'20', 'width':'100'}));
                            item.append($('<div />', { 'class' : 'clearfix' }));
                        }

                        items.append(item);
                    });

                    output.append(items);
                    output.append(span('...', 'dots'));
                    output.append(span(']', 'b'));
                    if (val.length === 1) {
                        output.append(span('// 1 item', 'comments'));
                    } else {
                        output.append(span('// ' + val.length + ' items', 'comments'));
                    }

                    return output;

                case 'string':
                    val = htmlEncode(val);
                    if (/^(http|https|file):\/\/[^\s]+$/i.test(val)) {
                        return $('<span />')
                            .append(span('"', 'q'))
                            .append($('<a />', {
                                href: val,
                                text: val
                            }))
                            .append(span('"', 'q'));
                    }
                    if (options.nl2br) {
                        var pattern = /\n/g;
                        if (pattern.test(val)) {
                            val = (val + '').replace(pattern, '<br />');
                        }
                    }

                    var text = $('<span />', {
                                    'id': prefix,
                                    'class': 'str'
                                }).html(val);

                    return $('<span />')
                        .append(span('"', 'q'))
                        .append(text)
                        .append(span('"', 'q'));

                case 'number':
                    return $('<span />', {
                                'id': prefix,
                                'class': 'num'
                            }).html(val.toString());

                case 'undefined':
                    return $('<span />', {
                                'id': prefix,
                                'class': 'undef'
                            }).html('undefined');

                case 'null':
                    return $('<span />', {
                                'id': prefix,
                                'class': 'null'
                            }).html('null');

                case 'boolean':
                    return $('<span />', {
                                'id': prefix,
                                'class': 'bool'
                            }).html(val ? 'true' : 'false');
            }
        };

        return genBlock(prefix, json, 0);
    };

    var collapsed = {};
    var lastKey = null;

    return $.fn.jsonView = function(json, options, key) {
        var $this = $(this);

        if (lastKey != null) {
            collapsed[lastKey] = {};
            $this.find(".collapser").each(function() {
                collapsed[lastKey][$(this).data("field")] = $(this).hasClass("collapsed");
            })
        }
        lastKey = key;

        $this.html("");

        options = $.extend({}, {
            nl2br: true
        }, options);

        if (typeof json === 'string') {
            try {
                json = JSON.parse(json);
            } catch (err) {
            }
        }

        $this.append($('<div />', {
            class: 'json-view'
        }).append(formatter(json, options, collapsed[key], key)));

        return $this;
    };

})(jQuery);
