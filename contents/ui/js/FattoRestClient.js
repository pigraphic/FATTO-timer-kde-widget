.pragma library

// FattoRestClient.js - REST client for FATTO web application in KDE Plasma 6 QML

function getCleanBaseUrl(url) {
    if (!url) return "";
    var trimmed = String(url).trim();
    while (trimmed.endsWith("/")) {
        trimmed = trimmed.slice(0, -1);
    }
    if (!trimmed) return "";
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
        trimmed = "https://" + trimmed;
    }
    return trimmed;
}

function createXHR() {
    if (typeof XMLHttpRequest !== "undefined") {
        return new XMLHttpRequest();
    }
    // Node.js test environment compatibility
    try {
        if (typeof globalThis !== "undefined" && globalThis.XMLHttpRequest) {
            return new globalThis.XMLHttpRequest();
        }
    } catch (e) {}
    return null;
}

function request(method, url, headers, body, callback) {
    var xhr = createXHR();
    if (xhr) {
        xhr.open(method, url, true);
        xhr.setRequestHeader("Content-Type", "application/json");
        xhr.setRequestHeader("Accept", "application/json");
        if (headers) {
            for (var key in headers) {
                if (headers.hasOwnProperty(key)) {
                    xhr.setRequestHeader(key, headers[key]);
                }
            }
        }
        xhr.onreadystatechange = function() {
            if (xhr.readyState === 4) {
                var responseJson = null;
                try {
                    responseJson = JSON.parse(xhr.responseText || "{}");
                } catch (e) {
                    if (typeof callback === "function") {
                        callback(new Error("Invalid JSON response: " + xhr.responseText), null, xhr.status);
                    }
                    return;
                }
                if (xhr.status >= 200 && xhr.status < 300) {
                    if (responseJson && responseJson.ok === false) {
                        var errMsg = responseJson.error ?
                            (responseJson.error.message || responseJson.error) :
                            "Request failed";
                        if (typeof callback === "function") {
                            callback(new Error(errMsg), null, xhr.status);
                        }
                    } else {
                        if (typeof callback === "function") {
                            callback(null, responseJson.data !== undefined ? responseJson.data : responseJson, xhr.status);
                        }
                    }
                } else {
                    var errorMsg = (responseJson && responseJson.error) ?
                        (responseJson.error.message || responseJson.error) :
                        ("HTTP " + xhr.status + (xhr.statusText ? ": " + xhr.statusText : ""));
                    if (typeof callback === "function") {
                        var errObj = new Error(errorMsg);
                        errObj.status = xhr.status;
                        callback(errObj, null, xhr.status);
                    }
                }
            }
        };
        xhr.onerror = function() {
            if (typeof callback === "function") {
                callback(new Error("Network connection error"), null, 0);
            }
        };
        xhr.send(body ? JSON.stringify(body) : null);
    } else if (typeof fetch !== "undefined") {
        // Fallback for environments with global fetch
        var options = {
            method: method,
            headers: Object.assign({
                "Content-Type": "application/json",
                "Accept": "application/json"
            }, headers || {})
        };
        if (body) {
            options.body = JSON.stringify(body);
        }

        fetch(url, options)
            .then(function(res) {
                return res.text().then(function(text) {
                    var responseJson = null;
                    try {
                        responseJson = JSON.parse(text || "{}");
                    } catch (e) {
                        if (typeof callback === "function") {
                            callback(new Error("Invalid JSON response: " + text), null, res.status);
                        }
                        return;
                    }
                    if (res.ok) {
                        if (responseJson && responseJson.ok === false) {
                            var errMsg = responseJson.error ?
                                (responseJson.error.message || responseJson.error) :
                                "Request failed";
                            if (typeof callback === "function") {
                                callback(new Error(errMsg), null, res.status);
                            }
                        } else {
                            if (typeof callback === "function") {
                                callback(null, responseJson.data !== undefined ? responseJson.data : responseJson, res.status);
                            }
                        }
                    } else {
                        var errorMsg = (responseJson && responseJson.error) ?
                            (responseJson.error.message || responseJson.error) :
                            ("HTTP " + res.status + (res.statusText ? ": " + res.statusText : ""));
                        if (typeof callback === "function") {
                            var errObj = new Error(errorMsg);
                            errObj.status = res.status;
                            callback(errObj, null, res.status);
                        }
                    }
                });
            })
            .catch(function(err) {
                if (typeof callback === "function") {
                    callback(err, null, 0);
                }
            });
    } else {
        if (typeof callback === "function") {
            callback(new Error("No HTTP transport available"), null, 0);
        }
    }
}

function login(baseUrl, username, password, callback) {
    var url = getCleanBaseUrl(baseUrl) + "/api/user/login";
    request("POST", url, null, { username: username, password: password }, callback);
}

function refreshToken(baseUrl, token, callback) {
    var url = getCleanBaseUrl(baseUrl) + "/api/user/token/refresh";
    request("POST", url, { "Authorization": "Bearer " + token }, null, callback);
}

function getSchedule(baseUrl, token, dateStr, callback) {
    var url = getCleanBaseUrl(baseUrl) + "/api/kanban/schedule/list?from_date=" +
              encodeURIComponent(dateStr) + "&to_date=" + encodeURIComponent(dateStr);
    request("GET", url, { "Authorization": "Bearer " + token }, null, callback);
}

function getMyTimers(baseUrl, token, callback) {
    var url = getCleanBaseUrl(baseUrl) + "/api/kanban/timer/mine";
    request("GET", url, { "Authorization": "Bearer " + token }, null, callback);
}

function getCardTimer(baseUrl, token, cardId, callback) {
    var url = getCleanBaseUrl(baseUrl) + "/api/kanban/timer/get?id_card=" + encodeURIComponent(cardId);
    request("GET", url, { "Authorization": "Bearer " + token }, null, callback);
}

function getCardSessions(baseUrl, token, cardId, callback) {
    var url = getCleanBaseUrl(baseUrl) + "/api/kanban/timer/sessions?id_card=" + encodeURIComponent(cardId);
    request("GET", url, { "Authorization": "Bearer " + token }, null, callback);
}

function startTimer(baseUrl, token, cardId, callback) {
    var url = getCleanBaseUrl(baseUrl) + "/api/kanban/timer/start";
    request("POST", url, { "Authorization": "Bearer " + token }, { id_card: cardId }, callback);
}

function pauseTimer(baseUrl, token, cardId, callback) {
    var url = getCleanBaseUrl(baseUrl) + "/api/kanban/timer/pause";
    request("POST", url, { "Authorization": "Bearer " + token }, { id_card: cardId }, callback);
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        getCleanBaseUrl: getCleanBaseUrl,
        login: login,
        refreshToken: refreshToken,
        getSchedule: getSchedule,
        getMyTimers: getMyTimers,
        getCardTimer: getCardTimer,
        getCardSessions: getCardSessions,
        startTimer: startTimer,
        pauseTimer: pauseTimer
    };
}
