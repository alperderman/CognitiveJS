//CognitiveJS

if (!Object.assign) { Object.defineProperty(Object, 'assign', { enumerable: false, configurable: true, writable: true, value: function(target) { 'use strict'; if (target === undefined || target === null) { throw new TypeError('Cannot convert first argument to object'); } var to = Object(target); for (var i = 1;i < arguments.length;i++) { var nextSource = arguments[i]; if (nextSource === undefined || nextSource === null) { continue; } nextSource = Object(nextSource); var keysArray = Object.keys(Object(nextSource)); for (var nextIndex = 0, len = keysArray.length;nextIndex < len;nextIndex++) { var nextKey = keysArray[nextIndex]; var desc = Object.getOwnPropertyDescriptor(nextSource, nextKey); if (desc !== undefined && desc.enumerable) { to[nextKey] = nextSource[nextKey]; } } } return to; } }); }
if (typeof window.CustomEvent !== 'function') { window.CustomEvent = function (event, params) { params = params || {bubbles: false, cancelable: false, detail: null}; var evt = document.createEvent('CustomEvent'); evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail); return evt; }; }

var cog = {};
cog.cacheRender = false;
cog.tokenDelimiter = "%";
cog.labelSet = "data-set";
cog.labelBind = "data-bind";
cog.labelProp = "data-prop";
cog.labelHead = "head";
cog.labelSkip = "skip";
cog.labelSource = "data-src";
cog.labelSourceAwait = "await";
cog.labelSourceObj = "data-obj";
cog.labelSourceMet = "data-met";
cog.eventBeforeData = "COGBeforeData";
cog.eventAfterData = "COGAfterData";
cog.eventBeforeRender = "COGBeforeRender";
cog.eventAfterRender = "COGAfterRender";
cog.bindKeySet = "set";
cog.bindKeyIf = "if";
cog.bindKeyBind = "bind";
cog.data = {};
cog.templates = {};
cog.bindTypes = {};
cog.repeatKeywords = [
    {key: "_this", if: "pure == self.key", val:"parent"},
    {key: "_key", if: "pure == alias+'.'+self.key", val:"key"},
    {key: "_index", if: "pure == alias+'.'+self.key", val:"i"}
];
cog.regexHead = new RegExp("<head[^>]*>((.|[\\n\\r])*)<\\/head>", "im");
cog.regexBody = new RegExp("<body[^>]*>((.|[\\n\\r])*)<\\/body>", "im");
cog.regexScripts = new RegExp("<script[^>]*>([\\s\\S]*?)<\\/script>", "gim");

cog.get = function (key, val, callback) {
    if (key == null) {return;}
    var result, old, changed = [];
    if (val != null) {
        result = val;
        if (cog.eval("cog.data."+key) != val) {
            old = cog.eval("cog.data."+key);
            document.dispatchEvent(new CustomEvent(cog.eventBeforeData, {detail:{key:key, old:old, new:val}}));
            eval("cog.data."+key+" = val");
            rebind(key);
            document.dispatchEvent(new CustomEvent(cog.eventAfterData, {detail:{elems:changed, key:key, old:old, new:val}}));
        }
    } else {
        result = cog.eval("cog.data."+key);
    }
    if (typeof callback !== 'undefined') {
        callback({elems:changed, key:key, old:old, new:val});
    }
    function rebind(key, i) {
        if (i == null) {i = 0;}
        var elems, elem, elemBind, elemBindSplit, bound = false, ii;
        elems = document.querySelectorAll("["+cog.labelBind+"]:not(["+cog.labelSkip+"])");
        if (i < elems.length) {
            elem = elems[i];
            elemBind = elem.getAttribute(cog.labelBind);
            if (elemBind.indexOf(key) != -1 || key.indexOf(elemBind) != -1) {
                elemBindSplit = cog.parseBind(elemBind);
                for (ii = 0;ii < elemBindSplit.length;ii++) {
                    if (elemBindSplit[ii].trim().indexOf(key) === 0 || key.indexOf(elemBindSplit[ii].trim()) === 0) {
                        bound = true;
                        break;
                    }
                }
                if (bound) {
                    changed.push(elem);
                    cog.bind(elem);
                }
            }
            i++;
            rebind(key, i);
        }
    }
    return result;
};
cog.getElementBind = function (elem) {
    var elemBinds = elem.getAttribute(cog.labelBind), binds;
    if (elemBinds != null) {
        binds = [];
        cog.parseBind(elemBinds).forEach(function (bind) {
            binds.push(bind.trim());
        });
    }
    return binds;
};
cog.getElementProp = function (elem) {
    var elemProps = elem.getAttribute(cog.labelProp), props;
    if (elemProps != null) {
        props = cog.parseProp(elemProps);
    }
    return props;
};
cog.parseSet = function (str) {
    return str.split(":");
};
cog.parseBind = function (str) {
    return str.split(",");
};
cog.parseProp = function (str) {
    var result = cog.isValidJSON(str);
    if (!result) {
        if (str.trim().indexOf("{") === 0) {
            result = cog.eval("(["+str+"])");
        } else {
            result = cog.eval("({"+str+"})");
        }
    }
    return result;
};
cog.newBind = function (arg) {
    if (cog.bindTypes[arg.name] == null) {
        cog.bindTypes[arg.name] = {};
    }
    if (arg.if != null) {
        cog.bindTypes[arg.name][cog.bindKeyIf] = arg.if;
    }
    if (arg.bind != null) {
        cog.bindTypes[arg.name][cog.bindKeyBind] = function (elem, prop, props, propIndex) {arg.bind(elem, prop, props, propIndex);};
    }
    if (arg.set != null) {
        cog.bindTypes[arg.name][cog.bindKeySet] = function (elem, key) {arg.set(elem, key);};
    }
};
cog.bind = function (node, arg) {
    var nodeProp, nodePropData, nodeAttr;
    if (arg == null) {arg = {};}
    if (typeof node === 'string') {
        cog.get(node, arg.value, arg.callback);
        return function (val, callback) {
            return cog.get(node, val, callback);
        };
    } else {
        if (arg.prop !== undefined) {
            if (arg.prop == "" || Object.keys(arg.prop).length == 0) {
                node.removeAttribute(cog.labelProp);
                nodePropData = null;
            } else {
                nodePropData = arg.prop;
            }
            if (typeof arg.prop === 'string' && arg.prop != "") {
                node.setAttribute(cog.labelProp, arg.prop);
            }
            if (typeof arg.prop !== 'string' && Object.keys(arg.prop).length != 0) {
                node.setAttribute(cog.labelProp, JSON.stringify(arg.prop));
            }
        } else {
            nodePropData = node.getAttribute(cog.labelProp);
        }
        if (typeof nodePropData === 'string' && nodePropData != null) {
            nodeProp = cog.parseProp(nodePropData);
        } else {
            nodeProp = nodePropData;
        }
        if (arg.bind !== undefined) {
            if (typeof arg.bind === 'string') {
                if (arg.bind != "") {
                    node.setAttribute(cog.labelBind, arg.bind);
                } else {
                    node.removeAttribute(cog.labelBind);
                }
            } else {
                if (arg.bind.length > 0) {
                    nodeAttr = "";
                    arg.bind.forEach(function (bind, i) {
                        if (i != arg.bind.length-1) {
                            nodeAttr += bind+",";
                        } else {
                            nodeAttr += bind;
                        }
                    });
                    node.setAttribute(cog.labelBind, nodeAttr);
                } else {
                    node.removeAttribute(cog.labelBind);
                }
            }
        }
        if (nodeProp != null) {
            if (Array.isArray(nodeProp)) {
                nodeProp.forEach(function (prop, i) {
                    bind_prop(node, prop, nodeProp, i);
                });
            } else {
                bind_prop(node, nodeProp);
            }
        }
    }
    function bind_prop(node, prop, props, propIndex) {
        var bindType;
        for (bindType in cog.bindTypes) {
            if (cog.bindTypes[bindType][cog.bindKeyIf] != null && cog.bindTypes[bindType][cog.bindKeyBind] != null) {
                if (eval(cog.bindTypes[bindType][cog.bindKeyIf])) {
                    cog.bindTypes[bindType][cog.bindKeyBind](node, prop, props, propIndex);
                }
            }
        }
    }
};
cog.bindAll = function (arg) {
    if (arg == null) {arg = {};}
    if (arg.node == null) {arg.node = document;}
    if (arg.i == null) {arg.i = 0;}
    if (arg.i == 0 && arg.data != null) {cog.data = arg.data;}
    var elems = arg.node.querySelectorAll("["+cog.labelProp+"]:not(["+cog.labelSkip+"])");
    if (arg.i < elems.length) {
        cog.bind(elems[arg.i]);
        arg.i++;
        cog.bindAll(arg);
    } else {
        if (typeof arg.callback !== 'undefined') {
            arg.callback();
        }
    }
};
cog.replaceToken = function (node, replace) {
    var attrBind, attrProp, child, childs, i;
    if (typeof node === 'string') {
        return replace_string(node);
    } else {
        childs = node.querySelectorAll("["+cog.labelBind+"], ["+cog.labelProp+"]");
        for (i = 0;i < childs.length;i++) {
            child = childs[i];
            if (child.getAttribute(cog.labelBind) != null) {
                attrBind = replace_string(child.getAttribute(cog.labelBind));
                child.setAttribute(cog.labelBind, attrBind);
            }
            if (child.getAttribute(cog.labelProp) != null) {
                attrProp = replace_string(child.getAttribute(cog.labelProp));
                child.setAttribute(cog.labelProp, attrProp);
            }
            
        }
    }
    function parse_token(str) {
        var delimiters = [], tokens = [], text, i;
        for (i = 0;i < str.length;i++) {
            if (str[i] === cog.tokenDelimiter) {
                if (delimiters.length != 0) {
                    text = str.slice(delimiters[delimiters.length-1], i+1);
                    if (text.substring(cog.tokenDelimiter.length, text.length-cog.tokenDelimiter.length) != "") {
                        tokens.push(text);
                    }
                }
                delimiters.push(i);
            }
        }
        return tokens;
    }
    function replace_string(str) {
        var tokens, result = str;
        tokens = cog.removeDuplicatesFromArray(parse_token(result));
        tokens.forEach(function (token) {
            var tokenPure, tokenData;
            tokenPure = token.substring(cog.tokenDelimiter.length, token.length-cog.tokenDelimiter.length);
            tokenData = replace(tokenPure.trim());
            if (tokenData != null) {
                result = cog.replaceAll(result, token, tokenData, 'gim');
            }
        });
        if (str != result) {
            result = replace_string(result);
        }
        return result;
    }
};
cog.loadTemplate = function (arg, bind) {
    var template;
    if (arg.id == null) {return;}
    if (cog.templates[arg.id] == null && arg.el != null) {
        cog.templates[arg.id] = arg.el.cloneNode(true);
    }
    if (cog.templates[arg.id] != null) {
        template = cog.templates[arg.id].cloneNode(true);
    }
    if (arg.data != null && template != null) {
        cog.replaceToken(template, function (pure) {
            if (pure == arg.data.split(" ")[2]) {
                return arg.data.split(" ")[0];
            } else {
                return null;
            }
        });
    }
    if (bind) {
        cog.bindAll({node:template});
    }
    return template;
};
cog.checkIf = function (str) {
    if (str != null && cog.eval(cog.replaceToken(str, function (pure) {return "cog.data."+pure;}))) {
        return true;
    } else {
        return false;
    }
};
cog.eval = function (str) {
    try {return eval(str);} catch (e) {}
};
cog.init = function () {
    cog.newBind({
        name: "json",
        set: function (elem, key) {
            eval("cog.data."+key+" = JSON.parse(elem.innerText);");
        }
    });
    cog.newBind({
        name: "text",
        if: "prop.text != null && (prop.if == null || cog.checkIf(prop.if))",
        bind: function (elem, prop, props, propIndex) {
            var propData;
            propData = cog.replaceToken(prop.text, function (pure) {
                return cog.eval("cog.data."+pure);
            });
            if (propData != null) {
                elem.innerText = propData;
            }
        },
        set: function (elem, key) {
            eval("cog.data."+key+" = elem.innerText;");
        }
    });
    cog.newBind({
        name: "html",
        if: "prop.html != null && (prop.if == null || cog.checkIf(prop.if))",
        bind: function (elem, prop, props, propIndex) {
            var propData;
            propData = cog.replaceToken(prop.html, function (pure) {
                return cog.eval("cog.data."+pure);
            });
            if (propData != null) {
                elem.innerHTML = propData;
            }
        },
        set: function (elem, key) {
            eval("cog.data."+key+" = elem.innerHTML;");
        }
    });
    cog.newBind({
        name: "if",
        if: "prop.if != null && Object.keys(prop).length == 1",
        bind: function (elem, prop, props, propIndex) {
            if (!cog.checkIf(prop.if)) {
                elem.style.display = 'none';
            } else {
                elem.style.display = null;
            }
        }
    });
    cog.newBind({
        name: "class",
        if: "prop.class != null",
        bind: function (elem, prop, props, propIndex) {
            var propData;
            if (prop.current != null && (prop.if == null || !cog.checkIf(prop.if))) {
                prop.current.split(" ").forEach(function (str) {
                    if (str != "") {
                        elem.classList.remove(str);
                    }
                });
                if (props != null) {
                    delete props[propIndex].current;
                    elem.setAttribute(cog.labelProp, JSON.stringify(props));
                } else {
                    delete prop.current;
                    elem.setAttribute(cog.labelProp, JSON.stringify(prop));
                }
            }
            if (prop.if == null || cog.checkIf(prop.if)) {
                propData = cog.replaceToken(prop.class.trim(), function (pure) {
                    return cog.eval("cog.data."+pure);
                });
                if (propData != null) {
                    if (props != null) {
                        props[propIndex].current = propData;
                        elem.setAttribute(cog.labelProp, JSON.stringify(props));
                    } else {
                        prop.current = propData;
                        elem.setAttribute(cog.labelProp, JSON.stringify(prop));
                    }
                    propData.split(" ").forEach(function (str) {
                        if (str != "") {
                            elem.classList.add(str);
                        }
                    });
                }
            }
        }
    });
    cog.newBind({
        name: "attr",
        if: "prop.attr != null && (prop.if == null || cog.checkIf(prop.if))",
        bind: function (elem, prop, props, propIndex) {
            var propData;
            propData = cog.replaceToken(prop.data, function (pure) {
                return cog.eval("cog.data."+pure);
            });
            if (propData != null) {
                elem.setAttribute(prop.attr, propData);
            }
        }
    });
    cog.newBind({
        name: "temp",
        if: "prop.temp != null && prop.repeat == null && (prop.if == null || cog.checkIf(prop.if))",
        bind: function (elem, prop, props, propIndex) {
            var template;
            if (prop.data != null) {
                template = cog.loadTemplate({id:prop.temp, data:prop.data});
            } else {
                template = cog.loadTemplate({id:prop.temp});
            }
            if (template != null) {
                elem.innerHTML = template.innerHTML;
            }
        },
        set: function (elem, key) {
            cog.loadTemplate({id:key, el:elem});
        }
    });
    cog.newBind({
        name: "repeat",
        if: "prop.repeat != null && (prop.if == null || cog.checkIf(prop.if))",
        bind: function (elem, prop, props, propIndex) {
            var propDatas, propData, propDatasIterate, template, repeatVal, i, key, parent = prop.repeat.split(" ")[0], alias = prop.repeat.split(" ")[2];
            propDatas = cog.eval("cog.data."+parent);
            if (propDatas != null) {
                cog.loadTemplate({id:prop.temp, el:elem});
                if (typeof propDatas === 'object' && !Array.isArray(propDatas)) {
                    propDatasIterate = Object.keys(propDatas);
                } else {
                    propDatasIterate = propDatas;
                }
                repeatVal = "";
                for (i = 0;i < propDatasIterate.length;i++) {
                    if (typeof propDatas === 'object' && !Array.isArray(propDatas)) {
                        propData = propDatas[Object.keys(propDatas)[i]];
                        key = Object.keys(propDatas)[i];
                    } else {
                        propData = propDatas[i];
                        key = i;
                    }
                    template = cog.loadTemplate({id:prop.temp});
                    cog.replaceToken(template, function (pure) {
                        var result = null;
                        if (pure == alias) {
                            if (typeof propDatas === 'object' && !Array.isArray(propDatas)) {
                                result = parent+"[\\'"+key+"\\']";
                            } else {
                                result = parent+"["+i+"]";
                            }
                        }
                        cog.repeatKeywords.forEach(function (self) {
                            if (eval(self.if)) {
                                result = eval(self.val);
                            }
                        });
                        return result;
                    });
                    repeatVal += template.innerHTML;
                }
                elem.innerHTML = repeatVal; 
            }
        }
    });
};
cog.render = function (layoutSrc, data) {
    var layout;
    step_start();
    function step_start() {
        cog.xhr(layoutSrc, function (xhr) {
            if (xhr.readyState == 4) {
                if (xhr.status == 200) {
                    layout = xhr.responseText;
                    step_design();
                }
            }
        });
    }
    function step_design() {
        while (document.getElementsByTagName('script').length > 0) {
            document.getElementsByTagName('script')[0].parentNode.removeChild(document.getElementsByTagName('script')[0]);
        }
        if ((/\<\/head\>/).test(layout)) {
            document.head.innerHTML += layout.match(cog.regexHead)[1];
        }
        if ((/\<\/body\>/).test(layout)) {
            document.documentElement.innerHTML = document.documentElement.innerHTML.replace("<body", "<body"+layout.match("<body" + "(.*)" + ">")[1]);
            document.body.innerHTML += layout.match(cog.regexBody)[1];
        }
        if (!(/\<\/head\>/).test(layout) && !(/\<\/body\>/).test(layout)) {
            document.body.innerHTML += layout;
        }
        setTimeout(function () {
            cog.loadContents(function () {
                step_set(function () {
                    step_detail();
                });
            });
        }, 0);
    }
    function step_set(callback) {
        var elem, attr, type, key, bindType;
        while (elem = document.querySelector("["+cog.labelSet+"]:not(["+cog.labelSkip+"])")) {
            attr = elem.getAttribute(cog.labelSet);
            type = cog.parseSet(attr)[0];
            key = cog.parseSet(attr)[1].trim();
            for (bindType in cog.bindTypes) {
                if (cog.bindTypes[bindType][cog.bindKeySet] != null && type == bindType) {
                    cog.bindTypes[bindType][cog.bindKeySet](elem, key);
                }
            }
            elem.parentNode.removeChild(elem);
        }
        if (typeof callback !== 'undefined') {
            callback();
        }
    }
    function step_detail() {
        var i, links = document.getElementsByTagName("link"), link, heads = document.querySelectorAll("["+cog.labelHead+"]"), head;
        for (i = 0;i < links.length;i++) {
            link = links[i];
            document.head.appendChild(link);
            link.href = link.href;
        }
        for (i = 0;i < heads.length;i++) {
            head = heads[i];
            head.removeAttribute("head");
            document.head.appendChild(head);
        }
        setTimeout(function () {
            step_bind();
        }, 0);
    }
    function step_bind() {
        document.dispatchEvent(new CustomEvent(cog.eventBeforeRender));
        setTimeout(function () {
            cog.bindAll({
                data: data,
                callback: function () {step_scripts();}
            });
        }, 0);
    }
    function step_scripts() {
        cog.loadScriptsNS(document.querySelectorAll("script:not(["+cog.labelSkip+"])"), function () {
            step_finish();
        });
    }
    function step_finish() {
        cog.DOMLoad();
        if (window.location.hash.slice(1) && document.getElementById(window.location.hash.slice(1))) {
            document.getElementById(window.location.hash.slice(1)).scrollIntoView();
        }
        setTimeout(function () {
            document.dispatchEvent(new CustomEvent(cog.eventAfterRender));
        }, 0);
    }
};
cog.isValidJSON = function (str) {
    var o;
    try {
        o = JSON.parse(str);
        if (o && typeof o === "object") {
            return o;
        }
    }
    catch (e) {}
    return false;
};
cog.replaceAll = function (str, find, replace, options) {
    if (options == null) {options = 'gim';}
    function escape_regex(string) {
        return string.replace(/[.*+\-?^${}()|[\]\\]/g, '\\$&');
    }
    return str.replace(new RegExp(escape_regex(find), options), replace);
};
cog.removeDuplicatesFromArray = function (arr) {
    var m = {}, newArr = [], i, v;
    if (arr) {
        for (i = 0;i < arr.length;i++) {
            v = arr[i];
            if (!m[v] && v != "") {
                newArr.push(v);
                m[v]=true;
            }
        }
    }
    return newArr;
};
cog.mergeDeep = function (target, source) {
    var output = Object.assign({}, target);
    if (is_object(target) && is_object(source)) {
        Object.keys(source).forEach(function (key) {
            if (is_object(source[key])) {
                if (!(key in target)) {
                    Object.assign(output, define_property({}, key, source[key]));
                } else {
                    output[key] = cog.mergeDeep(target[key], source[key]);
                }
            } else {
                Object.assign(output, define_property({}, key, source[key]));
            }
        });
    }
    function is_object(item) { return item && type_of(item) === 'object' && !Array.isArray(item); }
    function type_of(obj) { if (typeof Symbol === 'function' && typeof Symbol.iterator === "symbol") { type_of = function type_of(obj) { return typeof obj; }; } else { type_of = function type_of(obj) { return obj && typeof Symbol === 'function' && obj.constructor === Symbol && obj !== Symbol.prototype ? "symbol" : typeof obj; }; } return type_of(obj); }
    function define_property(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }
    return output;
};
cog.loadContents = function (callback) {
    var node, src, method, data;
    node = document.querySelector("["+cog.labelSource+"]:not(["+cog.labelSourceAwait+"]):not(["+cog.labelSkip+"])");
    if (node) {
        src = node.getAttribute(cog.labelSource);
        method = node.getAttribute(cog.labelSourceMet);
        data = node.getAttribute(cog.labelSourceObj);
        if (src != "") {
            if (data) {
                data = cog.eval("("+data+")");
            }
            node.setAttribute(cog.labelSourceAwait, "");
            cog.xhr(src, function (xhr, node) {
                if (xhr.readyState == 4) {
                    if (xhr.status == 200) {
                        node.outerHTML = xhr.responseText;
                    }
                }
            }, node, method, data);
            cog.loadContents(callback);
        }
    } else {
        if (typeof callback !== 'undefined') {
            if (!document.querySelector("["+cog.labelSourceAwait+"]:not(["+cog.labelSkip+"])")) {
                callback();
            } else {
                setTimeout(function () {
                    cog.loadContents(callback);
                }, 10);
            }
        }
    }
};
cog.loadScriptsNS = function (node, callback, i) {
    if (node == null) {node = document.getElementsByTagName("script");}
    if (i == null) {i = 0;}
    var len = node.length;
    if (len > 0 && i < len) {
        if (node[i].type != "text/html") {
            if (node[i].src) {
                cog.getScript(node[i].src, function () {
                    i++;
                    cog.loadScriptsNS(node, callback, i);
                });
            } else {
                cog.DOMEval(node[i].text);
                i++;
                cog.loadScriptsNS(node, callback, i);
            }
        } else {
            i++;
            cog.loadScriptsNS(node, callback, i);
        }
    } else {
        if (typeof callback !== 'undefined') {
            callback();
        }
    }
};
cog.getUrlParams = function (url) {
    var i, result = {}, queryString, keyValuePairs, keyValuePair, paramName, paramValue;
    queryString = query_string();
    if (queryString) {
        keyValuePairs = queryString.split('&');
        for (i = 0;i < keyValuePairs.length;i++) {
            keyValuePair = keyValuePairs[i].split('=');
            paramName = keyValuePair[0];
            if (keyValuePair[1]) {
                paramValue = keyValuePair[1];
            } else {
                paramValue = '';
            }
            result[paramName] = decodeURIComponent(paramValue.replace(/\+/g, ' '));
        }
    }
    function query_string() {
        var reducedUrl, queryString;
        reducedUrl = url.split('#')[0];
        queryString = reducedUrl.split('?')[1];
        if (!queryString) {
            if (reducedUrl.search('=') !== false) {
                queryString = reducedUrl;
            }
        }
        return queryString
    }
    return result;
};
cog.urlEncode = function (obj) {
    var key, result;
    if (typeof obj === 'object') {
        result = [];
        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                result.push(key + '=' + encodeURIComponent(obj[key]));
            }
        }
        result = result.join('&');
    } else {
        result = obj;
    }
    return result;
};
cog.xhr = function (url, callback, arg, method, obj, cache, async) {
    if (method == null) {method = 'GET';}
    if (obj == null) {obj = '';}
    if (cache == null) {cache = cog.cacheRender;}
    if (async == null) {async = true;}
    var xhr, guid, cacheUrl, hashUrl;
    method = method.toUpperCase();
    xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState == XMLHttpRequest.DONE) {
            callback(xhr, arg);
        }
    };
    if (!cache) {
        guid = Date.now();
        cacheUrl = url.replace(/#.*$/, "");
        hashUrl = url.slice(cacheUrl.length);
        cacheUrl = cacheUrl.replace(/([?&])_=[^&]*/, "$1");
        hashUrl = ((/\?/).test(cacheUrl) ? "&" : "?") + "_=" + (guid++) + hashUrl;
        url = cacheUrl + hashUrl;
    }
    if (method == 'GET' && obj != '') {
        url = url.split(/[?#]/)[0]+'?'+cog.urlEncode(cog.mergeDeep(cog.getUrlParams(url), obj));
    }
    xhr.open(method, url, async);
    if (method == 'GET') {
        xhr.send();
    } else {
        xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhr.send(cog.urlEncode(obj));
    }
};
cog.DOMLoad = function () {
    document.dispatchEvent(new CustomEvent('DOMContentLoaded'));
    window.dispatchEvent(new CustomEvent('DOMContentLoaded'));
    window.dispatchEvent(new CustomEvent('load'));
};
cog.DOMEval = function (code) {
    var script;
    script = document.createElement("script");
    script.text = code;
    document.head.appendChild(script).parentNode.removeChild(script);
};
cog.getScript = function (url, callback) {
    cog.xhr(url, function (xhr) {
        if (xhr.readyState == 4) {
            if (xhr.status == 200) {
                cog.DOMEval(xhr.responseText);
            }
            if (typeof callback !== 'undefined') {
                setTimeout(function () {
                    callback(xhr);
                }, 0);
            }
        }
    });
};
cog.init();