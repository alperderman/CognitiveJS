var sandbox = {};
sandbox.ui = {};
sandbox.id = {
    loading: "loading",
    shareModal: "shareModal",
    shareToast: "shareToast",
    shareInput: "shareInput",
    shareLimit: "shareLimit",
    btnShare: "btnShare",
    btnShareCopy: "btnShareCopy",
    btnSplit: "btnSplit",
    btnRender: "btnRender",
    preview: "preview",
    code: "code",
    split: "split",
    wrapperCode: "wrapperCode",
    wrapperPreview: "wrapperPreview"
};
sandbox.editor = null;
sandbox.base = null;
sandbox.split = null;
sandbox.param = {
    code: "c",
    source: "s"
};
sandbox.splitDirection = 'horizontal';
sandbox.init = function () {
    sandbox.ui.shareModal = bootstrap.Modal.getOrCreateInstance(document.getElementById(sandbox.id.shareModal));
    sandbox.ui.copyToast = bootstrap.Toast.getOrCreateInstance(document.getElementById(sandbox.id.shareToast));
    sandbox.trimCode();
    sandbox.setupEditor();
    sandbox.setupEvents();
    var url = new URL(window.location.href);
    var urlCode = url.searchParams.get(sandbox.param.code);
    var src = url.searchParams.get(sandbox.param.source);
    if (src != null) {
        sandbox.xhr(src, function (response) {
            sandbox.editor.getSession().setValue(response);
            var path = src.split("/");
            path.pop();
            sandbox.base = path.join("/") + "/";
            sandbox.removeLoading();
            sandbox.render();
        });
    } else {
        if (urlCode != null) {
            sandbox.editor.getSession().setValue(sandbox.decode(urlCode));
        }
        sandbox.removeLoading();
        sandbox.render();
    }
};
sandbox.xhr = function (url, callback) {
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.onreadystatechange = function () {
        if (xhr.readyState == 4) {
            callback(xhr.responseText);
        }
    };
    xhr.send();
};
sandbox.shareModal = function () {
    var url = sandbox.shareCheckLimit();
    if (url) {
        document.getElementById(sandbox.id.shareInput).value = url;
    } else {
        document.getElementById(sandbox.id.shareInput).value = "";
    }
    sandbox.ui.shareModal.show();
};
sandbox.strByteSize = function (str) {
    var b = 0, i = 0, c;
    for (; c = str.charCodeAt(i++); b += c >> 11 ? 3 : c >> 7 ? 2 : 1);
    return b;
};
sandbox.shareCheckLimit = function () {
    var url = sandbox.shareUrl();
    if (sandbox.strByteSize(url) > 4096) {
        document.getElementById(sandbox.id.shareInput).setAttribute("disabled", "");
        document.getElementById(sandbox.id.shareLimit).style.display = "";
        document.getElementById(sandbox.id.btnShareCopy).setAttribute("disabled", "");
        return false;
    } else {
        document.getElementById(sandbox.id.shareInput).removeAttribute("disabled");
        document.getElementById(sandbox.id.shareLimit).style.display = "none";
        document.getElementById(sandbox.id.btnShareCopy).removeAttribute("disabled");
        return url;
    }
};
sandbox.shareUrl = function () {
    return location.protocol + '//' + location.host + location.pathname + "?" + sandbox.param.code + "=" + sandbox.encode(sandbox.editor.getValue());
};
sandbox.copyUrl = function () {
    if (navigator.clipboard) {
        navigator.clipboard.writeText(sandbox.shareUrl());
        sandbox.ui.copyToast.show();
    } else {
        alert("Cannot copy to clipboard, try copying it manually!");
    }
};
sandbox.removeLoading = function () {
    var loading = document.getElementById(sandbox.id.loading);
    loading.parentElement.removeChild(loading);
};
sandbox.trimCode = function () {
    var elem = document.getElementById(sandbox.id.code), html, pattern;
    html = elem.innerHTML;
    pattern = html.match(/\s*\n[\t\s]*/);
    elem.innerHTML = html.replace(new RegExp(pattern, "g"), '\n').trim();
    elem.parentNode.innerHTML = elem.parentNode.innerHTML.trim();
};
sandbox.setupEvents = function () {
    document.getElementById(sandbox.id.btnSplit).onclick = sandbox.toggleSplitDirection;
    document.getElementById(sandbox.id.btnShare).onclick = sandbox.shareModal;
    document.getElementById(sandbox.id.btnShareCopy).onclick = sandbox.copyUrl;
    document.getElementById(sandbox.id.btnRender).onclick = sandbox.render;
};
sandbox.setupEditor = function () {
    sandbox.editor = ace.edit(sandbox.id.code);
    sandbox.editor.setTheme("ace/theme/tomorrow_night");
    sandbox.editor.getSession().setMode("ace/mode/html");
    sandbox.editor.setOptions({
        fontSize: "11pt",
        showLineNumbers: true,
        useWorker: false,
        wrap: true
    });
    sandbox.editor.setShowPrintMargin(false);
    sandbox.editor.setBehavioursEnabled(false);
    if (screen.width > screen.height) {
        sandbox.splitDirection = "horizontal";
    } else {
        sandbox.splitDirection = "vertical";
    }
    sandbox.setupSplit(sandbox.splitDirection);
};
sandbox.toggleSplitDirection = function () {
    if (sandbox.splitDirection == 'vertical') {
        sandbox.setupSplit('horizontal');
    } else {
        sandbox.setupSplit('vertical');
    }
};
sandbox.setupSplit = function (direction) {
    if (direction == 'vertical') {
        if (sandbox.split != null) { sandbox.split.destroy(); }
        document.getElementById(sandbox.id.split).classList.remove("d-flex", "flex-row");
        sandbox.split = Split(["#" + sandbox.id.wrapperCode, "#" + sandbox.id.wrapperPreview], {
            sizes: [50, 50],
            minSize: 0,
            direction: 'vertical',
            onDrag: function () {
                sandbox.editor.resize();
            }
        });
        sandbox.editor.resize();
        sandbox.splitDirection = 'vertical';
    } else {
        if (sandbox.split != null) { sandbox.split.destroy(); }
        document.getElementById(sandbox.id.split).classList.add("d-flex", "flex-row");
        sandbox.split = Split(["#" + sandbox.id.wrapperCode, "#" + sandbox.id.wrapperPreview], {
            sizes: [50, 50],
            minSize: 0,
            direction: 'horizontal',
            onDrag: function () {
                sandbox.editor.resize();
            }
        });
        sandbox.editor.resize();
        sandbox.splitDirection = 'horizontal';
    }
};
sandbox.render = function () {
    var code = sandbox.editor.getValue(), preview = document.getElementById(sandbox.id.preview), baseEl;
    preview.contentWindow.document.open();
    preview.contentWindow.document.write(code);
    if (sandbox.base != null && preview.contentDocument.head.querySelector("base") == null) {
        baseEl = preview.contentDocument.createElement("base");
        baseEl.setAttribute("href", sandbox.base);
        preview.contentDocument.head.appendChild(baseEl);
    }
    preview.contentWindow.document.close();
};
sandbox.strChar = String.fromCharCode;
sandbox.strUri = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+-$";
sandbox.encode = function (input) {
    if (input == null) return "";
    return sandbox.compress(input, 6, function (a) { return sandbox.strUri.charAt(a); });
};
sandbox.decode = function (input) {
    if (input == null) return "";
    if (input == "") return null;
    input = input.replace(/ /g, "+");
    return sandbox.decompress(input.length, 32, function (index) { return sandbox.getBaseValue(sandbox.strUri, input.charAt(index)); });
};
sandbox.baseReverseDic = {};
sandbox.getBaseValue = function (alphabet, character) {
    if (!sandbox.baseReverseDic[alphabet]) {
        sandbox.baseReverseDic[alphabet] = {};
        for (var i = 0; i < alphabet.length; i++) {
            sandbox.baseReverseDic[alphabet][alphabet.charAt(i)] = i;
        }
    }
    return sandbox.baseReverseDic[alphabet][character];
};
sandbox.compress = function (uncompressed, bitsPerChar, getCharFromInt) {
    if (uncompressed == null) return "";
    var i, value,
        context_dictionary = {},
        context_dictionaryToCreate = {},
        context_c = "",
        context_wc = "",
        context_w = "",
        context_enlargeIn = 2,
        context_dictSize = 3,
        context_numBits = 2,
        context_data = [],
        context_data_val = 0,
        context_data_position = 0,
        ii;
    for (ii = 0; ii < uncompressed.length; ii += 1) {
        context_c = uncompressed.charAt(ii);
        if (!Object.prototype.hasOwnProperty.call(context_dictionary, context_c)) {
            context_dictionary[context_c] = context_dictSize++;
            context_dictionaryToCreate[context_c] = true;
        }
        context_wc = context_w + context_c;
        if (Object.prototype.hasOwnProperty.call(context_dictionary, context_wc)) {
            context_w = context_wc;
        } else {
            if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
                if (context_w.charCodeAt(0) < 256) {
                    for (i = 0; i < context_numBits; i++) {
                        context_data_val = (context_data_val << 1);
                        if (context_data_position == bitsPerChar - 1) {
                            context_data_position = 0;
                            context_data.push(getCharFromInt(context_data_val));
                            context_data_val = 0;
                        } else {
                            context_data_position++;
                        }
                    }
                    value = context_w.charCodeAt(0);
                    for (i = 0; i < 8; i++) {
                        context_data_val = (context_data_val << 1) | (value & 1);
                        if (context_data_position == bitsPerChar - 1) {
                            context_data_position = 0;
                            context_data.push(getCharFromInt(context_data_val));
                            context_data_val = 0;
                        } else {
                            context_data_position++;
                        }
                        value = value >> 1;
                    }
                } else {
                    value = 1;
                    for (i = 0; i < context_numBits; i++) {
                        context_data_val = (context_data_val << 1) | value;
                        if (context_data_position == bitsPerChar - 1) {
                            context_data_position = 0;
                            context_data.push(getCharFromInt(context_data_val));
                            context_data_val = 0;
                        } else {
                            context_data_position++;
                        }
                        value = 0;
                    }
                    value = context_w.charCodeAt(0);
                    for (i = 0; i < 16; i++) {
                        context_data_val = (context_data_val << 1) | (value & 1);
                        if (context_data_position == bitsPerChar - 1) {
                            context_data_position = 0;
                            context_data.push(getCharFromInt(context_data_val));
                            context_data_val = 0;
                        } else {
                            context_data_position++;
                        }
                        value = value >> 1;
                    }
                }
                context_enlargeIn--;
                if (context_enlargeIn == 0) {
                    context_enlargeIn = Math.pow(2, context_numBits);
                    context_numBits++;
                }
                delete context_dictionaryToCreate[context_w];
            } else {
                value = context_dictionary[context_w];
                for (i = 0; i < context_numBits; i++) {
                    context_data_val = (context_data_val << 1) | (value & 1);
                    if (context_data_position == bitsPerChar - 1) {
                        context_data_position = 0;
                        context_data.push(getCharFromInt(context_data_val));
                        context_data_val = 0;
                    } else {
                        context_data_position++;
                    }
                    value = value >> 1;
                }


            }
            context_enlargeIn--;
            if (context_enlargeIn == 0) {
                context_enlargeIn = Math.pow(2, context_numBits);
                context_numBits++;
            }
            context_dictionary[context_wc] = context_dictSize++;
            context_w = String(context_c);
        }
    }
    if (context_w !== "") {
        if (Object.prototype.hasOwnProperty.call(context_dictionaryToCreate, context_w)) {
            if (context_w.charCodeAt(0) < 256) {
                for (i = 0; i < context_numBits; i++) {
                    context_data_val = (context_data_val << 1);
                    if (context_data_position == bitsPerChar - 1) {
                        context_data_position = 0;
                        context_data.push(getCharFromInt(context_data_val));
                        context_data_val = 0;
                    } else {
                        context_data_position++;
                    }
                }
                value = context_w.charCodeAt(0);
                for (i = 0; i < 8; i++) {
                    context_data_val = (context_data_val << 1) | (value & 1);
                    if (context_data_position == bitsPerChar - 1) {
                        context_data_position = 0;
                        context_data.push(getCharFromInt(context_data_val));
                        context_data_val = 0;
                    } else {
                        context_data_position++;
                    }
                    value = value >> 1;
                }
            } else {
                value = 1;
                for (i = 0; i < context_numBits; i++) {
                    context_data_val = (context_data_val << 1) | value;
                    if (context_data_position == bitsPerChar - 1) {
                        context_data_position = 0;
                        context_data.push(getCharFromInt(context_data_val));
                        context_data_val = 0;
                    } else {
                        context_data_position++;
                    }
                    value = 0;
                }
                value = context_w.charCodeAt(0);
                for (i = 0; i < 16; i++) {
                    context_data_val = (context_data_val << 1) | (value & 1);
                    if (context_data_position == bitsPerChar - 1) {
                        context_data_position = 0;
                        context_data.push(getCharFromInt(context_data_val));
                        context_data_val = 0;
                    } else {
                        context_data_position++;
                    }
                    value = value >> 1;
                }
            }
            context_enlargeIn--;
            if (context_enlargeIn == 0) {
                context_enlargeIn = Math.pow(2, context_numBits);
                context_numBits++;
            }
            delete context_dictionaryToCreate[context_w];
        } else {
            value = context_dictionary[context_w];
            for (i = 0; i < context_numBits; i++) {
                context_data_val = (context_data_val << 1) | (value & 1);
                if (context_data_position == bitsPerChar - 1) {
                    context_data_position = 0;
                    context_data.push(getCharFromInt(context_data_val));
                    context_data_val = 0;
                } else {
                    context_data_position++;
                }
                value = value >> 1;
            }
        }
        context_enlargeIn--;
        if (context_enlargeIn == 0) {
            context_enlargeIn = Math.pow(2, context_numBits);
            context_numBits++;
        }
    }
    value = 2;
    for (i = 0; i < context_numBits; i++) {
        context_data_val = (context_data_val << 1) | (value & 1);
        if (context_data_position == bitsPerChar - 1) {
            context_data_position = 0;
            context_data.push(getCharFromInt(context_data_val));
            context_data_val = 0;
        } else {
            context_data_position++;
        }
        value = value >> 1;
    }
    while (true) {
        context_data_val = (context_data_val << 1);
        if (context_data_position == bitsPerChar - 1) {
            context_data.push(getCharFromInt(context_data_val));
            break;
        }
        else context_data_position++;
    }
    return context_data.join('');
};
sandbox.decompress = function (length, resetValue, getNextValue) {
    var dictionary = [],
        next,
        enlargeIn = 4,
        dictSize = 4,
        numBits = 3,
        entry = "",
        result = [],
        i,
        w,
        bits, resb, maxpower, power,
        c,
        data = { val: getNextValue(0), position: resetValue, index: 1 };

    for (i = 0; i < 3; i += 1) {
        dictionary[i] = i;
    }
    bits = 0;
    maxpower = Math.pow(2, 2);
    power = 1;
    while (power != maxpower) {
        resb = data.val & data.position;
        data.position >>= 1;
        if (data.position == 0) {
            data.position = resetValue;
            data.val = getNextValue(data.index++);
        }
        bits |= (resb > 0 ? 1 : 0) * power;
        power <<= 1;
    }
    switch (next = bits) {
        case 0:
            bits = 0;
            maxpower = Math.pow(2, 8);
            power = 1;
            while (power != maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                    data.position = resetValue;
                    data.val = getNextValue(data.index++);
                }
                bits |= (resb > 0 ? 1 : 0) * power;
                power <<= 1;
            }
            c = sandbox.strChar(bits);
            break;
        case 1:
            bits = 0;
            maxpower = Math.pow(2, 16);
            power = 1;
            while (power != maxpower) {
                resb = data.val & data.position;
                data.position >>= 1;
                if (data.position == 0) {
                    data.position = resetValue;
                    data.val = getNextValue(data.index++);
                }
                bits |= (resb > 0 ? 1 : 0) * power;
                power <<= 1;
            }
            c = sandbox.strChar(bits);
            break;
        case 2:
            return "";
    }
    dictionary[3] = c;
    w = c;
    result.push(c);
    while (true) {
        if (data.index > length) {
            return "";
        }
        bits = 0;
        maxpower = Math.pow(2, numBits);
        power = 1;
        while (power != maxpower) {
            resb = data.val & data.position;
            data.position >>= 1;
            if (data.position == 0) {
                data.position = resetValue;
                data.val = getNextValue(data.index++);
            }
            bits |= (resb > 0 ? 1 : 0) * power;
            power <<= 1;
        }
        switch (c = bits) {
            case 0:
                bits = 0;
                maxpower = Math.pow(2, 8);
                power = 1;
                while (power != maxpower) {
                    resb = data.val & data.position;
                    data.position >>= 1;
                    if (data.position == 0) {
                        data.position = resetValue;
                        data.val = getNextValue(data.index++);
                    }
                    bits |= (resb > 0 ? 1 : 0) * power;
                    power <<= 1;
                }
                dictionary[dictSize++] = sandbox.strChar(bits);
                c = dictSize - 1;
                enlargeIn--;
                break;
            case 1:
                bits = 0;
                maxpower = Math.pow(2, 16);
                power = 1;
                while (power != maxpower) {
                    resb = data.val & data.position;
                    data.position >>= 1;
                    if (data.position == 0) {
                        data.position = resetValue;
                        data.val = getNextValue(data.index++);
                    }
                    bits |= (resb > 0 ? 1 : 0) * power;
                    power <<= 1;
                }
                dictionary[dictSize++] = sandbox.strChar(bits);
                c = dictSize - 1;
                enlargeIn--;
                break;
            case 2:
                return result.join('');
        }
        if (enlargeIn == 0) {
            enlargeIn = Math.pow(2, numBits);
            numBits++;
        }
        if (dictionary[c]) {
            entry = dictionary[c];
        } else {
            if (c === dictSize) {
                entry = w + w.charAt(0);
            } else {
                return null;
            }
        }
        result.push(entry);
        dictionary[dictSize++] = w + entry.charAt(0);
        enlargeIn--;

        w = entry;

        if (enlargeIn == 0) {
            enlargeIn = Math.pow(2, numBits);
            numBits++;
        }
    }
};