if (typeof window.CustomEvent !== 'function') { window.CustomEvent = function (event, params) { params = params || { bubbles: false, cancelable: false, detail: null }; var evt = document.createEvent('CustomEvent'); evt.initCustomEvent(event, params.bubbles, params.cancelable, params.detail); return evt; }; }
var cog = {};
cog.data = {};
cog.templates = {};
cog.id = {};
cog.ids = {};
cog.isRendered = false;
cog.cache = true;
cog.label = {
    head: "head",
    escapeTag: "cog-escape",
    prop: "cog-prop",
    set: "cog-set",
    src: "cog-src",
    temp: "cog-temp",
    repeat: "cog-repeat",
    reverse: "cog-reverse",
    if: "cog-if",
    id: "cog-id",
    data: "cog-data",
    event: "cog-event",
    await: "cog-await"
};
cog.event = {
    beforeRender: "COG_beforeRender",
    afterRender: "COG_afterRender",
    onTemplateLoad: "COG_onTemplateLoad"
};
cog.keyword = {
    this: "_this",
    get: "_get",
    set: "_set",
    iterate: "_iterate",
    iterateParent: "_iterateParent",
    value: "_value",
    type: "_type",
    token: "_token",
    keys: "_keys",
    key: "_key",
    parent: "_parent",
    length: "_length",
    index: "_index",
    nodes: "_nodes",
    innerNodes: "_innerNodes",
    repeats: "_repeats",
    bound: "_bound"
};
cog.token = {
    open: "{{",
    close: "}}"
};
cog.regex = {
    head: new RegExp("<head[^>]*>((.|[\\\n\\\r])*)<\\\/head>", "im"),
    body: new RegExp("<body[^>]*>((.|[\\\n\\\r])*)<\\\/body>", "im"),
    token: new RegExp(cog.token.open + "[a-zA-Z0-9\\$._-\\s]*?" + cog.token.close),
    node: new RegExp("(?:" + cog.token.open + "([a-zA-Z0-9\\$._-\\s]*?)" + cog.token.close + ")|([^]*?)(?=" + cog.token.open + "|$)", "gm")
};
cog.render = function (layoutSrc) {
    var i, layout, scripts;
    step_start();
    function convert_data() {
        cog.data = new cog.observable(cog.data, cog.rebind);
    }
    function step_start() {
        if (typeof layoutSrc === "string") {
            cog.xhr(layoutSrc, function (xhr) {
                if (xhr.status == 200) {
                    layout = xhr.responseText;
                    step_design();
                }
            }, { method: "GET" });
        } else {
            cog.setElems(function () {
                convert_data();
                document.dispatchEvent(new CustomEvent(cog.event.beforeRender));
                if (cog.isElement(layoutSrc)) {
                    cog.bind(layoutSrc);
                } else {
                    cog.bind();
                }
                setTimeout(function () {
                    scripts = document.querySelectorAll("script[" + cog.label.await + "]");
                    cog.loadScriptsNS(scripts, function () {
                        for (i = 0; i < scripts.length; i++) {
                            scripts[i].removeAttribute(cog.label.await);
                        }
                        step_finish();
                    });
                }, 0);
            });
        }
    }
    function step_design() {
        while (document.getElementsByTagName('script').length > 0) {
            document.getElementsByTagName('script')[0].parentNode.removeChild(document.getElementsByTagName('script')[0]);
        }
        if ((/\<\/head\>/).test(layout)) {
            document.head.innerHTML += layout.match(cog.regex.head)[1];
        }
        if ((/\<\/body\>/).test(layout)) {
            document.documentElement.innerHTML = document.documentElement.innerHTML.replace("<body", "<body" + layout.match("<body" + "(.*)" + ">")[1]);
            document.body.innerHTML += layout.match(cog.regex.body)[1];
        }
        if (!(/\<\/head\>/).test(layout) && !(/\<\/body\>/).test(layout)) {
            document.body.innerHTML += layout;
        }
        setTimeout(function () {
            cog.setElems(function () {
                convert_data();
                step_bind();
            });
        }, 0);
    }
    function step_bind() {
        document.dispatchEvent(new CustomEvent(cog.event.beforeRender));
        setTimeout(function () {
            cog.bind(document.body, function () {
                step_scripts();
            });
        }, 0);
    }
    function step_scripts() {
        cog.loadScriptsNS(document.querySelectorAll("script"), function () {
            scripts = document.querySelectorAll("script[" + cog.label.await + "]");
            for (i = 0; i < scripts.length; i++) {
                scripts[i].removeAttribute(cog.label.await);
            }
            cog.DOMLoad();
            step_finish();
        });
    }
    function step_finish() {
        setTimeout(function () {
            cog.scrollToHash();
            cog.isRendered = true;
            document.dispatchEvent(new CustomEvent(cog.event.afterRender));
        }, 0);
    }
};
cog.bind = function (dom, callback) {
    var i, ii, iii, node, nodes = [], nodeType, nodeObj, newNodeLen, splitNodeContent, pureToken, token, content, idx, oldNode, parent, ob, nodeAttr, nodeAttrs, nodeAttrsLen, newNodeAttrs, attrKey, attrVal, tempNode, tempAttr, tempId, tempToken, tempTokenObj, tempAlias, tempRender, nodeSplitTokens, nodeSplitToken, prop, propType, newNode, attrContentParse, attrContentObj, attrContentObjProp;
    if (dom == null) { dom = document.body; }
    while (tempNode = dom.querySelector("[" + cog.label.temp + "]")) {
        tempAttr = cog.replaceText(tempNode.getAttribute(cog.label.temp)).split(";");
        tempId = tempAttr[0].trim();
        if (tempAttr.length == 3) {
            tempToken = tempAttr[2].split(",");
            i = 0;
            while (typeof tempToken[i] !== 'undefined') {
                tempToken[i] = tempToken[i].trim();
                i++;
            }
            tempTokenObj = {};
            tempAlias = tempAttr[1].split(",");
            i = 0;
            while (typeof tempAlias[i] !== 'undefined') {
                tempAlias[i] = tempAlias[i].trim();
                tempTokenObj[tempAlias[i]] = tempToken[i];
                i++;
            }
        } else {
            tempTokenObj = null;
        }
        if (cog.templates.hasOwnProperty(tempId)) {
            tempRender = cog.template({ id: tempId, data: tempTokenObj, fragment: false, bind: true });
            cog.defineTempAttrs(tempRender, tempId, tempToken);
            tempNode.parentNode.replaceChild(tempRender, tempNode);
            cog.dispatchOnTemplateLoad(tempRender, tempId);
        }
    }
    cog.bindRepeats(dom);
    nodes = cog.filterNodes(dom, NodeFilter.SHOW_TEXT + NodeFilter.SHOW_ELEMENT, function (node) {
        if (node.nodeType === Node.TEXT_NODE && cog.regex.token.test(node.nodeValue)) {
            return NodeFilter.FILTER_ACCEPT;
        } else if (node.hasAttribute && !node.hasAttribute(cog.label.escapeTag) && node.tagName !== 'SCRIPT') {
            return NodeFilter.FILTER_ACCEPT;
        } else {
            return NodeFilter.FILTER_REJECT;
        }
    }, true);
    i = 0;
    while (node = nodes[i]) {
        if (node.nodeType === Node.TEXT_NODE) {
            splitNodeContent = cog.splitTokens(node.nodeValue);
            for (pureToken in splitNodeContent) {
                token = cog.token.open + pureToken + cog.token.close;
                idx = node.nodeValue.indexOf(token);
                if (idx === -1) { continue; }
                content = splitNodeContent[pureToken];
                oldNode = node.splitText(idx);
                oldNode.nodeValue = oldNode.nodeValue.replace(token, '');
                parent = node.parentNode;
                if (cog.isElement(content)) {
                    newNode = cog.bind(content.cloneNode(true));
                    if (content.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                        nodeType = "frag";
                        newNode = cog.arrFragment(newNode);
                        newNodeLen = newNode.length;
                        for (ii = 0; ii < newNodeLen; ii++) {
                            parent.insertBefore(newNode[ii], oldNode);
                        }
                    } else {
                        nodeType = "elem";
                        parent.insertBefore(newNode, oldNode);
                    }
                } else {
                    newNode = document.createTextNode(content);
                    nodeType = "text";
                    parent.insertBefore(newNode, oldNode);
                }
                nodeObj = {};
                nodeObj[nodeType] = newNode;
                ob = cog.get(pureToken, true);
                cog.pushNode(pureToken, ob, nodeObj);
                if (cog.regex.token.test(oldNode.nodeValue)) {
                    nodes.splice(i + 1, 0, oldNode);
                } else {
                    break;
                }
            }
        } else {
            nodeAttrs = node.attributes;
            newNodeAttrs = [];
            nodeAttrsLen = nodeAttrs.length;
            for (ii = 0; ii < nodeAttrsLen; ii++) {
                nodeAttr = nodeAttrs[ii];
                newNodeAttrs.push({ name: nodeAttr.name, value: nodeAttr.value });
            }
            nodeAttrsLen = newNodeAttrs.length;
            for (ii = 0; ii < nodeAttrsLen; ii++) {
                nodeAttr = newNodeAttrs[ii];
                attrKey = nodeAttr.name;
                attrVal = nodeAttr.value;
                if (attrKey.indexOf(cog.label.prop) === 0) {
                    propType = "prop";
                } else if (attrKey == cog.label.if) {
                    propType = "if";
                } else if (attrKey == cog.label.event) {
                    propType = "event";
                } else {
                    propType = "attr";
                }
                if (propType != "attr" || cog.regex.token.test(attrVal)) {
                    prop = { node: node };
                    prop.type = propType;
                    if (propType == "event") {
                        attrVal = attrVal.trim();
                        if (attrVal[0] == "{") {
                            attrVal = "[" + attrVal + "]";
                        } else {
                            attrVal = "[{" + attrVal + "}]";
                        }
                        attrContentParse = cog.prepareTokenStr(attrVal);
                        prop.content = attrContentParse;
                        cog.addEventProperties(node, prop);
                        node.removeAttribute(attrKey);
                    } else {
                        attrContentParse = cog.prepareTokenStr(attrVal);
                        prop.content = attrContentParse;
                        nodeSplitTokens = cog.splitTokens(attrVal, true);
                        for (nodeSplitToken in nodeSplitTokens) {
                            ob = cog.get(nodeSplitToken, true);
                            cog.pushNode(nodeSplitToken, ob, { prop: prop });
                        }
                        if (propType == "attr") {
                            node.setAttribute(attrKey, cog.constructTokenStr(attrContentParse, true));
                            prop.attr = attrKey;
                        } else if (propType == "if") {
                            if (cog.if(cog.constructTokenStr(attrContentParse))) {
                                node.style.display = "";
                            } else {
                                node.style.display = "none";
                            }
                            node.removeAttribute(attrKey);
                        } else {
                            attrContentObj = cog.eval("({" + cog.constructTokenStr(attrContentParse) + "})");
                            attrContentObj = cog.propCondition(attrContentObj);
                            if (attrContentObj) {
                                if (attrContentObj.hasOwnProperty("style")) {
                                    attrContentObjProp = attrContentObj["style"];
                                    for (iii in attrContentObjProp) {
                                        node.style[iii] = attrContentObjProp[iii];
                                    }
                                }
                                if (attrContentObj.hasOwnProperty("class")) {
                                    if (typeof attrContentObj["class"] === "string") {
                                        attrContentObjProp = attrContentObj["class"].trim().split(" ");
                                    } else {
                                        attrContentObjProp = attrContentObj["class"];
                                    }
                                    for (iii in attrContentObjProp) {
                                        if (attrContentObjProp[iii]) {
                                            node.classList.add(attrContentObjProp[iii]);
                                        }
                                    }
                                }
                                if (attrContentObj.hasOwnProperty("context")) {
                                    attrContentObjProp = attrContentObj["context"];
                                    for (iii in attrContentObjProp) {
                                        node[iii] = attrContentObjProp[iii];
                                    }
                                }
                                if (attrContentObj.hasOwnProperty("attr")) {
                                    attrContentObjProp = attrContentObj["attr"];
                                    for (iii in attrContentObjProp) {
                                        node.setAttribute(iii, attrContentObjProp[iii]);
                                    }
                                }
                            }
                            prop.old = attrContentObj;
                            node.removeAttribute(attrKey);
                        }
                    }
                }
            }
        }
        i++;
    }
    if (typeof callback === 'function') {
        callback();
    }
    return dom;
};
cog.bindRepeats = function (dom) {
    var i, repeatNode, repeatAttr, repeatId, repeatToken, repeatTokenObj, repeatAlias, repeatData, repeatDataLength, repeatDataToken, repeatTemp, repeats, repeatsNew, repeatsNewChildren;
    while (repeatNode = dom.querySelector("[" + cog.label.repeat + "]")) {
        repeatAttr = cog.replaceText(repeatNode.getAttribute(cog.label.repeat)).split(";");
        repeatId = repeatAttr[0].trim();
        repeatToken = repeatAttr[2].split(",");
        i = 0;
        while (typeof repeatToken[i] !== 'undefined') {
            repeatToken[i] = repeatToken[i].trim();
            i++;
        }
        repeatTokenObj = {};
        repeatAlias = repeatAttr[1].split(",");
        i = 0;
        while (typeof repeatAlias[i] !== 'undefined') {
            repeatAlias[i] = repeatAlias[i].trim();
            repeatTokenObj[repeatAlias[i]] = repeatToken[i];
            i++;
        }
        repeatNode.removeAttribute(cog.label.repeat);
        cog.defineTempAttrs(repeatNode, repeatId, repeatToken);
        repeatDataToken = repeatToken[0];
        repeatData = cog.get(repeatDataToken, true);
        repeatNode.innerHTML = "";
        repeats = repeatData[cog.keyword.repeats];
        repeatsNew = repeats[repeats.push({ owner: repeatNode, template: repeatId, dataAlias: repeatAlias[0], alias: cog.shallowClone(repeatTokenObj), children: [] }) - 1];
        if (repeatData[cog.keyword.type] === "array") {
            repeatDataLength = repeatData.length;
            for (i = 0; i < repeatDataLength; i++) {
                repeatTokenObj[repeatAlias[0]] = repeatDataToken + "." + i;
                repeatTemp = cog.template({ id: repeatId, data: repeatTokenObj, fragment: false, bind: true });
                repeatsNew["children"].push({ ob: repeatData[i], nodes: [] });
                repeatsNewChildren = repeatsNew["children"][i];
                while (repeatTemp.firstChild) {
                    repeatsNewChildren["nodes"].push(repeatTemp.firstChild);
                    repeatNode.appendChild(repeatTemp.firstChild);
                }
            }
        }
        cog.dispatchOnTemplateLoad(repeatNode, repeatId);
    }
};
cog.rebind = function (task) {
    var ob;
    ob = task.ob;
    if (task.action == "unshift") {
        cog.spliceRepeats(ob, task.index, task.remove, task.add);
    }
    if (task.action == "shift") {
        cog.spliceRepeats(ob, task.index, task.remove, task.add);
    }
    if (task.action == "push") {
        cog.spliceRepeats(ob, task.index, task.remove, task.add);
    }
    if (task.action == "pop") {
        cog.spliceRepeats(ob, task.index, task.remove, task.add);
    }
    if (task.action == "splice") {
        cog.spliceRepeats(ob, task.index, task.remove, task.add);
    }
    if (task.action == "reverse") {
        cog.correctIndex(ob);
    }
    if (task.action == "set") {
        ob[cog.keyword.iterate](function (cob) {
            cog.rebindNodes(cob[cog.keyword.nodes], cob);
            cog.rebindNodes(cob[cog.keyword.innerNodes][cog.keyword.index], cob, cog.keyword.index);
            cog.rebindNodes(cob[cog.keyword.innerNodes][cog.keyword.length], cob, cog.keyword.length);
            cog.correctIndex(cob);
            cog.rebound(cob);
        });
    }
    if (task.action == "push" || task.action == "pop") {
        cog.rebindNodes(ob[cog.keyword.innerNodes][cog.keyword.length], ob, cog.keyword.length);
        ob[cog.keyword.iterate](function (cob) {
            cog.rebound(cob);
        });
    }
    if (task.action == "unshift" || task.action == "shift" || task.action == "splice") {
        cog.rebindNodes(ob[cog.keyword.innerNodes][cog.keyword.length], ob, cog.keyword.length);
        ob[cog.keyword.iterate](function (cob) {
            cog.rebindNodes(cob[cog.keyword.innerNodes][cog.keyword.index], cob, cog.keyword.index);
            cog.rebound(cob);
        });
    }
    if (task.action == "reverse") {
        ob[cog.keyword.iterate](function (cob) {
            cog.rebindNodes(cob[cog.keyword.innerNodes][cog.keyword.index], cob, cog.keyword.index);
            cog.rebound(cob);
        });
    }
    ob[cog.keyword.iterateParent](function (pob) {
        cog.rebound(pob);
    });
};
cog.rebound = function (ob) {
    var i, bob;
    i = 0;
    while (typeof ob[cog.keyword.bound][i] !== 'undefined') {
        bob = ob[cog.keyword.bound][i];
        if (bob instanceof cog.observable) {
            bob[cog.keyword.iterate](function (cob) {
                cog.rebindNodes(cob[cog.keyword.nodes], cob[cog.keyword.get](true));
                cog.rebindNodes(cob[cog.keyword.innerNodes][cog.keyword.index], cob, cog.keyword.index);
                cog.rebindNodes(cob[cog.keyword.innerNodes][cog.keyword.length], cob, cog.keyword.length);
                cog.correctIndex(cob);
            });
        } else {
            bob(ob[cog.keyword.parent], ob);
        }
        i++;
    }
};
cog.correctIndex = function (ob) {
    var i, ii, iii, repeats = ob[cog.keyword.repeats], repeatBeforeChildNodes, repeatAfterChildNodes, realIndex, repeat, repeatChildren, checkLRepeat, checkLRepeatChildrenLength, checkLRepeatChildren, checkLRepeatChild, repeatChild;
    if (!(repeats.length > 0)) { return; }
    checkLRepeat = repeats[0];
    checkLRepeatChildrenLength = checkLRepeat["children"].length;
    if (checkLRepeatChildrenLength > ob.length) {
        cog.spliceRepeats(ob, ob.length, checkLRepeatChildrenLength - ob.length, 0);
    }
    if (checkLRepeatChildrenLength < ob.length) {
        cog.spliceRepeats(ob, checkLRepeatChildrenLength, 0, ob.length - checkLRepeatChildrenLength);
    }
    realIndex = 0;
    checkLRepeatChildren = checkLRepeat["children"];
    while (realIndex < ob.length) {
        i = 0;
        while (typeof checkLRepeatChildren[i] !== 'undefined') {
            checkLRepeatChild = checkLRepeatChildren[i];
            if (realIndex == checkLRepeatChild["ob"][cog.keyword.index]) {
                if (realIndex != i) {
                    ii = 0;
                    while (typeof repeats[ii] !== 'undefined') {
                        repeat = repeats[ii];
                        repeatChildren = repeat["children"];
                        repeatChild = repeatChildren[i];
                        repeatAfterChildNodes = repeatChildren[i]["nodes"];
                        repeatBeforeChildNodes = repeatChildren[realIndex]["nodes"];
                        iii = 0;
                        if (repeatBeforeChildNodes) {
                            while (typeof repeatAfterChildNodes[iii] !== 'undefined') {
                                repeatBeforeChildNodes[0].parentNode.insertBefore(repeatAfterChildNodes[iii], repeatBeforeChildNodes[0]);
                                iii++;
                            }
                        } else {
                            while (typeof repeatAfterChildNodes[iii] !== 'undefined') {
                                repeat["owner"].appendChild(repeatAfterChildNodes[iii]);
                                iii++;
                            }
                        }
                        repeatChildren.splice(i, 1);
                        repeatChildren.splice(realIndex, 0, repeatChild);
                        ii++;
                    }
                }
                realIndex++;
                break;
            }
            i++;
        }
    }
};
cog.spliceRepeats = function (ob, index, remove, add) {
    var i, ii, iii, repeats = ob[cog.keyword.repeats], repeatsLen = repeats.length, repeat, repeatChildren, repeatChild, repeatBeforeChildNodes, sumIndex, repeatAlias, repeatTemp, repeatNewChildren;
    for (i = 0; i < repeatsLen; i++) {
        repeat = repeats[i];
        if (cog.isInDocument(repeat["owner"])) {
            repeatChildren = repeat["children"];
            for (ii = 0; ii < remove; ii++) {
                repeatChild = repeatChildren[index + ii];
                iii = 0;
                while (typeof repeatChild["nodes"][iii] !== 'undefined') {
                    repeatChild["nodes"][iii].parentNode.removeChild(repeatChild["nodes"][iii]);
                    iii++;
                }
            }
            repeatChildren.splice(index, remove);
            for (ii = 0; ii < add; ii++) {
                sumIndex = index + ii;
                if (repeatChildren[sumIndex] && repeatChildren[sumIndex]["nodes"]) {
                    repeatBeforeChildNodes = repeatChildren[sumIndex]["nodes"];
                } else {
                    repeatBeforeChildNodes = false;
                }
                repeatAlias = cog.shallowClone(repeat["alias"]);
                repeatAlias[repeat["dataAlias"]] = ob[cog.keyword.token] + "." + sumIndex;
                repeatTemp = cog.template({ id: repeat["template"], data: repeatAlias, fragment: false, bind: true, parent: repeat });
                repeatNewChildren = [];
                if (repeatBeforeChildNodes) {
                    while (repeatTemp.firstChild) {
                        repeatNewChildren.push(repeatTemp.firstChild);
                        repeatBeforeChildNodes[0].parentNode.insertBefore(repeatTemp.firstChild, repeatBeforeChildNodes[0]);
                    }
                } else {
                    while (repeatTemp.firstChild) {
                        repeatNewChildren.push(repeatTemp.firstChild);
                        repeat["owner"].appendChild(repeatTemp.firstChild);
                    }
                }
                repeatChildren.splice(sumIndex, 0, { ob: ob[sumIndex], nodes: repeatNewChildren });
            }
        } else {
            delete ob[cog.keyword.repeats][i];
        }
    }
};
cog.accessTokenValue = function (ob, key) {
    if (!(ob instanceof cog.observable)) { return ob; }
    if (!key) {
        return cog.get(ob, false, true);
    } else {
        return ob[key];
    }
};
cog.rebindNodes = function (nodes, cob, key) {
    var i, ii, node, oldNode, oldNodeLen, newNode, newNodeLen, prop, attrContentObj, attrContentObjProp, content, isContentElement;
    for (i = 0; i < nodes.length; i++) {
        node = nodes[i];
        if (node.hasOwnProperty("text")) {
            oldNode = node.text;
            if (cog.isInDocument(oldNode)) {
                content = cog.accessTokenValue(cob, key);
                isContentElement = cog.isElement(content);
                if (isContentElement) {
                    newNode = cog.bind(content.cloneNode(true));
                    if (content.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                        newNode = cog.arrFragment(newNode);
                        newNodeLen = newNode.length;
                        for (ii = 0; ii < newNodeLen; ii++) {
                            oldNode.parentNode.insertBefore(newNode[ii], oldNode);
                        }
                        oldNode.parentNode.removeChild(oldNode);
                        nodes[i] = { frag: newNode };
                    } else {
                        oldNode.parentNode.replaceChild(newNode, oldNode);
                        nodes[i] = { elem: newNode };
                    }
                } else {
                    if (oldNode.nodeValue != content) {
                        oldNode.nodeValue = content;
                    }
                }
            } else {
                nodes.splice(i, 1);
                --i;
            }
        } else if (node.hasOwnProperty("prop")) {
            prop = node.prop;
            if (cog.isInDocument(prop.node)) {
                if (prop.type == "prop") {
                    attrContentObj = cog.eval("({" + cog.constructTokenStr(prop.content) + "})");
                    attrContentObj = cog.propCondition(attrContentObj);
                    if (prop.old) {
                        if (prop.old.hasOwnProperty("style")) {
                            attrContentObjProp = prop.old["style"];
                            for (ii in attrContentObjProp) {
                                prop.node.style[ii] = "";
                            }
                        }
                        if (prop.old.hasOwnProperty("class")) {
                            if (typeof prop.old["class"] === "string") {
                                attrContentObjProp = prop.old["class"].trim().split(" ");
                            } else {
                                attrContentObjProp = prop.old["class"];
                            }
                            for (ii in attrContentObjProp) {
                                if (attrContentObjProp[ii]) {
                                    prop.node.classList.remove(attrContentObjProp[ii]);
                                }
                            }
                        }
                        if (prop.old.hasOwnProperty("context")) {
                            attrContentObjProp = prop.old["context"];
                            for (ii in attrContentObjProp) {
                                prop.node[ii] = attrContentObjProp[ii];
                            }
                        }
                        if (prop.old.hasOwnProperty("attr")) {
                            attrContentObjProp = prop.old["attr"];
                            for (ii in attrContentObjProp) {
                                prop.node.removeAttribute(ii);
                            }
                        }
                    }
                    if (attrContentObj) {
                        if (attrContentObj.hasOwnProperty("style")) {
                            attrContentObjProp = attrContentObj["style"];
                            for (ii in attrContentObjProp) {
                                prop.node.style[ii] = attrContentObjProp[ii];
                            }
                        }
                        if (attrContentObj.hasOwnProperty("class")) {
                            if (typeof attrContentObj["class"] === "string") {
                                attrContentObjProp = attrContentObj["class"].trim().split(" ");
                            } else {
                                attrContentObjProp = attrContentObj["class"];
                            }
                            for (ii in attrContentObjProp) {
                                if (attrContentObjProp[ii]) {
                                    prop.node.classList.add(attrContentObjProp[ii]);
                                }
                            }
                        }
                        if (attrContentObj.hasOwnProperty("context")) {
                            attrContentObjProp = attrContentObj["context"];
                            for (ii in attrContentObjProp) {
                                prop.node[ii] = attrContentObjProp[ii];
                            }
                        }
                        if (attrContentObj.hasOwnProperty("attr")) {
                            attrContentObjProp = attrContentObj["attr"];
                            for (ii in attrContentObjProp) {
                                prop.node.setAttribute(ii, attrContentObjProp[ii]);
                            }
                        }
                    }
                    prop.old = attrContentObj;
                } else if (prop.type == "if") {
                    if (cog.if(cog.constructTokenStr(prop.content))) {
                        prop.node.style.display = "";
                    } else {
                        prop.node.style.display = "none";
                    }
                } else if (prop.type == "attr") {
                    prop.node.setAttribute(prop.attr, cog.constructTokenStr(prop.content, true));
                }
            } else {
                nodes.splice(i, 1);
                --i;
            }
        } else if (node.hasOwnProperty("frag")) {
            oldNode = node.frag;
            for (ii = 0; ii < oldNode.length; ii++) {
                if (!cog.isInDocument(oldNode[ii])) {
                    oldNode.splice(ii, 1);
                    --ii;
                }
            }
            if (oldNode.length > 0) {
                content = cog.accessTokenValue(cob, key);
                isContentElement = cog.isElement(content);
                if (isContentElement) {
                    newNode = cog.bind(content.cloneNode(true));
                    if (content.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                        newNode = cog.arrFragment(newNode);
                        newNodeLen = newNode.length;
                        for (ii = 0; ii < newNodeLen; ii++) {
                            oldNode[0].parentNode.insertBefore(newNode[ii], oldNode[0]);
                        }
                        for (ii = 0; ii < oldNodeLen; ii++) {
                            oldNode[ii].parentNode.removeChild(oldNode[ii]);
                        }
                        nodes[i] = { frag: newNode };
                    } else {
                        oldNode[0].parentNode.insertBefore(newNode, oldNode[0]);
                        for (ii = 0; ii < oldNodeLen; ii++) {
                            oldNode[ii].parentNode.removeChild(oldNode[ii]);
                        }
                        nodes[i] = { elem: newNode };
                    }
                } else {
                    newNode = document.createTextNode(content);
                    oldNode[0].parentNode.insertBefore(newNode, oldNode[0]);
                    oldNodeLen = oldNode.length;
                    for (ii = 0; ii < oldNodeLen; ii++) {
                        oldNode[ii].parentNode.removeChild(oldNode[ii]);
                    }
                    nodes[i] = { text: newNode };
                }
            } else {
                nodes.splice(i, 1);
                --i;
            }
        } else if (node.hasOwnProperty("elem")) {
            oldNode = node.elem;
            if (cog.isInDocument(oldNode)) {
                content = cog.accessTokenValue(cob, key);
                isContentElement = cog.isElement(content);
                if (isContentElement) {
                    newNode = cog.bind(content.cloneNode(true));
                    if (content.nodeType === Node.DOCUMENT_FRAGMENT_NODE) {
                        newNode = cog.arrFragment(newNode);
                        newNodeLen = newNode.length;
                        for (ii = 0; ii < newNodeLen; ii++) {
                            oldNode.parentNode.insertBefore(newNode[ii], oldNode);
                        }
                        oldNode.parentNode.removeChild(oldNode);
                        nodes[i] = { frag: newNode };
                    } else {
                        oldNode.parentNode.replaceChild(newNode, oldNode);
                        nodes[i] = { elem: newNode };
                    }
                } else {
                    newNode = document.createTextNode(content);
                    oldNode.parentNode.replaceChild(newNode, oldNode);
                    nodes[i] = { text: newNode };
                }
            } else {
                nodes.splice(i, 1);
                --i;
            }
        }
    }
};
cog.addBound = function (dataKeys, targetKeys) {
    if (!cog.isRendered) {
        document.addEventListener(cog.event.afterRender, function () {
            cog.addBound(dataKeys, targetKeys);
        });
    } else {
        var dataKey, targetKey;
        if (dataKeys instanceof cog.observable || typeof dataKeys === "function") {
            dataKey = dataKeys;
        } else {
            dataKey = cog.get(dataKeys, true);
        }
        if (targetKeys instanceof cog.observable || typeof targetKeys === "function") {
            targetKey = targetKeys;
        } else {
            targetKey = cog.get(targetKeys, true);
        }
        if (dataKey instanceof cog.observable && dataKey[cog.keyword.bound].indexOf(targetKey) === -1) {
            dataKey[cog.keyword.bound].push(targetKey);
        }
        if (targetKey instanceof cog.observable && targetKey[cog.keyword.bound].indexOf(dataKey) === -1) {
            targetKey[cog.keyword.bound].push(dataKey);
        }
    }
};
cog.removeBound = function (dataKeys, targetKeys) {
    if (!cog.isRendered) {
        document.addEventListener(cog.event.afterRender, function () {
            cog.removeBound(dataKeys, targetKeys);
        });
    } else {
        var dataKey, targetKey;
        if (dataKeys instanceof cog.observable || typeof dataKeys === "function") {
            dataKey = dataKeys;
        } else {
            dataKey = cog.get(dataKeys, true);
        }
        if (targetKeys instanceof cog.observable || typeof targetKeys === "function") {
            targetKey = targetKeys;
        } else {
            targetKey = cog.get(targetKeys, true);
        }
        if (dataKey instanceof cog.observable && dataKey[cog.keyword.bound].indexOf(targetKey) !== -1) {
            dataKey[cog.keyword.bound].splice(dataKey[cog.keyword.bound].indexOf(targetKey), 1);
        }
        if (targetKey instanceof cog.observable && targetKey[cog.keyword.bound].indexOf(dataKey) !== -1) {
            targetKey[cog.keyword.bound].splice(targetKey[cog.keyword.bound].indexOf(dataKey), 1);
        }
    }
};
cog.get = function (keys, ob, exec) {
    var i, key, keysLength, ref, refType, lastKey;
    if (keys instanceof cog.observable) {
        if (ob) { return keys; }
        ref = keys;
        refType = ref[cog.keyword.type];
        if (refType !== 'object' && refType !== 'array') {
            ref = ref[cog.keyword.get](exec);
        }
    } else {
        ref = cog.data;
        if (ob == null) { ob = false; }
        if (typeof keys === 'string') {
            keys = keys.split(".");
        }
        keysLength = keys.length;
        lastKey = keys[keysLength - 1];
        if (lastKey == cog.keyword.this || (ob && (lastKey == cog.keyword.index || lastKey == cog.keyword.length))) {
            keys.pop();
            return cog.get(keys, true);
        }
        for (i = 0; i < keysLength; i++) {
            key = keys[i];
            if (!ref.hasOwnProperty(key)) {
                if (ref instanceof cog.observable) {
                    ref[cog.keyword.set]({}, key);
                } else {
                    ref[key] = {};
                }
            }
            ref = ref[key];
        }
        if (!ob && ref instanceof cog.observable) {
            ref = ref[cog.keyword.get](exec);
        }
    }
    return ref;
};
cog.set = function (keys, val, exec) {
    var i, key, keysLength, ref, parent;
    if (exec == null) { exec = false; }
    if (exec) { val = val(cog.get(keys, true)); }
    if (keys instanceof cog.observable) {
        ref = keys;
        key = ref[cog.keyword.key];
        parent = ref[cog.keyword.parent];
        parent[key] = val;
    } else {
        ref = cog.data;
        if (typeof keys === 'string') {
            keys = keys.split(".");
        }
        keysLength = keys.length;
        for (i = 0; i < keysLength; i++) {
            key = keys[i];
            if (i == keysLength - 1) {
                if (!ref.hasOwnProperty(key) && ref instanceof cog.observable) {
                    ref[cog.keyword.set](val, key);
                } else {
                    ref[key] = val;
                }
            } else {
                if (!ref.hasOwnProperty(key)) {
                    if (ref instanceof cog.observable) {
                        ref[cog.keyword.set]({}, key);
                    } else {
                        ref[key] = {};
                    }
                }
                ref = ref[key];
            }
        }
    }
};
cog.template = function (arg) {
    var i, ii, iii, iiii, node, nodes = [], tempNodeAttrs, tempNodeAttrsLen, tempNodeAttr, splitNodeContent, attrContentNodes, pureToken, token, idx, parent, oldNode, nodeAttr, nodeAttrs, aliasKeysLength, aliasKeys, aliasKey, aliasKeyArr, aliasKeyArrLength, aliasKeyArrResult, aliasReplace, aliasNode, aliasNodeItem, alias, tempNode, props, prop, cloneNode, newNode, tokenArr, attrContent, attrKey, attrVal, nodeSplitTokens;
    if (arg.id == null) { return; }
    if (arg.fragment == null) { arg.fragment = false; }
    if (arg.bind == null) { arg.bind = false; }
    if (cog.templates[arg.id] == null && arg.node != null) {
        cog.templates[arg.id] = { alias: {}, props: [], node: arg.node.cloneNode(true) };
        tempNode = cog.templates[arg.id]["node"];
        tempNode.removeAttribute(cog.label.repeat);
        tempNode.removeAttribute(cog.label.set);
        if (arg.alias != null) {
            aliasKeysLength = arg.alias.length;
            for (i = 0; i < aliasKeysLength; i++) {
                cog.templates[arg.id]["alias"][arg.alias[i]] = [];
            }
            alias = cog.templates[arg.id]["alias"];
            props = cog.templates[arg.id]["props"];
            aliasKeys = arg.alias;
            nodes = cog.filterNodes(tempNode, NodeFilter.SHOW_TEXT + NodeFilter.SHOW_ELEMENT, function (node) {
                if (node.nodeType === Node.TEXT_NODE && cog.regex.token.test(node.nodeValue)) {
                    return NodeFilter.FILTER_ACCEPT;
                } else if (node.hasAttribute && !node.hasAttribute(cog.label.escapeTag) && node.tagName !== 'SCRIPT') {
                    return NodeFilter.FILTER_ACCEPT;
                } else {
                    return NodeFilter.FILTER_REJECT;
                }
            }, true);
            i = 0;
            while (node = nodes[i]) {
                if (node.nodeType === Node.TEXT_NODE) {
                    splitNodeContent = cog.splitTokens(node.nodeValue, true);
                    for (pureToken in splitNodeContent) {
                        token = cog.token.open + pureToken + cog.token.close;
                        idx = node.nodeValue.indexOf(token);
                        if (idx === -1) { continue; }
                        oldNode = node.splitText(idx);
                        oldNode.nodeValue = oldNode.nodeValue.replace(token, '');
                        parent = node.parentNode;
                        tokenArr = pureToken.split(".");
                        aliasKeyArrResult = false;
                        for (ii = 0; ii < aliasKeysLength; ii++) {
                            aliasKey = aliasKeys[ii];
                            aliasKeyArr = aliasKey.split(".");
                            aliasKeyArrLength = aliasKeyArr.length;
                            for (iii = 0; iii < aliasKeyArrLength; iii++) {
                                if (aliasKeyArr[iii] != tokenArr[iii]) {
                                    break;
                                }
                                if (iii == aliasKeyArrLength - 1) {
                                    aliasKeyArrResult = true;
                                }
                            }
                            if (aliasKeyArrResult) {
                                break;
                            }
                        }
                        if (aliasKeyArrResult) {
                            newNode = document.createTextNode(aliasKey);
                            parent.insertBefore(document.createTextNode(cog.token.open), oldNode);
                            parent.insertBefore(newNode, oldNode);
                            parent.insertBefore(document.createTextNode(pureToken.replace(aliasKey, '')), oldNode);
                            parent.insertBefore(document.createTextNode(cog.token.close), oldNode);
                            alias[aliasKey].push(newNode);
                        } else {
                            parent.insertBefore(document.createTextNode(token), oldNode);
                        }
                        if (cog.regex.token.test(oldNode.nodeValue)) {
                            nodes.splice(i + 1, 0, oldNode);
                        } else {
                            break;
                        }
                    }
                } else {
                    nodeAttrs = node.attributes;
                    for (ii = 0; ii < nodeAttrs.length; ii++) {
                        nodeAttr = nodeAttrs[ii];
                        attrKey = nodeAttr.name;
                        attrVal = nodeAttr.value;
                        if (cog.regex.token.test(attrVal)) {
                            attrContent = document.createElement("span");
                            attrContent.textContent = attrVal;
                            nodeSplitTokens = cog.splitTokens(attrVal, true);
                            props.push({ node: node, attr: attrKey });
                            prop = props[props.length - 1];
                            attrContentNodes = cog.filterNodes(attrContent, NodeFilter.SHOW_TEXT, function (node) {
                                if (cog.regex.token.test(node.nodeValue)) {
                                    return NodeFilter.FILTER_ACCEPT;
                                } else {
                                    return NodeFilter.FILTER_REJECT;
                                }
                            }, false);
                            cog.replaceTextNode(attrContentNodes, nodeSplitTokens, function (token, pureToken, content, parent, oldNode) {
                                tokenArr = pureToken.split(".");
                                aliasKeyArrResult = false;
                                for (iii = 0; iii < aliasKeysLength; iii++) {
                                    aliasKey = aliasKeys[iii];
                                    aliasKeyArr = aliasKey.split(".");
                                    aliasKeyArrLength = aliasKeyArr.length;
                                    for (iiii = 0; iiii < aliasKeyArrLength; iiii++) {
                                        if (aliasKeyArr[iiii] != tokenArr[iiii]) {
                                            break;
                                        }
                                        if (iiii == aliasKeyArrLength - 1) {
                                            aliasKeyArrResult = true;
                                        }
                                    }
                                    if (aliasKeyArrResult) {
                                        break;
                                    }
                                }
                                if (aliasKeyArrResult) {
                                    newNode = document.createTextNode(aliasKey);
                                    if (attrKey == cog.label.repeat || attrKey == cog.label.temp) {
                                        parent.insertBefore(newNode, oldNode);
                                        parent.insertBefore(document.createTextNode(pureToken.replace(aliasKey, '')), oldNode);
                                    } else {
                                        parent.insertBefore(document.createTextNode(cog.token.open), oldNode);
                                        parent.insertBefore(newNode, oldNode);
                                        parent.insertBefore(document.createTextNode(pureToken.replace(aliasKey, '')), oldNode);
                                        parent.insertBefore(document.createTextNode(cog.token.close), oldNode);
                                    }
                                    alias[aliasKey].push({ prop: prop, node: newNode });
                                } else {
                                    parent.insertBefore(document.createTextNode(token), oldNode);
                                }
                            });
                            node.setAttribute(attrKey, attrContent.textContent);
                            prop["content"] = attrContent;
                        }
                    }
                }
                i++;
            }
        }
    }
    if (cog.templates[arg.id] != null && arg.node == null) {
        tempNode = cog.templates[arg.id]["node"];
        if (arg.data != null) {
            alias = cog.templates[arg.id]["alias"];
            aliasKeys = Object.keys(alias);
            aliasKeysLength = aliasKeys.length;
            for (i = 0; i < aliasKeysLength; i++) {
                aliasKey = aliasKeys[i];
                if (arg.data.hasOwnProperty(aliasKey)) {
                    aliasReplace = arg.data[aliasKey];
                    aliasNode = alias[aliasKey];
                    for (ii in aliasNode) {
                        aliasNodeItem = aliasNode[ii];
                        if (aliasNodeItem.hasOwnProperty("prop")) {
                            newNode = document.createTextNode(aliasReplace);
                            aliasNodeItem.node.parentNode.replaceChild(newNode, aliasNodeItem.node);
                            aliasNode[ii].node = newNode;
                            prop = aliasNodeItem.prop;
                            prop.node.setAttribute(prop.attr, prop.content.innerHTML);
                        } else {
                            newNode = document.createTextNode(aliasReplace);
                            aliasNodeItem.parentNode.replaceChild(newNode, aliasNodeItem);
                            aliasNode[ii] = newNode;
                        }
                    }
                }
            }
        }
        cloneNode = document.createElement(tempNode.tagName);
        tempNodeAttrs = tempNode.attributes;
        tempNodeAttrsLen = tempNodeAttrs.length
        for (i = 0; i < tempNodeAttrsLen; i++) {
            tempNodeAttr = tempNodeAttrs[i];
            cloneNode.setAttribute(tempNodeAttr.name, tempNodeAttr.value);
        }
        cloneNode.innerHTML = tempNode.innerHTML;
        if (arg.bind) {
            cloneNode = cog.bind(cloneNode);
        }
        if (arg.fragment) {
            return cog.elemFragment(cloneNode);
        } else {
            return cloneNode;
        }
    }
};
cog.setElems = function (callback) {
    cog.loadContents(function () {
        var setElem, setAttr, setAttrSplit, setType, setKey, propData, setKeys, setTemp, setTempId, setTempAlias, i, links = document.getElementsByTagName("link"), link, heads = document.querySelectorAll("[" + cog.label.head + "]"), head, tempNode, tempAttr, tempId, tempAlias;
        while (tempNode = document.querySelector("[" + cog.label.repeat + "]:not([" + cog.label.await + "])")) {
            tempNode.setAttribute(cog.label.await, "");
            if (tempNode.innerHTML.trim() !== "") {
                tempAttr = tempNode.getAttribute(cog.label.repeat).split(";");
                tempId = tempAttr[0].trim();
                tempAlias = tempAttr[1].split(",");
                i = 0;
                while (typeof tempAlias[i] !== 'undefined') {
                    tempAlias[i] = tempAlias[i].trim();
                    i++;
                }
                if (!cog.templates.hasOwnProperty(tempId)) {
                    cog.template({ id: tempId, node: tempNode, alias: tempAlias });
                }
            }
        }
        while (tempNode = document.querySelector("[" + cog.label.repeat + "][" + cog.label.await + "]")) {
            tempNode.removeAttribute(cog.label.await);
            tempNode.innerHTML = "";
        }
        for (i = 0; i < links.length; i++) {
            link = links[i];
            document.head.appendChild(link);
            link.href = link.href;
        }
        for (i = 0; i < heads.length; i++) {
            head = heads[i];
            head.removeAttribute(cog.label.head);
            document.head.appendChild(head);
        }
        while (setElem = document.querySelector("[" + cog.label.set + "]")) {
            setAttr = setElem.getAttribute(cog.label.set);
            setAttrSplit = setAttr.split(":");
            setType = setAttrSplit[0].trim();
            setKey = setAttrSplit[1].trim();
            setKeys = setKey.split(".");
            if (setType == "json") {
                propData = cog.isJSON(setElem.textContent);
                if (propData) {
                    cog.set(setKeys, propData);
                }
            } else if (setType == "raw") {
                propData = cog.eval("(" + setElem.textContent + ")");
                cog.set(setKeys, propData);
            } else if (setType == "text") {
                cog.set(setKeys, setElem.textContent);
            } else if (setType == "html") {
                cog.extractAssets(setElem);
                cog.set(setKeys, cog.elemFragment(setElem));
            } else if (setType == "temp") {
                cog.extractAssets(setElem);
                setTemp = setKey.split(";");
                setTempId = setTemp[0].trim();
                if (setTemp[1]) {
                    setTempAlias = setTemp[1].split(",");
                    i = 0;
                    while (typeof setTempAlias[i] !== 'undefined') {
                        setTempAlias[i] = setTempAlias[i].trim();
                        i++;
                    }
                } else {
                    setTempAlias = null;
                }
                cog.template({ id: setTempId, node: setElem, alias: setTempAlias });
            }
            setElem.parentNode.removeChild(setElem);
        }
        if (typeof callback === 'function') {
            callback();
        }
    });
};
cog.templateRoot = function (node, tempId) {
    if ((tempId == null && node.hasAttribute(cog.label.id)) || (tempId != null && node.getAttribute && node.getAttribute(cog.label.id) === tempId)) {
        return node;
    }
    var i, ids = cog.ids[tempId], idsLen = ids.length, id;
    for (i = 0; i < idsLen; i++) {
        id = ids[i];
        if (cog.isChild(id, node)) {
            return id;
        }
    }
};
cog.templateData = function (node, tempId, all) {
    var root = cog.templateRoot(node, tempId);
    if (!cog.isElement(root) || !root.hasAttribute(cog.label.data)) { return; }
    if (all == null) { all = false; }
    var i, data = root.getAttribute(cog.label.data).split(","), dataLen = data.length, result;
    if (all) {
        result = [];
        for (i = 0; i < dataLen; i++) {
            result.push(cog.get(data[i], true));
        }
    } else {
        result = cog.get(data[0], true);
    }
    return result;
};
cog.defineTempAttrs = function (node, id, data) {
    node.setAttribute(cog.label.id, id);
    if (data != null) { node.setAttribute(cog.label.data, data.join(",")); }
    if (!cog.id.hasOwnProperty(id) || !cog.ids.hasOwnProperty(id)) {
        Object.defineProperty(cog.id, id, {
            configurable: false,
            enumerable: false,
            get: function () {
                return document.querySelector('[' + cog.label.id + '="' + id + '"]')
            }
        });
        Object.defineProperty(cog.ids, id, {
            configurable: false,
            enumerable: false,
            get: function () {
                return document.querySelectorAll('[' + cog.label.id + '="' + id + '"]')
            }
        });
    }
};
cog.observable = function (value, callback, parent) {
    if (value instanceof cog.observable) { return value; }
    var _self = this, _init = false, _innerNodes = {}, _obType;
    _innerNodes[cog.keyword.index] = [];
    _innerNodes[cog.keyword.length] = [];
    if (typeof callback !== 'function') {
        callback = function () { };
    }
    Object.defineProperty(_self, "defineNewObservable", {
        configurable: false,
        enumerable: false,
        writable: false,
        value: function (key, val, func) {
            var i, type, definee, valType;
            if (typeof func === 'function') {
                if (val instanceof cog.observable) {
                    val = new cog.observable(val[cog.keyword.get](), callback, _self);
                } else {
                    val = new cog.observable(val, callback, _self);
                }
                func(val);
                return val;
            } else {
                definee = _self[cog.keyword.value][key];
                if (definee instanceof cog.observable) {
                    type = definee[cog.keyword.type];
                    valType = cog.checkType(val);
                    if (valType === 'array' || valType === 'object') {
                        if (val instanceof cog.observable) {
                            val = new cog.observable(val[cog.keyword.get](), callback, _self);
                        } else {
                            val = new cog.observable(val, callback, _self);
                        }
                        if (type !== valType) {
                            for (i in definee) {
                                delete definee[i];
                            }
                            if (valType === 'array') {
                                definee[cog.keyword.value] = [];
                            } else {
                                definee[cog.keyword.value] = {};
                            }
                        }
                        definee[cog.keyword.iterate](function (ob, obKeys) {
                            if (obKeys.length > 0) {
                                var obExists = true, obVal = val, obType, i, ii, obKey;
                                i = 0;
                                while (typeof obKeys[i] !== 'undefined') {
                                    obKey = obKeys[i];
                                    if (obVal[cog.keyword.value].hasOwnProperty(obKey)) {
                                        obVal = obVal[cog.keyword.value][obKey];
                                    } else {
                                        obExists = false;
                                        if (ob[cog.keyword.parent][cog.keyword.type] === 'array') {
                                            for (ii = obKey; ii < ob[cog.keyword.parent].length; ii++) {
                                                delete ob[cog.keyword.parent][ii];
                                            }
                                            ob[cog.keyword.parent][cog.keyword.value].splice(obKey, ob[cog.keyword.parent].length - obKey);
                                        } else {
                                            delete ob[cog.keyword.parent][obKey];
                                            delete ob[cog.keyword.parent][cog.keyword.value][obKey];
                                        }
                                        break;
                                    }
                                    i++;
                                }
                                if (obExists) {
                                    obType = ob[cog.keyword.type];
                                    if (obType !== 'array' && obType !== 'object') {
                                        ob[cog.keyword.value] = obVal[cog.keyword.value];
                                    }
                                }
                            }
                        });
                        val[cog.keyword.iterate](function (ob, obKeys) {
                            if (obKeys.length > 0) {
                                var obVal = definee, i, obNew, obKey;
                                i = 0;
                                while (typeof obKeys[i] !== 'undefined') {
                                    obKey = obKeys[i];
                                    if (obVal[cog.keyword.value].hasOwnProperty(obKey)) {
                                        obVal = obVal[cog.keyword.value][obKey];
                                    } else {
                                        obNew = new cog.observable(ob[cog.keyword.get](), callback, obVal);
                                        if (obVal[cog.keyword.type] === 'array') {
                                            obNew[cog.keyword.index] = obKey;
                                        }
                                        obVal[cog.keyword.value][obKey] = obNew;
                                        obVal.defineNewProperty(obKey);
                                        break;
                                    }
                                    i++;
                                }
                            }
                        });
                    } else if (type !== 'array' && type !== 'object' && valType !== 'array' && valType !== 'object') {
                        if (val instanceof cog.observable) {
                            val = val[cog.keyword.get]();
                        }
                        definee[cog.keyword.value] = val;
                    } else if ((type === 'array' || type === 'object') && (valType !== 'array' && valType !== 'object')) {
                        for (i in definee) {
                            delete definee[i];
                        }
                        if (val instanceof cog.observable) {
                            val = val[cog.keyword.get]();
                        }
                        definee[cog.keyword.value] = val;
                    }
                    return definee;
                } else {
                    if (val instanceof cog.observable) {
                        val = new cog.observable(val[cog.keyword.get](), callback, _self);
                    } else {
                        val = new cog.observable(val, callback, _self);
                    }
                    _self[cog.keyword.value][key] = val;
                    return val;
                }
            }
        }
    });
    Object.defineProperty(_self, "defineNewProperty", {
        configurable: false,
        enumerable: false,
        writable: false,
        value: function (key) {
            if (!_self.hasOwnProperty(key)) {
                Object.defineProperty(_self, key, {
                    configurable: true,
                    enumerable: true,
                    get: function () {
                        return _self[cog.keyword.value][key];
                    },
                    set: function (val) {
                        _self[cog.keyword.set].apply(_self, [val, key]);
                    }
                });
            }
        }
    });
    Object.defineProperty(_self, cog.keyword.token, {
        configurable: false,
        enumerable: false,
        get: function () {
            return _self[cog.keyword.keys].join(".");
        }
    });
    Object.defineProperty(_self, cog.keyword.keys, {
        configurable: false,
        enumerable: false,
        get: function () {
            var keys = [], selfChildren = _self;
            _self[cog.keyword.iterateParent](function (selfParent) {
                keys.unshift(cog.getKeyByValue(selfParent[cog.keyword.value], selfChildren));
                selfChildren = selfParent;
            });
            return keys;
        }
    });
    Object.defineProperty(_self, cog.keyword.key, {
        configurable: false,
        enumerable: false,
        get: function () {
            var key;
            if (_self[cog.keyword.parent]) {
                key = cog.getKeyByValue(_self[cog.keyword.parent], _self);
            }
            return key;
        }
    });
    Object.defineProperty(_self, cog.keyword.get, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: function (exec) {
            var obType = _self[cog.keyword.type], data, i;
            if (exec == null) { exec = false; }
            if (obType === 'array') {
                data = [];
                i = 0;
                while (typeof _self[i] !== 'undefined') {
                    data[i] = _self[i][cog.keyword.get](exec);
                    i++;
                }
                return data;
            } else if (obType === 'object') {
                data = {};
                for (i in _self) {
                    data[i] = _self[i][cog.keyword.get](exec);
                }
                return data
            } else if (exec && obType === 'function') {
                return _self[cog.keyword.value](_self[cog.keyword.parent], _self);
            } else {
                return _self[cog.keyword.value];
            }
        }
    });
    Object.defineProperty(_self, cog.keyword.set, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: function (val, key) {
            var o = _self.defineNewObservable(key, val);
            _self.defineNewProperty(key);
            if (_init) {
                callback({
                    action: "set",
                    value: o[cog.keyword.get](),
                    ob: o
                });
            }
        }
    });
    Object.defineProperty(_self, cog.keyword.iterate, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: function (func, obKeys) {
            if (typeof func === 'function') {
                if (obKeys == null) { obKeys = [] }
                func(_self, obKeys);
                var obType = _self[cog.keyword.type], obKey, i;
                if (obType === 'array') {
                    i = 0;
                    while (typeof _self[cog.keyword.value][i] !== 'undefined') {
                        obKey = i;
                        _self[cog.keyword.value][obKey][cog.keyword.iterate](func, obKeys.concat([obKey]));
                        i++;
                    }
                }
                if (obType === 'object') {
                    for (obKey in _self[cog.keyword.value]) {
                        _self[cog.keyword.value][obKey][cog.keyword.iterate](func, obKeys.concat([obKey]));
                    }
                }
            }
        }
    });
    Object.defineProperty(_self, cog.keyword.iterateParent, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: function (func) {
            if (typeof func === 'function') {
                var parent = _self;
                while (typeof parent[cog.keyword.parent] !== 'undefined') {
                    parent = parent[cog.keyword.parent];
                    func(parent);
                }
            }
        }
    });
    Object.defineProperty(_self, cog.keyword.nodes, {
        configurable: false,
        enumerable: false,
        writable: true,
        value: []
    });
    Object.defineProperty(_self, cog.keyword.index, {
        configurable: false,
        enumerable: false,
        writable: true,
        value: null
    });
    Object.defineProperty(_self, cog.keyword.innerNodes, {
        configurable: false,
        enumerable: false,
        writable: true,
        value: _innerNodes
    });
    Object.defineProperty(_self, cog.keyword.repeats, {
        configurable: false,
        enumerable: false,
        writable: true,
        value: []
    });
    Object.defineProperty(_self, cog.keyword.bound, {
        configurable: false,
        enumerable: false,
        writable: true,
        value: []
    });
    Object.defineProperty(_self, cog.keyword.value, {
        configurable: false,
        enumerable: false,
        writable: true,
        value: null
    });
    Object.defineProperty(_self, cog.keyword.type, {
        configurable: false,
        enumerable: false,
        get: function () {
            return cog.checkType(_self[cog.keyword.value]);
        }
    });
    Object.defineProperty(_self, cog.keyword.this, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: _self
    });
    Object.defineProperty(_self, cog.keyword.parent, {
        configurable: false,
        enumerable: false,
        writable: false,
        value: parent
    });
    Object.defineProperty(_self, cog.keyword.length, {
        configurable: false,
        enumerable: false,
        get: function () {
            if (_self[cog.keyword.value].hasOwnProperty("length")) {
                return _self[cog.keyword.value].length;
            }
        }
    });
    Object.defineProperty(_self, "push", {
        configurable: false,
        enumerable: false,
        writable: false,
        value: function () {
            var index, ln, args = [], valueLength = _self[cog.keyword.value].length, argumentsLength = arguments.length, o, i;
            for (i = 0, ln = argumentsLength; i < ln; i++) {
                index = _self[cog.keyword.value].length;
                o = _self.defineNewObservable(index, arguments[i], function (v) {
                    _self[cog.keyword.value].push(v);
                    v[cog.keyword.index] = index;
                });
                _self.defineNewProperty(index);
                args.push(o[cog.keyword.get]());
            }
            if (_init) {
                callback({
                    action: "push",
                    args: args,
                    index: valueLength,
                    remove: 0,
                    add: argumentsLength,
                    ob: _self
                });
            }
            return _self[cog.keyword.value].length;
        }
    });
    Object.defineProperty(_self, "pop", {
        configurable: false,
        enumerable: false,
        writable: false,
        value: function () {
            var valueLength = _self[cog.keyword.value].length;
            if (valueLength > -1) {
                var index = valueLength - 1,
                    item = _self[cog.keyword.value].pop();
                delete _self[index];
                callback({
                    action: "pop",
                    index: valueLength - 1,
                    remove: 1,
                    add: 0,
                    ob: _self
                });
                return item;
            }
        }
    });
    Object.defineProperty(_self, "reverse", {
        configurable: false,
        enumerable: false,
        writable: false,
        value: function () {
            if (_self[cog.keyword.value].length > -1) {
                var i, item = _self[cog.keyword.value].reverse();
                i = 0;
                while (typeof _self[cog.keyword.value][i] !== 'undefined') {
                    _self[cog.keyword.value][i][cog.keyword.index] = i;
                    i++;
                }
                callback({
                    action: "reverse",
                    ob: _self
                });
                return item;
            }
        }
    });
    Object.defineProperty(_self, "sort", {
        configurable: false,
        enumerable: false,
        writable: false,
        value: function () {
            if (_self[cog.keyword.value].length > -1) {
                var item = _self[cog.keyword.get]();
                item.sort();
                _self[cog.keyword.parent][cog.keyword.set](item, _self[cog.keyword.key]);
                return item;
            }
        }
    });
    Object.defineProperty(_self, "unshift", {
        configurable: false,
        enumerable: false,
        writable: false,
        value: function () {
            var i, ii, ln, argumentsLength = arguments.length, args = [], o;
            for (i = 0, ln = argumentsLength; i < ln; i++) {
                o = _self.defineNewObservable(i, arguments[i], function (v) {
                    _self[cog.keyword.value].splice(i, 0, v);
                    ii = 0;
                    while (typeof _self[cog.keyword.value][ii] !== 'undefined') {
                        _self[cog.keyword.value][ii][cog.keyword.index] = ii;
                        ii++;
                    }
                });
                _self.defineNewProperty(_self[cog.keyword.value].length - 1);
                args.push(o[cog.keyword.get]());
            }
            callback({
                action: "unshift",
                args: args,
                index: 0,
                remove: 0,
                add: argumentsLength,
                ob: _self
            });
            return _self[cog.keyword.value].length;
        }
    });
    Object.defineProperty(_self, "shift", {
        configurable: false,
        enumerable: false,
        writable: false,
        value: function () {
            if (_self[cog.keyword.value].length > -1) {
                var i, item = _self[cog.keyword.value].shift();
                delete _self[_self[cog.keyword.value].length];
                i = 0;
                while (typeof _self[cog.keyword.value][i] !== 'undefined') {
                    _self[cog.keyword.value][i][cog.keyword.index] = i;
                    i++;
                }
                callback({
                    action: "shift",
                    index: 0,
                    remove: 1,
                    add: 0,
                    ob: _self
                });
                return item;
            }
        }
    });
    Object.defineProperty(_self, "splice", {
        configurable: false,
        enumerable: false,
        writable: false,
        value: function (index, howMany) {
            index = parseInt(index), howMany = parseInt(howMany);
            var removed = [], item, args = [index, howMany], valueLength = _self[cog.keyword.value].length, o, i, ln;
            index = index == null ? 0 : index < 0 ? valueLength + index : index;
            howMany = howMany == null ? valueLength - index : howMany > 0 ? howMany : 0;
            var pargs = [index, howMany];
            while (howMany--) {
                item = _self[cog.keyword.value].splice(index, 1)[0];
                removed.push(item);
                delete _self[_self[cog.keyword.value].length];
            }
            for (i = 2, ln = arguments.length; i < ln; i++) {
                o = _self.defineNewObservable(index, arguments[i], function (v) {
                    _self[cog.keyword.value].splice(index, 0, v);
                });
                _self.defineNewProperty(_self[cog.keyword.value].length - 1);
                args.push(o[cog.keyword.get]());
                index++;
            }
            for (i = args[0], ln = _self[cog.keyword.value].length; i < ln; i++) {
                _self[cog.keyword.value][i][cog.keyword.index] = i;
            }
            callback({
                action: "splice",
                args: args,
                index: pargs[0],
                remove: pargs[1],
                add: arguments.length - 2 < 0 ? 0 : arguments.length - 2,
                ob: _self
            });
            return removed;
        }
    });
    Object.defineProperty(_self, "length", {
        configurable: false,
        enumerable: false,
        get: function () {
            return _self[cog.keyword.value].length;
        },
        set: function (val) {
            var n = Number(val);
            var length = _self[cog.keyword.value].length;
            if (n % 1 === 0 && n >= 0) {
                if (n < length) {
                    _self.splice(n);
                } else if (n > length) {
                    _self.push.apply(_self, new Array(n - length));
                }
            }
            _self[cog.keyword.value].length = n;
            return val;
        }
    });
    Object.getOwnPropertyNames(Array.prototype).forEach(function (name) {
        if (!(name in _self)) {
            Object.defineProperty(_self, name, {
                configurable: false,
                enumerable: false,
                writable: false,
                value: Array.prototype[name]
            });
        }
    });
    if (parent && parent[cog.keyword.type] === 'array') {
        _self[cog.keyword.index] = parent[cog.keyword.value].indexOf(_self);
    }
    _obType = cog.checkType(value);
    if (_obType === 'array') {
        _self[cog.keyword.value] = [];
        _self.push.apply(_self, value);
    } else if (_obType === 'object') {
        _self[cog.keyword.value] = {};
        var i;
        for (i in value) {
            _self.defineNewObservable(i, value[i]);
            _self.defineNewProperty(i);
        }
    } else {
        _self[cog.keyword.value] = value;
    }
    _init = true;
};
cog.checkType = function (input) {
    var typeString = Object.prototype.toString.call(input);
    return typeString.slice(8, typeString.length - 1).toLowerCase();
};
cog.getLastKey = function (keys) {
    if (typeof keys === 'string') {
        keys = keys.split(".");
    }
    return keys[keys.length - 1];
};
cog.getKeyByValue = function (obj, val) {
    if (Array.isArray(obj)) {
        return obj.indexOf(val);
    } else {
        var key;
        for (key in obj) {
            if (obj.hasOwnProperty(key)) {
                if (obj[key] === val) {
                    return key;
                }
            }
        }
    }
};
cog.isChild = function (parent, child) {
    var node = child;
    while (node) {
        if (node === parent) {
            return true;
        }
        node = node.parentNode;
    }
    return false;
};
cog.isInDocument = function (node) {
    return cog.isChild(document.body.parentNode, node);
};
cog.pushNode = function (keys, ob, node) {
    if (!(ob instanceof cog.observable)) { return; }
    var lastKey = cog.getLastKey(keys);
    if (lastKey == cog.keyword.index || lastKey == cog.keyword.length) {
        ob[cog.keyword.innerNodes][lastKey].push(node);
    } else {
        ob[cog.keyword.nodes].push(node);
    }
};
cog.propCondition = function (obj) {
    if (obj && obj.hasOwnProperty("if")) {
        if (cog.if(obj.if[0])) {
            return cog.propCondition(obj.if[1]);
        } else {
            if (typeof obj.if[2] !== 'undefined') {
                return cog.propCondition(obj.if[2]);
            } else {
                return false;
            }
        }
    } else {
        return obj;
    }
};
cog.replaceText = function (str) {
    var replace = cog.splitTokens(str), pureToken, token, content, result = str;
    for (pureToken in replace) {
        token = cog.token.open + pureToken + cog.token.close;
        if (str.indexOf(token) === -1) { continue; }
        content = replace[pureToken];
        result = result.replace(token, content);
    }
    return result;
};
cog.replaceTextNode = function (nodes, replace, callback) {
    var i = 0, node, idx, oldNode, token, content, pureToken;
    while (node = nodes[i]) {
        for (pureToken in replace) {
            token = cog.token.open + pureToken + cog.token.close;
            idx = node.nodeValue.indexOf(token);
            if (idx === -1) { continue; }
            content = replace[pureToken];
            oldNode = node.splitText(idx);
            oldNode.nodeValue = oldNode.nodeValue.replace(token, '');
            callback(token, pureToken, content, node.parentNode, oldNode);
            if (cog.regex.token.test(oldNode.nodeValue)) {
                nodes.splice(i + 1, 0, oldNode);
            } else {
                break;
            }
        }
        i++;
    }
};
cog.filterNodes = function (elem, show, filter, root) {
    var nodes = [];
    if (root == null) { root = false; }
    var iterator = document.createTreeWalker(elem, show, filter, false);
    if (root) {
        nodes.push(iterator.root);
    }
    while (iterator.nextNode()) {
        nodes.push(iterator.currentNode);
    }
    return nodes;
};
cog.splitTokens = function (str, isList) {
    var m, result = {}, content;
    if (isList == null) { isList = false; }
    cog.regex.node.lastIndex = 0;
    while ((m = cog.regex.node.exec(str)) !== null) {
        if (m.index === cog.regex.node.lastIndex) {
            cog.regex.node.lastIndex++;
        }
        if (m[0] != "") {
            if (m[1] !== undefined && !result.hasOwnProperty(m[0])) {
                if (isList) {
                    result[m[1]] = "";
                } else {
                    content = cog.get(m[1], false, true);
                    result[m[1]] = content;
                }
            }
        }
    }
    return result;
};
cog.prepareTokenStr = function (str) {
    var m, result = [], content, lastKey;
    cog.regex.node.lastIndex = 0;
    while ((m = cog.regex.node.exec(str)) !== null) {
        if (m.index === cog.regex.node.lastIndex) {
            cog.regex.node.lastIndex++;
        }
        if (m[0] != "") {
            if (m[1] !== undefined) {
                content = cog.get(m[1], true);
                if (content !== undefined) {
                    lastKey = cog.getLastKey(m[1]);
                    if (lastKey == cog.keyword.index || lastKey == cog.keyword.length || lastKey == cog.keyword.this) {
                        result.push({ ob: content, keyword: lastKey });
                    } else {
                        result.push({ ob: content });
                    }
                }
            } else {
                result.push(m[0]);
            }
        }
    }
    return result;
};
cog.constructTokenStr = function (arr, content) {
    var i, val, result = "";
    if (content == null) { content = false; }
    for (i = 0; i < arr.length; i++) {
        val = arr[i];
        if (typeof val === 'object') {
            if (content) {
                if (val.keyword) {
                    result = result + val.ob[val.keyword];
                } else {
                    result = result + val.ob[cog.keyword.get](true);
                }
            } else {
                result = result + 'cog.get("' + val.ob[cog.keyword.token];
                if (val.keyword) {
                    result = result + "." + val.keyword;
                }
                result = result + '", false, true)';
            }
        } else {
            result = result + val;
        }
    }
    return result;
};
cog.shallowClone = function (obj) {
    if (typeof obj === 'object') {
        if (Array.isArray(obj)) {
            return obj.slice();
        } else {
            var clone = {};
            for (var key in obj) {
                clone[key] = obj[key];
            }
            return clone;
        }
    } else {
        return obj;
    }
};
cog.scrollToHash = function () {
    var hash = window.location.hash.slice(1);
    if (hash && document.getElementById(hash)) {
        document.getElementById(hash).scrollIntoView();
    }
};
cog.extractAssets = function (elem) {
    if (elem == null) { elem = document; }
    var i, links = elem.getElementsByTagName("link"), link, styles = elem.getElementsByTagName("style"), style, scripts = elem.getElementsByTagName("script"), script;
    for (i = 0; i < links.length; i++) {
        link = links[i];
        document.head.appendChild(link);
        link.href = link.href;
    }
    for (i = 0; i < styles.length; i++) {
        style = styles[i];
        document.head.appendChild(style);
    }
    for (i = 0; i < scripts.length; i++) {
        script = scripts[i];
        script.setAttribute(cog.label.await, "");
        document.body.appendChild(script);
    }
};
cog.dispatchOnTemplateLoad = function (root, id) {
    if (!cog.isRendered) {
        document.addEventListener(cog.event.afterRender, function () {
            cog.dispatchOnTemplateLoad(root, id);
        });
    } else {
        var dataset = cog.templateData(root, id, true), data;
        if (typeof dataset === "undefined") {
            dataset = [];
            data = null;
        } else {
            data = dataset[0];
        }
        document.dispatchEvent(new CustomEvent(cog.event.onTemplateLoad, {
            "detail": {
                id: id,
                root: root,
                dataset: dataset,
                data: data
            }
        }));
    }
};
cog.addEventProperties = function (elem, prop) {
    var eventName;
    var handleEvent = function (event) {
        var node = event.currentTarget;
        if (typeof node.getAttribute !== 'function') { return; }
        var i, ii, props = cog.constructTokenStr(prop.content), events, eventsValue, setEvents, data;
        propEvents = cog.eval("(" + props + ")");
        if (propEvents) {
            propEventsLen = propEvents.length;
            for (i = 0; i < propEventsLen; i++) {
                events = cog.propCondition(propEvents[i]);
                if (events) {
                    for (ii in events) {
                        eventsValue = events[ii];
                        if (ii == event.type) {
                            if (typeof eventsValue === 'function') {
                                eventsValue(events);
                            } else if (eventsValue instanceof cog.observable && eventsValue[cog.keyword.type] == "function") {
                                eventsValue[cog.keyword.get](true);
                            } else if (typeof eventsValue === 'object') {
                                setEvents = eventsValue;
                                if (!setEvents.hasOwnProperty("data")) {
                                    setEvents.data = "value";
                                }
                                if (typeof node[setEvents.data] !== "undefined") {
                                    data = node[setEvents.data];
                                } else {
                                    data = cog.eval(setEvents.data);
                                }
                                cog.set(setEvents["set"], data);
                            } else {
                                cog.eval(eventsValue);
                            }
                        }
                    }
                }
            }
        }
    };
    for (eventName in elem) {
        if (/^on/.test(eventName)) {
            elem[eventName] = handleEvent;
        }
    }
};
cog.elemFragment = function (elem) {
    var frag = document.createDocumentFragment();
    while (elem.firstChild) {
        frag.appendChild(elem.firstChild);
    }
    return frag;
};
cog.arrFragment = function (frag) {
    var i, len = frag.childNodes.length, arr = [];
    for (i = 0; i < len; i++) {
        arr.push(frag.childNodes[i]);
    }
    return arr;
};
cog.eval = function (str) {
    try { return eval(str); } catch (e) { }
};
cog.if = function (str) {
    if (typeof str === 'string') {
        return cog.eval(str) ? true : false;
    } else {
        return str;
    }
};
cog.isElement = function (elem) {
    return elem instanceof DocumentFragment || elem instanceof Element || elem instanceof HTMLDocument;
};
cog.isJSON = function (str) {
    var o;
    try {
        o = JSON.parse(str);
        if (o && typeof o === "object") {
            return o;
        }
    }
    catch (e) { }
    return false;
};
cog.loadContents = function (callback) {
    var node, nodeAttr, srcObj;
    node = document.querySelector("[" + cog.label.src + "]:not([" + cog.label.await + "])");
    if (node) {
        nodeAttr = node.getAttribute(cog.label.src);
        srcObj = cog.eval("({" + nodeAttr + "})");
        if (typeof srcObj !== "object") {
            srcObj = { url: nodeAttr };
        }
        if (srcObj.text == null || srcObj.text == 'false') {
            srcObj.text = false;
        }
        if (srcObj.cache != null) {
            if (srcObj.cache != 'false') {
                srcObj.cache = true;
            } else {
                srcObj.cache = false;
            }
        }
        if (srcObj.url != null) {
            node.setAttribute(cog.label.await, "");
            cog.xhr(srcObj.url, function (xhr) {
                if (xhr.status == 200) {
                    if (srcObj.text) {
                        if (node.hasAttribute(cog.label.set)) {
                            node.innerHTML = "";
                            node.appendChild(document.createTextNode(xhr.responseText));
                            node.removeAttribute(cog.label.src);
                            node.removeAttribute(cog.label.await);
                        } else {
                            node.parentNode.insertBefore(document.createTextNode(xhr.responseText), node);
                            node.parentNode.removeChild(node);
                        }
                    } else {
                        if (node.hasAttribute(cog.label.set)) {
                            node.innerHTML = xhr.responseText;
                            node.removeAttribute(cog.label.src);
                            node.removeAttribute(cog.label.await);
                        } else {
                            node.outerHTML = xhr.responseText;
                        }
                    }
                }
            }, { method: srcObj.method, data: srcObj.data, type: srcObj.type, cache: srcObj.cache });
            cog.loadContents(callback);
        }
    } else {
        if (typeof callback === 'function') {
            if (!document.querySelector("[" + cog.label.src + "][" + cog.label.await + "]")) {
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
    if (node == null) { node = document.getElementsByTagName("script"); }
    if (i == null) { i = 0; }
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
        for (i = 0; i < keyValuePairs.length; i++) {
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
    if (arg == null) { arg = {}; }
    if (arg.cache == null) { arg.cache = cog.cache; }
    if (arg.method == null) { arg.method = 'GET'; }
    if (arg.data == null) { arg.data = ''; }
    if (arg.async == null) { arg.async = true; }
    var xhr, guid, cacheUrl, hashUrl, key, mergedObj, urlObj;
    arg.method = arg.method.toUpperCase();
    xhr = new XMLHttpRequest();
    if (arg.type != null) {
        xhr.responseType = arg.type;
    }
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            callback(xhr);
        }
    };
    if (arg.method == 'GET' && !arg.cache) {
        guid = Date.now();
        cacheUrl = url.replace(/#.*$/, "");
        hashUrl = url.slice(cacheUrl.length);
        cacheUrl = cacheUrl.replace(/([?&])_=[^&]*/, function (m1, m2) { return m2; });
        hashUrl = ((/\?/).test(cacheUrl) ? "&" : "?") + "_=" + (guid++) + hashUrl;
        url = cacheUrl + hashUrl;
    }
    if (arg.method == 'GET' && arg.data != '') {
        mergedObj = {};
        urlObj = cog.getUrlParams(url);
        for (key in urlObj) { mergedObj[key] = urlObj[key]; }
        for (key in arg.data) { mergedObj[key] = arg.data[key]; }
        url = url.split(/[?#]/)[0] + '?' + cog.urlEncode(mergedObj);
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
    }, { method: "GET" });
};