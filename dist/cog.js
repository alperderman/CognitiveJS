//CognitiveJS

if (typeof window.CustomEvent !== 'function') { window.CustomEvent = function (event, params) { params = params || {bubbles: false, cancelable: false, detail: null}; var evt = document.createEvent('CustomEvent'); evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail); return evt; }; }

var cog = {};
cog.data = {};
cog.templates = {};
cog.bindTypes = {};
cog.bound = {};
cog.encapVar = null;
cog.isReady = true;
cog.cache = true;
cog.delimiter = "%";
cog.label = {
    set: "data-set",
    bind: "data-bind",
    prop: "data-prop",
    head: "head",
    skip: "skip",
    source: "data-src",
    sourceObject: "data-object",
    sourceMethod: "data-method",
    sourceCache: "data-cache",
    sourceAwait: "await"
};
cog.event = {
    beforeData: "COGBeforeData",
    afterData: "COGAfterData",
    beforeRender: "COGBeforeRender",
    afterRender: "COGAfterRender"
};
cog.keyword = {
    parent: "_parent",
    key: "_key",
    index: "_index",
    row: "_row",
    count: "_count",
    token: "_token",
    prevent: "_prevent",
    auto: "_auto"
};
cog.regex = {
    head: new RegExp("<head[^>]*>((.|[\\\n\\\r])*)<\\\/head>", "im"),
    body: new RegExp("<body[^>]*>((.|[\\\n\\\r])*)<\\\/body>", "im"),
    normalize: new RegExp("(?:\\\[\\\'|\\\[\\\"|\\\[)(\\\w+)(?:\\\'\\\]|\\\"\\\]|\\\])", "g"),
    normalizeCheck: new RegExp("[^a-zA-Z0-9\\\_\\\-\\\.]", "g")
};

cog.get = function (key, arg) {
    if (key == null) {return;}
    if (arg == null) {arg = {};}
    if (arg.action == null) {arg.action = "get";}
    if (arg.reference == null) {arg.reference = false;}
    if (arg.execute == null) {arg.execute = false;}
    var result, old, changedElems = [], alter = false;
    if (typeof arg.replace === 'function') {
        alter = true;
    }
    if (arg.action == "get") {
        result = cog.getRecursiveValue({str:key, ref:arg.reference, exec:arg.execute});
    }
    if (arg.action == "set" || alter) {
        if (old !== arg.set || alter) {
            if (alter) {
                result = arg.replace({act:arg.action, str:key, val:arg.set, ref:arg.reference, exec:arg.execute});
            } else {
                result = cog.getRecursiveValue({act:arg.action, str:key, val:arg.set, ref:arg.reference, exec:arg.execute});
            }
            changedElems = cog.rebind(key);
            document.dispatchEvent(new CustomEvent(cog.event.afterData, {detail:{elems:changedElems, key:key, old:old, new:result}}));
        } else {
            result = old;
        }
    }
    if (typeof arg.callback === 'function') {
        arg.callback({elems:changedElems, key:key, old:old, new:result});
    }
    return result;
};
cog.set = function (key, set, arg) {
    if (arg == null) {arg = {};}
    if (arg.alter == null) {arg.alter = false;}
    if (arg.setElems == null) {arg.setElems = false;}
    if (arg.setElems) {
        cog.loadContents(function () {
            var setElem, setAttr, setType, setKey, bindType, i, links = document.getElementsByTagName("link"), link, heads = document.querySelectorAll("["+cog.label.head+"]"), head;
            while (setElem = document.querySelector("["+cog.label.set+"]:not(["+cog.label.skip+"])")) {
                setAttr = setElem.getAttribute(cog.label.set);
                setType = cog.parseSet(setAttr)[0];
                setKey = cog.parseSet(setAttr)[1].trim();
                for (bindType in cog.bindTypes) {
                    if (cog.bindTypes[bindType].set != null && setType == bindType) {
                        cog.bindTypes[bindType].set(setElem, setKey);
                    }
                }
                setElem.parentNode.removeChild(setElem);
            }
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
            if (typeof arg.callback === 'function') {
                arg.callback();
            }
        });
    } else if (arg.alter && typeof set === 'function') {
        cog.get(key, {
            action: "set",
            set: set,
            callback: arg.callback,
            replace: function (argReplace) {
                var result = cog.getRecursiveValue({str:argReplace.str, exec:false});
                var replace = set(result);
                if (replace !== result) {
                    argReplace.val = replace;
                    result = cog.getRecursiveValue(argReplace);
                }
                return result;
            }
        });
    } else {
        cog.get(key, {
            action: "set",
            set: set,
            callback: arg.callback
        });
    }
};
cog.alter = function (key, set, arg) {
    if (arg == null) {arg = {};}
    arg.alter = true;
    cog.set(key, set, arg);
};
cog.rebind = function (key, changed, i, query) {
    if (i == null) {i = 0;}
    if (query == null) {query = ""}
    if (changed == null) {changed = [];}
    var elems, elem;
    if (query == "") {
        query = cog.getBoundElements(key, true);
        query += ",["+cog.label.bind+"='"+cog.keyword.auto+"']:not(["+cog.label.skip+"])";
    }
    elems = document.querySelectorAll(query);
    if (i < elems.length) {
        elem = elems[i];
        changed.push(elem);
        cog.bind(elem);
        i++;
        cog.rebind(key, changed, i, query);
    } else {
        rebound();
        return changed;
    }
    function rebound() {
        var i, ii, rebindKey, boundKeys, boundKey;
        for (i = 0;i < Object.keys(cog.bound).length;i++) {
            rebindKey = Object.keys(cog.bound)[i];
            boundKeys = cog.bound[rebindKey];
            if (typeof boundKeys === 'string') {
                boundKey = boundKeys;
                if (cog.normalizeKeys(key) != cog.normalizeKeys(rebindKey) && cog.checkKeys(key, boundKey)) {
                    changed = changed.concat(cog.rebind(rebindKey));
                }
            } else if (Array.isArray(boundKeys)) {
                for (ii = 0;ii < boundKeys.length;ii++) {
                    boundKey = boundKeys[ii];
                    if (cog.normalizeKeys(key) != cog.normalizeKeys(rebindKey) && cog.checkKeys(key, boundKey)) {
                        changed = changed.concat(cog.rebind(rebindKey));
                        break;
                    }
                }
            }
        }
    }
};
cog.getBoundElements = function (tokens, returnQuery) {
    if (tokens == null) {return;}
    if (returnQuery == null) {returnQuery = false;}
    if (!Array.isArray(tokens)) {
        tokens = [tokens];
    }
    var queryArr = [], query = "", combined;
    tokens.forEach(function (keys) {
        keys = cog.normalizeKeys(keys).split(".");
        combined = "";
        keys.forEach(function (key, i) {
            if (i == 0) {
                combined += key;
            } else {
                combined += "."+key;
            }
            queryArr.push("["+cog.label.bind+"*='["+combined+"]']:not(["+cog.label.skip+"])");
        });
    });
    queryArr = cog.removeDuplicatesFromArray(queryArr);
    query = queryArr.join(",");
    if (returnQuery) {
        return query;
    } else {
        return document.querySelectorAll(query);
    }
};
cog.getBoundElement = function (tokens) {
    return document.querySelector(cog.getBoundElements(tokens, true));
};
cog.getElementBind = function (elem) {
    var elemBinds = elem.getAttribute(cog.label.bind), binds;
    if (elemBinds != null) {
        binds = [];
        cog.parseBind(elemBinds).forEach(function (bind) {
            binds.push(bind.trim());
        });
    }
    return binds;
};
cog.getElementProp = function (elem) {
    var elemProps = elem.getAttribute(cog.label.prop), props;
    if (elemProps != null) {
        props = cog.parseProp(elemProps);
    }
    return props;
};
cog.getElementAllEvents = function (elem) {
    var elemLives = [], elemEvents = [], elemProps = cog.getElementProp(elem);
    if (elemProps != null) {
        elemProps.forEach(function (prop) {
            if (cog.bindTypes["live"].if(prop) && prop.current != null) {
                elemLives.push(prop.current);
            }
            if (cog.bindTypes["event"].if(prop) && prop.current != null) {
                elemEvents.push(prop.current);
            }
        });
    }
    return elemLives.concat(elemEvents);
};
cog.getRecursiveValue = function (arg) {
    if (arg == null) {arg = {};}
    if (arg.act == null) {
        if (typeof arg.val !== 'undefined') {
            arg.act = "set";
        } else {
            arg.act = "get";
        }
    }
    if (arg.root == null) {arg.root = cog.data;}
    if (arg.ref == null) {arg.ref = true;}
    if (arg.exec == null) {arg.exec = true;}
    var refData = arg.root, result, i, key;
    if (typeof arg.str === 'string') {
        strSplit = cog.normalizeKeys(arg.str).split(".");
    } else {
        strSplit = arg.str;
    }
    for (i = 0;i < strSplit.length;i++) {
        key = strSplit[i];
        if ((typeof refData === 'object' || typeof refData === 'string') && refData[key] != null && i != strSplit.length-1 && i != arg.index) {
            refData = refData[key];
            if (typeof refData === 'function') {
                refData = refData();
            }
        } else {
            if (key == cog.keyword.parent) {
                strSplit.splice(i,1);
                strSplit.splice(i-1,1);
                i = i-2;
                arg.index = i;
                arg.str = strSplit;
                refData = cog.getRecursiveValue(arg);
                result = refData;
            } else if (key == cog.keyword.key) {
                result = strSplit[i-1];
            } else if (key == cog.keyword.token) {
                strSplit.splice(i,1);
                result = cog.normalizeKeys(strSplit);
            } else if (key == cog.keyword.count) {
                if (typeof refData === 'object' && !Array.isArray(refData)) {
                    result = Object.keys(refData).length;
                } else {
                    result = refData.length;
                }
            } else {
                if (arg.act === "set" && refData[key] !== arg.val) {
                    document.dispatchEvent(new CustomEvent(cog.event.beforeData, {detail:{key:arg.str, old:refData[key], new:arg.val}}));
                    refData[key] = arg.val;
                }
                result = refData[key];
                break;
            }
        }
    }
    if (typeof result === 'function' && arg.exec) {
        result = result();
    }
    if (typeof result === 'object' && !arg.ref) {
        result = JSON.parse(JSON.stringify(result));
    }
    return result;
};
cog.normalizeKeys = function (val) {
    var result;
    if (typeof val === 'string') {
        result = val.replace(cog.regex.normalize, function (m1, m2) {return "."+m2;});
        result = result.replace(/^\./, '');
    }
    if (Array.isArray(val)) {
        result = "";
        val.forEach(function (key, i) {
            if (i == 0) {
                result += key;
            } else {
                result += "."+key;
            }
        });
    }
    return result;
};
cog.checkKeys = function (key1, key2) {
    var result = false, i, keys1, keys2, keysLong, keyShort, keyLong = "";
    key1 = cog.normalizeKeys(key1);
    key2 = cog.normalizeKeys(key2);
    if (key1 == key2) {return true;}
    keys1 = key1.split(".");
    keys2 = key2.split(".");
    if (keys1.length == keys2.length) {return false;}
    if (keys1.length > keys2.length) {
        keysLong = keys1;
        keyShort = key2;
    } else {
        keysLong = keys2;
        keyShort = key1;
    }
    for (i = 0;i < keysLong.length;i++) {
        if (i == 0) {
            keyLong += keysLong[i];
        } else {
            keyLong += "."+keysLong[i];
        }
        if (keyLong == keyShort) {
            result = true;
            break;
        }
    }
    return result;
};
cog.parseSet = function (str) {
    return str.split(":");
};
cog.parseBind = function (str) {
    return str.split(",");
};
cog.parseProp = function (str) {
    var result = cog.isJSON(cog.decodeHTML(str));
    if (!result) {
        if (str.trim().indexOf("{") === 0) {
            result = cog.eval("(["+str+"])");
        } else {
            result = cog.eval("([{"+str+"}])");
        }
    }
    return result;
};
cog.parseToken = function (str, replace) {
    var delimiters = [], tokens = [], text, i, tokenReplace;
    for (i = 0;i < str.length;i++) {
        if (str[i] === cog.delimiter) {
            if (delimiters.length != 0) {
                text = str.slice(delimiters[delimiters.length-1], i+1);
                if (cog.purifyToken(text) != "") {
                    if (typeof replace !== 'undefined') {
                        tokenReplace = replace(text);
                    } else {
                        tokenReplace = text;
                    }
                    if (tokenReplace != null) {
                        tokens.push(tokenReplace);
                    }
                }
            }
            delimiters.push(i);
        }
    }
    return tokens;
};
cog.serialize = function (obj) {
    return cog.encodeHTML(JSON.stringify(obj));
};
cog.newBind = function (arg) {
    if (cog.bindTypes[arg.name] == null) {
        cog.bindTypes[arg.name] = {};
    }
    if (arg.if != null) {
        cog.bindTypes[arg.name].if = arg.if;
    }
    if (arg.bind != null) {
        cog.bindTypes[arg.name].bind = arg.bind;
    }
    if (arg.set != null) {
        cog.bindTypes[arg.name].set = arg.set;
    }
};
cog.bind = function (node, arg) {
    var nodeProp, nodePropData, nodeAttr;
    if (arg == null) {arg = {};}
    if (arg.keep == null) {arg.keep = false;}
    if (typeof node === 'string') {
        cog.get(node, arg);
        return function (arg) {
            return cog.get(node, arg);
        };
    } else {
        if (typeof arg.prop !== 'undefined') {
            if (!arg.keep) {
                remove_current();
            }
            if (arg.prop == "" || Object.keys(arg.prop).length == 0) {
                node.removeAttribute(cog.label.prop);
                nodePropData = null;
            } else {
                nodePropData = arg.prop;
            }
            if (typeof arg.prop === 'string' && arg.prop != "") {
                node.setAttribute(cog.label.prop, arg.prop);
            }
            if (typeof arg.prop !== 'string' && Object.keys(arg.prop).length != 0) {
                node.setAttribute(cog.label.prop, cog.serialize(arg.prop));
            }
        } else {
            nodePropData = node.getAttribute(cog.label.prop);
        }
        if (typeof nodePropData === 'string' && nodePropData != null) {
            nodeProp = cog.parseProp(nodePropData);
        } else {
            nodeProp = nodePropData;
        }
        if (typeof arg.bind !== 'undefined') {
            if (typeof arg.bind === 'string') {
                if (arg.bind != "") {
                    node.setAttribute(cog.label.bind, arg.bind);
                } else {
                    node.removeAttribute(cog.label.bind);
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
                    node.setAttribute(cog.label.bind, nodeAttr);
                } else {
                    node.removeAttribute(cog.label.bind);
                }
            }
        }
        if (nodeProp != null) {
            nodeProp.forEach(function (prop, i) {
                bind_prop(node, prop, nodeProp, i);
            });
        }
        if (typeof arg.callback === 'function') {
            arg.callback();
        }
    }
    function bind_prop(node, prop, props, propIndex) {
        var bindType;
        for (bindType in cog.bindTypes) {
            if (cog.bindTypes[bindType].if != null && cog.bindTypes[bindType].bind != null) {
                if (cog.bindTypes[bindType].if(prop)) {
                    cog.bindTypes[bindType].bind(node, prop, props, propIndex);
                }
            }
        }
    }
    function remove_current() {
        var props = cog.getElementProp(node), prop = props;
        node.innerHTML = "";
        if (props != null) {
            props.forEach(function (prop, i) {
                if (prop.current != null) {
                    if (prop.class != null) {
                        prop.current.split(" ").forEach(function (str) {
                            if (str != "") {
                                node.classList.remove(str);
                            }
                        });
                    }
                    if (prop.context != null) {
                        Object.keys(prop.current).forEach(function (key) {
                            if (prop.current[key] == node[key]) {
                                node[key] = "";
                            }
                        });
                    }
                    if (prop.attr != null) {
                        Object.keys(prop.current).forEach(function (key) {
                            node.removeAttribute(key);
                        });
                    }
                    if (prop.style != null) {
                        Object.keys(prop.current).forEach(function (key) {
                            if (prop.current[key] == node.style[key]) {
                                node.style[key] = "";
                            }
                        });
                    }
                    delete props[i].current;
                }
                if (cog.bindTypes["if"].if(prop)) {
                    node.style.display = "";
                }
            });
            node.setAttribute(cog.label.prop, cog.serialize(prop));
        }
    }
};
cog.bindAll = function (arg) {
    if (arg == null) {arg = {};}
    if (arg.elem == null) {arg.elem = document;}
    if (arg.i == null) {arg.i = 0;}
    if (arg.set == null) {arg.set = true;}
    if (arg.set) {
        cog.set(null, null, {
            setElems: true,
            callback: function () {
                bind();
            }
        });
    } else {
        bind();
    }
    function bind() {
        var elems = arg.elem.querySelectorAll("["+cog.label.prop+"]:not(["+cog.label.skip+"])");
        if (arg.i < elems.length) {
            cog.bind(elems[arg.i]);
            arg.i++;
            cog.bindAll(arg);
        } else {
            if (typeof arg.callback === 'function') {
                arg.callback();
            }
        }
    }
};
cog.replaceToken = function (node, replace, recursive) {
    var attrBind, attrProp, child, childs, i;
    if (recursive == null) {recursive = true;}
    if (typeof node === 'string') {
        return replace_string(node);
    } else if (cog.isElement(node)) {
        childs = node.querySelectorAll("["+cog.label.bind+"], ["+cog.label.prop+"]");
        for (i = 0;i < childs.length;i++) {
            child = childs[i];
            if (child.getAttribute(cog.label.bind) != null) {
                attrBind = replace_string(child.getAttribute(cog.label.bind));
                child.setAttribute(cog.label.bind, attrBind);
            }
            if (child.getAttribute(cog.label.prop) != null) {
                attrProp = replace_string(child.getAttribute(cog.label.prop));
                child.setAttribute(cog.label.prop, attrProp);
            }
        }
    } else {
        return node;
    }
    function replace_string(str) {
        var tokens, result = str;
        tokens = cog.removeDuplicatesFromArray(cog.parseToken(result));
        tokens.forEach(function (token) {
            var tokenPure, tokenData;
            tokenPure = cog.purifyToken(token);
            tokenData = replace(tokenPure);
            if (tokenData != null) {
                result = cog.replaceAll(result, token, function () {return tokenData;}, 'gim');
            }
        });
        if (str != result && recursive) {
            result = replace_string(result);
        }
        return result;
    }
};
cog.purifyToken = function (token) {
    return cog.replaceAll(token.substring(cog.delimiter.length, token.length-cog.delimiter.length).trim(), "\\", "");
};
cog.template = function (arg) {
    var template, createEl, parent, alias;
    if (arg.id == null) {return;}
    if (arg.bind == null) {arg.bind = true;}
    if (arg.fragment == null) {arg.fragment = false;}
    if (cog.templates[arg.id] == null && arg.elem != null) {
        if (typeof arg.elem === 'string') {
            createEl = document.createElement("div");
            createEl.innerHTML = arg.elem;
            cog.templates[arg.id] = createEl.cloneNode(true);
        } else {
            cog.templates[arg.id] = arg.elem.cloneNode(true);
        }
    }
    if (cog.templates[arg.id] != null) {
        template = cog.templates[arg.id].cloneNode(true);
    }
    if ((arg.data != null && template != null) || typeof arg.replace === 'function') {
        if (typeof arg.replace === 'function') {
            cog.replaceToken(template, arg.replace);
        } else {
            parent = cog.normalizeKeys(cog.purifyToken(arg.data.split(" ")[0]));
            alias = arg.data.split(" ")[2];
            cog.replaceToken(template, function (pure) {
                var result = null, pureSplit;
                pure = cog.normalizeKeys(pure);
                pureSplit = pure.split(".");
                if (pureSplit[0] == alias) {
                    pureSplit.splice(0, 1);
                    pureSplit.splice(0, 0, parent);
                    result = cog.normalizeKeys(pureSplit);
                }
                return result;
            });
        }
    }
    if (arg.bind && cog.isReady) {
        cog.bindAll({set:false, elem:template});
    }
    if (arg.fragment) {
        template = cog.elemFragment(template);
    }
    return template;
};
cog.elemFragment = function (elem) {
    var fragment = document.createDocumentFragment();
    while (elem.firstChild) {
        fragment.appendChild(elem.firstChild);
    }
    return fragment;
};
cog.encapIf = function () {
    if (cog.encapVar != null && cog.encapEval()) {
        return true;
    } else {
        return false;
    }
};
cog.encapEval = function () {
    try {return eval(cog.encapVar);} catch (e) {}
};
cog.if = function (str) {
    if (typeof str === 'string') {
        cog.encapVar = cog.replaceToken(str, function (pure) {
            pure = cog.normalizeKeys(pure);
            if (!(cog.regex.normalizeCheck.test(pure))) {
                return "cog.getRecursiveValue({str:'"+pure+"'})";
            } else {
                return undefined;
            }
        });
        return cog.encapIf();
    } else {
        return str;
    }
};
cog.eval = function (str) {
    cog.encapVar = str;
    return cog.encapEval();
};
cog.eventListener = function (event) {
    cog.eventHandler(event);
};
cog.eventHandler = function (event, elem) {
    if (!elem) {elem = event.target;}
    if (typeof elem.getAttribute !== 'function') {return;}
    var elemAllEvents = cog.getElementAllEvents(elem), prevent = false;
    if (elemAllEvents.length > 0) {
        elemAllEvents.forEach(function (current) {
            Object.keys(current).forEach(function (key) {
                if (key == event.type) {
                    cog.eval(current[key]);
                }
                if (key == cog.keyword.prevent && cog.if(current[key])) {
                    prevent = true;
                }
            });
        });
    }
    if (!prevent && elem.parentNode) {
        cog.eventHandler(event, elem.parentNode);
    }
};
cog.addEventListenerAll = function (target, listener, capture) {
    if (capture == null) {capture = false;}
    for (var key in target) {
        if (/^on/.test(key)) {
            target.addEventListener(key.substr(2), listener, capture);
        }
    }
};
cog.init = function () {
    cog.addEventListenerAll(document.documentElement, cog.eventListener);
    cog.newBind({
        name: "json",
        set: function (elem, key) {
            var propData = cog.isJSON(elem.innerText);
            if (propData) {
                cog.getRecursiveValue({act:"set", str:key, val:propData});
            }
        }
    });
    cog.newBind({
        name: "raw",
        set: function (elem, key) {
            var propData = cog.eval("("+elem.innerText+")");
            cog.getRecursiveValue({act:"set", str:key, val:propData, exec:false});
        }
    });
    cog.newBind({
        name: "debug",
        if: function (prop) {
            return prop.debug != null ? true : false;
        },
        bind: function (elem, prop, props, propIndex) {
            var propData;
            propData = cog.replaceToken(prop.debug, function (pure) {
                return cog.getRecursiveValue({str:pure});
            });
            console.log(propData);
        }
    });
    cog.newBind({
        name: "text",
        if: function (prop) {
            return prop.text != null && (prop.if == null || cog.if(prop.if)) ? true : false;
        },
        bind: function (elem, prop, props, propIndex) {
            var propData;
            propData = cog.replaceToken(prop.text, function (pure) {
                return cog.getRecursiveValue({str:pure});
            });
            if (propData != null) {
                elem.innerText = propData;
            }
        },
        set: function (elem, key) {
            cog.getRecursiveValue({act:"set", str:key, val:elem.innerText});
        }
    });
    cog.newBind({
        name: "html",
        if: function (prop) {
            return prop.html != null && (prop.if == null || cog.if(prop.if)) ? true : false;
        },
        bind: function (elem, prop, props, propIndex) {
            var propData;
            if (prop.recursive == null) {prop.recursive = false;}
            propData = cog.replaceToken(prop.html, function (pure) {
                return cog.getRecursiveValue({str:pure});
            }, cog.if(prop.recursive));
            if (propData != null) {
                elem.innerHTML = propData;
            }
        },
        set: function (elem, key) {
            cog.getRecursiveValue({act:"set", str:key, val:elem.innerHTML});
        }
    });
    cog.newBind({
        name: "context",
        if: function (prop) {
            return prop.context != null ? true : false;
        },
        bind: function (elem, prop, props, propIndex) {
            var propData, propContext, propCurrent = {};
            if (prop.current != null) {
                Object.keys(prop.current).forEach(function (key) {
                    if (prop.current[key] == elem[key]) {
                        elem[key] = "";
                    }
                });
                delete props[propIndex].current;
                elem.setAttribute(cog.label.prop, cog.serialize(props));
            }
            if (prop.if == null || cog.if(prop.if)) {
                Object.keys(prop.context).forEach(function (key) {
                    propContext = cog.replaceToken(key, function (pure) {
                        return cog.getRecursiveValue({str:pure});
                    });
                    propData = cog.replaceToken(prop.context[key], function (pure) {
                        pure = cog.normalizeKeys(pure);
                        if (!(cog.regex.normalizeCheck.test(pure))) {
                            return "cog.getRecursiveValue({str:'"+pure+"'})";
                        } else {
                            return undefined;
                        }
                    });
                    if (propContext != null) {
                        elem[propContext] = cog.eval(propData);
                        propCurrent[propContext] = propData;
                    }
                });
                if (propCurrent != null) {
                    props[propIndex].current = propCurrent;
                    elem.setAttribute(cog.label.prop, cog.serialize(props));
                }
            }
        }
    });
    cog.newBind({
        name: "if",
        if: function (prop) {
            return prop.if != null && Object.keys(prop).length == 1 ? true : false;
        },
        bind: function (elem, prop, props, propIndex) {
            if (!cog.if(prop.if)) {
                elem.style.display = "none";
            } else {
                elem.style.display = "";
            }
        }
    });
    cog.newBind({
        name: "class",
        if: function (prop) {
            return prop.class != null ? true : false;
        },
        bind: function (elem, prop, props, propIndex) {
            var propData, propCurrent;
            if (prop.current != null) {
                prop.current.split(" ").forEach(function (str) {
                    if (str != "") {
                        elem.classList.remove(str);
                    }
                });
                delete props[propIndex].current;
                elem.setAttribute(cog.label.prop, cog.serialize(props));
            }
            if (prop.if == null || cog.if(prop.if)) {
                propData = cog.replaceToken(prop.class.trim(), function (pure) {
                    return cog.getRecursiveValue({str:pure});
                });
                if (propData != null) {
                    propData.split(" ").forEach(function (str) {
                        if (str != "") {
                            elem.classList.add(str);
                        }
                    });
                    propCurrent = propData;
                }
                if (propCurrent != null) {
                    props[propIndex].current = propCurrent;
                    elem.setAttribute(cog.label.prop, cog.serialize(props));
                }
            }
        }
    });
    cog.newBind({
        name: "attr",
        if: function (prop) {
            return prop.attr != null ? true : false;
        },
        bind: function (elem, prop, props, propIndex) {
            var propData, propAttr, propCurrent = {};
            if (prop.current != null) {
                Object.keys(prop.current).forEach(function (key) {
                    elem.removeAttribute(key);
                });
                delete props[propIndex].current;
                elem.setAttribute(cog.label.prop, cog.serialize(props));
            }
            if (prop.if == null || cog.if(prop.if)) {
                Object.keys(prop.attr).forEach(function (key) {
                    propAttr = cog.replaceToken(key, function (pure) {
                        return cog.getRecursiveValue({str:pure});
                    });
                    propData = cog.replaceToken(prop.attr[key], function (pure) {
                        return cog.getRecursiveValue({str:pure});
                    });
                    if (propAttr != null && propData != null) {
                        elem.setAttribute(propAttr, propData);
                        propCurrent[propAttr] = propData;
                    }
                });
                if (propCurrent != null) {
                    props[propIndex].current = propCurrent;
                    elem.setAttribute(cog.label.prop, cog.serialize(props));
                }
            }
        }
    });
    cog.newBind({
        name: "event",
        if: function (prop) {
            return prop.event != null && prop.live == null ? true : false;
        },
        bind: function (elem, prop, props, propIndex) {
            var propData, propEvent, propCurrent = {};
            if (prop.current != null) {
                delete props[propIndex].current;
                elem.setAttribute(cog.label.prop, cog.serialize(props));
            }
            if (prop.if == null || cog.if(prop.if)) {
                Object.keys(prop.event).forEach(function (key) {
                    propEvent = cog.replaceToken(key, function (pure) {
                        return cog.getRecursiveValue({str:pure});
                    });
                    propData = cog.replaceToken(prop.event[key], function (pure) {
                        pure = cog.normalizeKeys(pure);
                        if (!(cog.regex.normalizeCheck.test(pure))) {
                            return "cog.getRecursiveValue({str:'"+pure+"'})";
                        } else {
                            return undefined;
                        }
                    });
                    if (propEvent != null && propData != null) {
                        propCurrent[propEvent] = propData;
                    }
                });
                if (typeof prop[cog.keyword.prevent] !== 'undefined') {
                    propCurrent[cog.keyword.prevent] = prop[cog.keyword.prevent];
                }
                if (propCurrent != null) {
                    props[propIndex].current = propCurrent;
                    elem.setAttribute(cog.label.prop, cog.serialize(props));
                }
            }
        }
    });
    cog.newBind({
        name: "live",
        if: function (prop) {
            return prop.live != null ? true : false;
        },
        bind: function (elem, prop, props, propIndex) {
            var propData, propEvent, propToken, propCurrent = {};
            if (prop.current != null) {
                delete props[propIndex].current;
                elem.setAttribute(cog.label.prop, cog.serialize(props));
            }
            if (prop.if == null || cog.if(prop.if)) {
                propEvent = "change";
                propData = "event.target.value";
                propToken = cog.replaceToken(prop.live, function (pure) {
                    return cog.getRecursiveValue({str:pure});
                });
                if (prop.event != null) {
                    propEvent = cog.replaceToken(prop.event, function (pure) {
                        return cog.getRecursiveValue({str:pure});
                    });
                }
                if (prop.data != null) {
                    propData = cog.replaceToken(prop.data, function (pure) {
                        return cog.getRecursiveValue({str:pure});
                    });
                }
                propToken = cog.normalizeKeys(propToken);
                if (propToken != null) {
                    propCurrent[propEvent] = "cog.alter('"+propToken+"', "+propData+")";
                    if (typeof prop[cog.keyword.prevent] !== 'undefined') {
                        propCurrent[cog.keyword.prevent] = prop[cog.keyword.prevent];
                    }
                }
                if (propCurrent != null) {
                    props[propIndex].current = propCurrent;
                    elem.setAttribute(cog.label.prop, cog.serialize(props));
                }
            }
        }
    });
    cog.newBind({
        name: "style",
        if: function (prop) {
            return prop.style != null ? true : false;
        },
        bind: function (elem, prop, props, propIndex) {
            var propData, propStyle, propCurrent = {};
            if (prop.current != null) {
                Object.keys(prop.current).forEach(function (key) {
                    if (prop.current[key] == elem.style[key]) {
                        elem.style[key] = "";
                    }
                });
                delete props[propIndex].current;
                elem.setAttribute(cog.label.prop, cog.serialize(props));
            }
            if (prop.if == null || cog.if(prop.if)) {
                Object.keys(prop.style).forEach(function (key) {
                    propStyle = cog.replaceToken(key, function (pure) {
                        return cog.getRecursiveValue({str:pure});
                    });
                    propData = cog.replaceToken(prop.style[key], function (pure) {
                        return cog.getRecursiveValue({str:pure});
                    });
                    if (propStyle != null && propData != null) {
                        elem.style[propStyle] = propData;
                        propCurrent[propStyle] = propData;
                    }
                });
                if (propCurrent != null) {
                    props[propIndex].current = propCurrent;
                    elem.setAttribute(cog.label.prop, cog.serialize(props));
                }
            }
        }
    });
    cog.newBind({
        name: "temp",
        if: function (prop) {
            return prop.temp != null && prop.repeat == null && (prop.if == null || cog.if(prop.if)) ? true : false;
        },
        bind: function (elem, prop, props, propIndex) {
            var template;
            if (prop.data != null) {
                template = cog.template({id:prop.temp, elem:elem, data:prop.data, bind:false});
            } else {
                template = cog.template({id:prop.temp, elem:elem, bind:false});
            }
            if (template != null) {
                elem.innerHTML = template.innerHTML;
            }
        },
        set: function (elem, key) {
            cog.template({id:key, elem:elem, bind:false});
        }
    });
    cog.newBind({
        name: "repeat",
        if: function (prop) {
            return prop.repeat != null && (prop.if == null || cog.if(prop.if)) ? true : false;
        },
        bind: function (elem, prop, props, propIndex) {
            var propData, propPage, propLimit, propOffset, propOrder, propDatasIterate, template, repeatVal, i, index, row, key, parent = cog.normalizeKeys(cog.purifyToken(prop.repeat.split(" ")[0])), alias = prop.repeat.split(" ")[2];
            propData = cog.getRecursiveValue({str:parent});
            cog.template({id:prop.temp, elem:elem, bind:false});
            if (typeof propData === 'object' && !Array.isArray(propData)) {
                propDatasIterate = Object.keys(propData);
            } else {
                propDatasIterate = propData;
            }
            propPage = cog.replaceToken(prop.page, function (pure) {
                return cog.getRecursiveValue({str:pure});
            });
            propLimit = cog.replaceToken(prop.limit, function (pure) {
                return cog.getRecursiveValue({str:pure});
            });
            propOffset = cog.replaceToken(prop.offset, function (pure) {
                return cog.getRecursiveValue({str:pure});
            });
            propOrder = cog.replaceToken(prop.order, function (pure) {
                return cog.getRecursiveValue({str:pure});
            });
            if (typeof propPage === 'string') {
                propPage = parseInt(propPage);
            }
            if (typeof propLimit === 'string') {
                propLimit = parseInt(propLimit);
            }
            if (typeof propOffset === 'string') {
                propOffset = parseInt(propOffset);
            }
            if (typeof propOrder === 'string') {
                propOrder = propOrder.trim().toLowerCase();
            }
            if (propPage == null || propPage < 1) {
                propPage = 1;
            }
            if (propLimit != null) {
                if (propOffset == null) {
                    propOffset = propLimit*(propPage-1);
                }
                if (propOffset >= propDatasIterate.length) {
                    if (propDatasIterate.length % propLimit == 0) {
                        propPage = propDatasIterate.length/propLimit;
                    } else {
                        propPage = (propDatasIterate.length/propLimit)+1;
                    }
                    propOffset = propLimit*(propPage-1);
                }
                if (propOffset < 0) {
                    propOffset = propDatasIterate.length+propOffset;
                }
            }
            repeatVal = "";
            if (propData != null) {
                row = 1;
                for (i = 0;i < propDatasIterate.length;i++) {
                    if (propLimit == null || (row <= propLimit && i >= propOffset)) {
                        if (propOrder == "desc") {
                            index = (propDatasIterate.length-1)-i;
                        } else {
                            index = i;
                        }
                        if (typeof propData === 'object' && !Array.isArray(propData)) {
                            key = Object.keys(propData)[index];
                        } else {
                            key = index;
                        }
                        template = cog.template({
                            id: prop.temp,
                            bind: true,
                            replace: function (pure) {
                                var result = null, pureSplit;
                                pure = cog.normalizeKeys(pure);
                                pureSplit = pure.split(".");
                                if (pureSplit[0] == alias && pureSplit[1] != cog.keyword.index && pureSplit[1] != cog.keyword.row) {
                                    pureSplit.splice(0, 1);
                                    pureSplit.splice(0, 0, parent, key);
                                    result = cog.normalizeKeys(pureSplit);
                                }
                                if (pure == alias+'.'+cog.keyword.index) {
                                    result = index;
                                }
                                if (pure == alias+'.'+cog.keyword.row) {
                                    result = row;
                                }
                                return result;
                            }
                        });
                        repeatVal += template.innerHTML;
                        row++;
                    }
                }
            }
            elem.innerHTML = repeatVal;
        }
    });
};
cog.render = function (layoutSrc) {
    var layout;
    step_start();
    function step_start() {
        cog.isReady = false;
        cog.xhr(layoutSrc, function (xhr) {
            if (xhr.status == 200) {
                layout = xhr.responseText;
                step_design();
            }
        }, {method:"GET"});
    }
    function step_design() {
        while (document.getElementsByTagName('script').length > 0) {
            document.getElementsByTagName('script')[0].parentNode.removeChild(document.getElementsByTagName('script')[0]);
        }
        if ((/\<\/head\>/).test(layout)) {
            document.head.innerHTML += layout.match(cog.regex.head)[1];
        }
        if ((/\<\/body\>/).test(layout)) {
            document.documentElement.innerHTML = document.documentElement.innerHTML.replace("<body", "<body"+layout.match("<body" + "(.*)" + ">")[1]);
            document.body.innerHTML += layout.match(cog.regex.body)[1];
        }
        if (!(/\<\/head\>/).test(layout) && !(/\<\/body\>/).test(layout)) {
            document.body.innerHTML += layout;
        }
        setTimeout(function () {
            cog.set(null, null, {
                setElems: true,
                callback: function () {
                    step_bind();
                }
            });
        }, 0);
    }
    function step_bind() {
        document.dispatchEvent(new CustomEvent(cog.event.beforeRender));
        setTimeout(function () {
            cog.bindAll({
                set: false,
                callback: function () {
                    cog.isReady = true;
                    step_scripts();
                }
            });
        }, 0);
    }
    function step_scripts() {
        cog.loadScriptsNS(document.querySelectorAll("script:not(["+cog.label.skip+"])"), function () {
            step_finish();
        });
    }
    function step_finish() {
        cog.DOMLoad();
        if (window.location.hash.slice(1) && document.getElementById(window.location.hash.slice(1))) {
            document.getElementById(window.location.hash.slice(1)).scrollIntoView();
        }
        setTimeout(function () {
            document.dispatchEvent(new CustomEvent(cog.event.afterRender));
        }, 0);
    }
};
cog.encodeHTML = function (str) {
    if (str == null) {return;}
    str = cog.replaceAll(cog.replaceAll(str, "'", "&#39;"), '"', "&#34;");
    return str;
};
cog.decodeHTML = function (str) {
    if (str == null) {return;}
    str = cog.replaceAll(cog.replaceAll(str, "&#39;", "'"), "&#34;", '"');
    return str;
};
cog.isElement = function (elem) {
    return elem instanceof Element || elem instanceof HTMLDocument;
};
cog.isJSON = function (str) {
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
    if (str == null) {return;}
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
cog.loadContents = function (callback) {
    var node, src, method, data, dataJSON, cache;
    node = document.querySelector("["+cog.label.source+"]:not(["+cog.label.sourceAwait+"]):not(["+cog.label.skip+"])");
    if (node) {
        src = node.getAttribute(cog.label.source);
        method = node.getAttribute(cog.label.sourceMethod);
        data = node.getAttribute(cog.label.sourceObject);
        cache = node.getAttribute(cog.label.sourceCache);
        if (cache != null) {
            if (cache != 'false') {
                cache = true;
            } else {
                cache = false;
            }
        }
        if (src != null) {
            if (data != null) {
                dataJSON = cog.isJSON(data);
                if (!dataJSON) {
                    if (data.trim().indexOf("{") === 0) {
                        data = cog.eval("("+data+")");
                    } else {
                        data = cog.eval("({"+data+"})");
                    }
                } else {
                    data = dataJSON;
                }
            }
            node.setAttribute(cog.label.sourceAwait, "");
            cog.xhr(src, function (xhr) {
                if (xhr.status == 200) {
                    node.outerHTML = xhr.responseText;
                }
            }, {method:method, data:data, cache:cache});
            cog.loadContents(callback);
        }
    } else {
        if (typeof callback === 'function') {
            if (!document.querySelector("["+cog.label.sourceAwait+"]:not(["+cog.label.skip+"])")) {
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
        if (typeof callback === 'function') {
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
cog.xhr = function (url, callback, arg) {
    if (arg == null) {arg = {};}
    if (arg.cache == null) {arg.cache = cog.cache;}
    if (arg.method == null) {arg.method = 'GET';}
    if (arg.type == null) {arg.type = '';}
    if (arg.data == null) {arg.data = '';}
    if (arg.async == null) {arg.async = true;}
    var xhr, guid, cacheUrl, hashUrl, key, mergedObj, urlObj;
    arg.method = arg.method.toUpperCase();
    xhr = new XMLHttpRequest();
    xhr.responseType = arg.type;
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            callback(xhr);
        }
    };
    if (arg.method == 'GET' && !arg.cache) {
        guid = Date.now();
        cacheUrl = url.replace(/#.*$/, "");
        hashUrl = url.slice(cacheUrl.length);
        cacheUrl = cacheUrl.replace(/([?&])_=[^&]*/, function (m1, m2) {return m2;});
        hashUrl = ((/\?/).test(cacheUrl) ? "&" : "?") + "_=" + (guid++) + hashUrl;
        url = cacheUrl + hashUrl;
    }
    if (arg.method == 'GET' && arg.data != '') {
        mergedObj = {};
        urlObj = cog.getUrlParams(url);
        for (key in urlObj) {mergedObj[key] = urlObj[key];}
        for (key in arg.data) {mergedObj[key] = arg.data[key];}
        url = url.split(/[?#]/)[0]+'?'+cog.urlEncode(mergedObj);
    }
    xhr.open(arg.method, url, arg.async);
    if (arg.method == 'GET') {
        xhr.send();
    } else {
        xhr.setRequestHeader("Content-type", "application/x-www-form-urlencoded");
        xhr.send(cog.urlEncode(arg.data));
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
        if (xhr.status == 200) {
            cog.DOMEval(xhr.responseText);
        }
        if (typeof callback === 'function') {
            setTimeout(function () {
                callback(xhr);
            }, 0);
        }
    }, {method:"GET"});
};
cog.init();