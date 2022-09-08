//CognitiveJS

if (typeof window.CustomEvent !== 'function') { window.CustomEvent = function (event, params) { params = params || {bubbles: false, cancelable: false, detail: null}; var evt = document.createEvent('CustomEvent'); evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail); return evt; }; }

var cog = {};
cog.cache = true;
cog.tokenDelimiter = "%";
cog.labelSet = "data-set";
cog.labelBind = "data-bind";
cog.labelProp = "data-prop";
cog.labelHead = "head";
cog.labelSkip = "skip";
cog.labelSource = "data-src";
cog.labelSourceObject = "data-object";
cog.labelSourceMethod = "data-method";
cog.labelSourceCache = "data-cache";
cog.labelSourceAwait = "await";
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
cog.keywords = {
    parent: "_parent",
    key: "_key",
    index: "_index",
    token: "_token",
    auto: "_auto"
};
cog.regexHead = new RegExp("<head[^>]*>((.|[\\n\\r])*)<\\/head>", "im");
cog.regexBody = new RegExp("<body[^>]*>((.|[\\n\\r])*)<\\/body>", "im");
cog.regexScripts = new RegExp("<script[^>]*>([\\s\\S]*?)<\\/script>", "gim");
cog.encapVar = null;
cog.isReady = true;

cog.get = function (key, arg) {
    if (key == null) {return;}
    if (arg == null) {arg = {};}
    if (arg.reference == null) {arg.reference = false;}
    if (arg.execute == null) {arg.execute = false;}
    var result, old, changed = [];
    if (arg.set !== undefined) {
        old = cog.getRecursiveValue({str:key, exec:false});
        if (old !== arg.set) {
            document.dispatchEvent(new CustomEvent(cog.eventBeforeData, {detail:{key:key, old:old, new:arg.set}}));
            result = cog.getRecursiveValue({str:key, val:arg.set, ref:arg.reference, exec:arg.execute});
            rebind(key);
            document.dispatchEvent(new CustomEvent(cog.eventAfterData, {detail:{elems:changed, key:key, old:old, new:arg.set}}));
        }
    } else {
        result = cog.getRecursiveValue({str:key, val:arg.set, ref:arg.reference, exec:arg.execute});
    }
    if (typeof arg.callback === 'function') {
        arg.callback({elems:changed, key:key, old:old, new:arg.set});
    }
    function rebind(key, i) {
        if (i == null) {i = 0;}
        var elems, elem, elemBind, elemBindSplit, elemBindSplitData, normalizedKey, normalizedElemBindSplitData, bound = false, ii;
        elems = document.querySelectorAll("["+cog.labelBind+"]:not(["+cog.labelSkip+"])");
        if (i < elems.length) {
            elem = elems[i];
            elemBind = elem.getAttribute(cog.labelBind);
            if (elemBind.indexOf(cog.keywords.auto) === 0) {
                elemBindSplit = cog.parseBindAuto(elem);
            } else {
                elemBindSplit = cog.parseBind(elemBind);
            }
            for (ii = 0;ii < elemBindSplit.length;ii++) {
                elemBindSplitData = cog.replaceAll(elemBindSplit[ii].trim(), "\\", "");
                normalizedKey = cog.normalizeKeys(key);
                normalizedElemBindSplitData = cog.normalizeKeys(elemBindSplitData);
                if (normalizedElemBindSplitData.indexOf(normalizedKey) === 0 || normalizedKey.indexOf(normalizedElemBindSplitData) === 0) {
                    bound = true;
                    break;
                }
            }
            if (bound) {
                changed.push(elem);
                cog.bind(elem);
            }
            i++;
            rebind(key, i);
        }
    }
    return result;
};
cog.set = function (key, set, callback) {
    cog.get(key, {
        set: set,
        callback: callback
    });
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
cog.getElementAllEvents = function (elem) {
    var elemLives = [], elemEvents = [], elemProps = cog.getElementProp(elem);
    if (elemProps != null) {
        elemProps.forEach(function (prop) {
            if (eval(cog.bindTypes["live"].if) && prop.current != null) {
                elemLives.push(prop.current);
            }
            if (eval(cog.bindTypes["event"].if) && prop.current != null) {
                elemEvents.push(prop.current);
            }
        });
    }
    return elemLives.concat(elemEvents);
};
cog.getRecursiveValue = function (arg) {
    if (arg == null) {arg = {};}
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
        if (refData[key] !== undefined && typeof refData[key] === 'object' && i != strSplit.length-1 && i != arg.index) {
            refData = refData[key];
        } else {
            if (key == cog.keywords.parent) {
                strSplit.splice(i,1);
                strSplit.splice(i-1,1);
                i = i-2;
                arg.index = i;
                arg.str = strSplit;
                refData = cog.getRecursiveValue(arg);
                result = refData;
            } else if (key == cog.keywords.key) {
                result = strSplit[i-1];
            } else if (key == cog.keywords.token) {
                strSplit.splice(i,1);
                result = cog.normalizeKeys(strSplit);
            } else {
                if (arg.val !== undefined && refData[key] !== arg.val) {
                    refData[key] = arg.val;
                }
                result = refData[key];
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
cog.normalizeKeys = function (str) {
    var result;
    if (typeof str === 'string') {
        result = str.replace(/(?:\[\'|\[\"|\[)(\w+)(?:\'\]|\"\]|\])/g, function (m1, m2) {return "."+m2;});
        result = result.replace(/^\./, '');
    } else {
        result = "";
        str.forEach(function (key, i) {
            if (i == 0) {
                result += key;
            } else {
                result += "."+key;
            }
        });
    }
    return result;
};
cog.parseSet = function (str) {
    return str.split(":");
};
cog.parseBind = function (str) {
    return str.split(",");
};
cog.parseBindAuto = function (elem) {
    var props = elem.getAttribute(cog.labelProp);
    var result = cog.parseToken(props, function (token) {
        var tokenPure = cog.normalizeKeys(cog.purifyToken(token));
        if (!(/[^a-zA-Z0-9\_\-\.]/g.test(tokenPure))) {
            return tokenPure;
        }
    });
    return cog.removeDuplicatesFromArray(result);
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
        if (str[i] === cog.tokenDelimiter) {
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
    if (arg.keep == null) {arg.keep = false;}
    if (typeof node === 'string') {
        cog.get(node, arg);
        return function (arg) {
            return cog.get(node, arg);
        };
    } else {
        if (arg.prop !== undefined) {
            if (!arg.keep) {
                remove_current();
            }
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
                node.setAttribute(cog.labelProp, cog.serialize(arg.prop));
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
            if (cog.bindTypes[bindType][cog.bindKeyIf] != null && cog.bindTypes[bindType][cog.bindKeyBind] != null) {
                if (eval(cog.bindTypes[bindType][cog.bindKeyIf])) {
                    cog.bindTypes[bindType][cog.bindKeyBind](node, prop, props, propIndex);
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
                    if (prop.attr != null) {
                        Object.keys(prop.current).forEach(function (key) {
                            elem.removeAttribute(key);
                        });
                    }
                    if (prop.style != null) {
                        Object.keys(prop.current).forEach(function (key) {
                            node.style[key] = "";
                        });
                    }
                    delete props[i].current;
                }
                if (eval(cog.bindTypes["if"][cog.bindKeyIf])) {
                    node.style.display = "";
                }
            });
            node.setAttribute(cog.labelProp, cog.serialize(prop));
        }
    }
};
cog.bindAll = function (arg) {
    if (arg == null) {arg = {};}
    if (arg.node == null) {arg.node = document;}
    if (arg.i == null) {arg.i = 0;}
    var elems = arg.node.querySelectorAll("["+cog.labelProp+"]:not(["+cog.labelSkip+"])");
    if (arg.i < elems.length) {
        cog.bind(elems[arg.i]);
        arg.i++;
        cog.bindAll(arg);
    } else {
        if (typeof arg.callback === 'function') {
            arg.callback();
        }
    }
};
cog.replaceToken = function (node, replace, recursive) {
    var attrBind, attrProp, child, childs, i;
    if (recursive == null) {recursive = true;}
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
    return cog.replaceAll(token.substring(cog.tokenDelimiter.length, token.length-cog.tokenDelimiter.length).trim(), "\\", "");
};
cog.template = function (arg, bind) {
    var template, createEl;
    if (arg.id == null) {return;}
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
    if (arg.data != null && template != null) {
        cog.replaceToken(template, function (pure) {
            if (pure == arg.data.split(" ")[2]) {
                return cog.purifyToken(arg.data.split(" ")[0]);
            } else {
                return null;
            }
        });
    }
    if (bind && cog.isReady) {
        cog.bindAll({node:template});
    }
    return template;
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
            if (!(/[^a-zA-Z0-9\_\-\.]/g.test(pure))) {
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
cog.executeEvents = function (event) {
    if (!cog.isElement(event.target)) {return;}
    var elemAllEvents = cog.getElementAllEvents(event.target);
    if (elemAllEvents != null) {
        elemAllEvents.forEach(function (current) {
            if (!Array.isArray(current)) {
                current = [current];
            }
            current.forEach(function (obj) {
                Object.keys(obj).forEach(function (key) {
                    if (event.type === key) {
                        cog.eval(obj[key]);
                    }
                });
            });
        });
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
    cog.addEventListenerAll(document.documentElement, cog.executeEvents);
    cog.newBind({
        name: "json",
        set: function (elem, key) {
            var propData = cog.isJSON(elem.innerText);
            if (propData) {
                cog.getRecursiveValue({str:key, val:propData});
            }
        }
    });
    cog.newBind({
        name: "raw",
        set: function (elem, key) {
            var propData = cog.eval("("+elem.innerText+")");
            cog.getRecursiveValue({str:key, val:propData, exec:false});
        }
    });
    cog.newBind({
        name: "debug",
        if: "prop.debug != null",
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
        if: "prop.text != null && (prop.if == null || cog.if(prop.if))",
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
            cog.getRecursiveValue({str:key, val:elem.innerText});
        }
    });
    cog.newBind({
        name: "html",
        if: "prop.html != null && (prop.if == null || cog.if(prop.if))",
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
            cog.getRecursiveValue({str:key, val:elem.innerHTML});
        }
    });
    cog.newBind({
        name: "if",
        if: "prop.if != null && Object.keys(prop).length == 1",
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
        if: "prop.class != null",
        bind: function (elem, prop, props, propIndex) {
            var propData;
            if (prop.current != null) {
                prop.current.split(" ").forEach(function (str) {
                    if (str != "") {
                        elem.classList.remove(str);
                    }
                });
                delete props[propIndex].current;
                elem.setAttribute(cog.labelProp, cog.serialize(props));
            }
            if (prop.if == null || cog.if(prop.if)) {
                propData = cog.replaceToken(prop.class.trim(), function (pure) {
                    return cog.getRecursiveValue({str:pure});
                });
                if (propData != null) {
                    props[propIndex].current = propCurrent;
                    elem.setAttribute(cog.labelProp, cog.serialize(props));
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
        if: "prop.attr != null",
        bind: function (elem, prop, props, propIndex) {
            var propKey, propVal, propCurrent = {};
            if (prop.current != null) {
                Object.keys(prop.current).forEach(function (key) {
                    elem.removeAttribute(key);
                });
                delete props[propIndex].current;
                elem.setAttribute(cog.labelProp, cog.serialize(props));
            }
            if (prop.if == null || cog.if(prop.if)) {
                Object.keys(prop.attr).forEach(function (key) {
                    propKey = cog.replaceToken(key, function (pure) {
                        return cog.getRecursiveValue({str:pure});
                    });
                    propVal = cog.replaceToken(prop.attr[key], function (pure) {
                        return cog.getRecursiveValue({str:pure});
                    });
                    if (propKey != null && propVal != null) {
                        elem.setAttribute(propKey, propVal);
                        propCurrent[propKey] = propVal;
                    }
                });
                if (propCurrent != null) {
                    props[propIndex].current = propCurrent;
                    elem.setAttribute(cog.labelProp, cog.serialize(props));
                }
            }
        }
    });
    cog.newBind({
        name: "event",
        if: "prop.event != null",
        bind: function (elem, prop, props, propIndex) {
            var propKey, propVal, propCurrent = {};
            if (prop.current != null) {
                delete props[propIndex].current;
                elem.setAttribute(cog.labelProp, cog.serialize(props));
            }
            if (prop.if == null || cog.if(prop.if)) {
                Object.keys(prop.event).forEach(function (key) {
                    propKey = cog.replaceToken(key, function (pure) {
                        return cog.getRecursiveValue({str:pure});
                    });
                    propVal = cog.replaceToken(prop.event[key], function (pure) {
                        pure = cog.normalizeKeys(pure);
                        if (!(/[^a-zA-Z0-9\_\-\.]/g.test(pure))) {
                            return "cog.getRecursiveValue({str:'"+pure+"'})";
                        } else {
                            return undefined;
                        }
                    });
                    if (propKey != null && propVal != null) {
                        propCurrent[propKey] = propVal;
                    }
                });
                if (propCurrent != null) {
                    props[propIndex].current = propCurrent;
                    elem.setAttribute(cog.labelProp, cog.serialize(props));
                }
            }
        }
    });
    cog.newBind({
        name: "live",
        if: "prop.live != null",
        bind: function (elem, prop, props, propIndex) {
            var propCurrent = [], liveEvent, liveToken, liveData, liveObj;
            if (prop.current != null) {
                delete props[propIndex].current;
                elem.setAttribute(cog.labelProp, cog.serialize(props));
            }
            if (prop.if == null || cog.if(prop.if)) {
                if (!Array.isArray(prop.live)) {
                    prop.live = [prop.live];
                }
                prop.live.forEach(function (live) {
                    liveObj = {};
                    liveEvent = "change";
                    liveData = "event.target.value";
                    if (typeof live === 'string') {
                        liveToken = live;
                    } else {
                        Object.keys(live).forEach(function (key) {
                            liveToken = cog.replaceToken(key, function (pure) {
                                return cog.getRecursiveValue({str:pure});
                            });
                            if (live[key].event != null) {
                                liveEvent = cog.replaceToken(live[key].event, function (pure) {
                                    return cog.getRecursiveValue({str:pure});
                                });
                            }
                            if (live[key].data != null) {
                                liveData = cog.replaceToken(live[key].data, function (pure) {
                                    return cog.getRecursiveValue({str:pure});
                                });
                            }
                        });
                    }
                    liveToken = cog.normalizeKeys(liveToken);
                    liveObj[liveEvent] = "cog.set('"+liveToken+"', "+liveData+")";
                    propCurrent.push(liveObj);
                });
                if (propCurrent != null) {
                    props[propIndex].current = propCurrent;
                    elem.setAttribute(cog.labelProp, cog.serialize(props));
                }
            }
        }
    });
    cog.newBind({
        name: "style",
        if: "prop.style != null",
        bind: function (elem, prop, props, propIndex) {
            var propKey, propVal, propCurrent = {};
            if (prop.current != null) {
                Object.keys(prop.current).forEach(function (key) {
                    elem.style[key] = "";
                });
                delete props[propIndex].current;
                elem.setAttribute(cog.labelProp, cog.serialize(props));
            }
            if (prop.if == null || cog.if(prop.if)) {
                Object.keys(prop.style).forEach(function (key) {
                    propKey = cog.replaceToken(key, function (pure) {
                        return cog.getRecursiveValue({str:pure});
                    });
                    propVal = cog.replaceToken(prop.style[key], function (pure) {
                        return cog.getRecursiveValue({str:pure});
                    });
                    if (propKey != null && propVal != null) {
                        elem.style[propKey] = propVal;
                        propCurrent[propKey] = propVal;
                    }
                });
                if (propCurrent != null) {
                    props[propIndex].current = propCurrent;
                    elem.setAttribute(cog.labelProp, cog.serialize(props));
                }
            }
        }
    });
    cog.newBind({
        name: "temp",
        if: "prop.temp != null && prop.repeat == null && (prop.if == null || cog.if(prop.if))",
        bind: function (elem, prop, props, propIndex) {
            var template;
            if (prop.data != null) {
                template = cog.template({id:prop.temp, data:prop.data});
            } else {
                template = cog.template({id:prop.temp});
            }
            if (template != null) {
                elem.innerHTML = template.innerHTML;
            }
        },
        set: function (elem, key) {
            cog.template({id:key, elem:elem});
        }
    });
    cog.newBind({
        name: "repeat",
        if: "prop.repeat != null && (prop.if == null || cog.if(prop.if))",
        bind: function (elem, prop, props, propIndex) {
            var propDatas, propData, propDatasIterate, template, repeatVal, i, key, parent = prop.repeat.split(" ")[0], alias = prop.repeat.split(" ")[2];
            parent = cog.purifyToken(parent);
            parent = cog.normalizeKeys(parent);
            propDatas = cog.getRecursiveValue({str:parent});
            cog.template({id:prop.temp, elem:elem});
            if (typeof propDatas === 'object' && !Array.isArray(propDatas)) {
                propDatasIterate = Object.keys(propDatas);
            } else {
                propDatasIterate = propDatas;
            }
            repeatVal = "";
            if (propDatas != null) {
                for (i = 0;i < propDatasIterate.length;i++) {
                    if (typeof propDatas === 'object' && !Array.isArray(propDatas)) {
                        propData = propDatas[Object.keys(propDatas)[i]];
                        key = Object.keys(propDatas)[i];
                    } else {
                        propData = propDatas[i];
                        key = i;
                    }
                    template = cog.template({id:prop.temp});
                    cog.replaceToken(template, function (pure) {
                        var result = null;
                        pure = cog.normalizeKeys(pure);
                        if (pure == alias) {
                            if (typeof propDatas === 'object' && !Array.isArray(propDatas)) {
                                result = parent+"."+key;
                            } else {
                                result = parent+"."+i;
                            }
                        }
                        if (pure == alias+'.'+cog.keywords.index) {
                            result = i;
                        }
                        return result;
                    });
                    repeatVal += template.innerHTML;
                }
            }
            elem.innerHTML = repeatVal;
            if (cog.isReady) {
                cog.bindAll({node:elem});
            }
        }
    });
};
cog.render = function (layoutSrc) {
    var layout;
    step_start();
    function step_start() {
        cog.isReady = false;
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
        if (typeof callback === 'function') {
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
                callback: function () {
                    cog.isReady = true;
                    step_scripts();
                }
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
    node = document.querySelector("["+cog.labelSource+"]:not(["+cog.labelSourceAwait+"]):not(["+cog.labelSkip+"])");
    if (node) {
        src = node.getAttribute(cog.labelSource);
        method = node.getAttribute(cog.labelSourceMethod);
        data = node.getAttribute(cog.labelSourceObject);
        cache = node.getAttribute(cog.labelSourceCache);
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
            node.setAttribute(cog.labelSourceAwait, "");
            cog.xhr(src, function (xhr, node) {
                if (xhr.readyState == 4) {
                    if (xhr.status == 200) {
                        node.outerHTML = xhr.responseText;
                    }
                }
            }, node, method, data, cache);
            cog.loadContents(callback);
        }
    } else {
        if (typeof callback === 'function') {
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
cog.xhr = function (url, callback, arg, method, obj, cache, async) {
    if (cache == null) {cache = cog.cache;}
    if (method == null) {
        if (!cache) {
            method = 'POST';
        } else {
            method = 'GET';
        }
    }
    if (obj == null) {obj = '';}
    if (async == null) {async = true;}
    var xhr, guid, cacheUrl, hashUrl, key, mergedObj, urlObj;
    method = method.toUpperCase();
    xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function () {
        if (xhr.readyState == XMLHttpRequest.DONE) {
            callback(xhr, arg);
        }
    };
    if (!cache && method == 'GET') {
        guid = Date.now();
        cacheUrl = url.replace(/#.*$/, "");
        hashUrl = url.slice(cacheUrl.length);
        cacheUrl = cacheUrl.replace(/([?&])_=[^&]*/, function (m1, m2) {return m2;});
        hashUrl = ((/\?/).test(cacheUrl) ? "&" : "?") + "_=" + (guid++) + hashUrl;
        url = cacheUrl + hashUrl;
    }
    if (method == 'GET' && obj != '') {
        mergedObj = {};
        urlObj = cog.getUrlParams(url);
        for (key in urlObj) {mergedObj[key] = urlObj[key];}
        for (key in obj) {mergedObj[key] = obj[key];}
        url = url.split(/[?#]/)[0]+'?'+cog.urlEncode(mergedObj);
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
            if (typeof callback === 'function') {
                setTimeout(function () {
                    callback(xhr);
                }, 0);
            }
        }
    });
};
cog.init();