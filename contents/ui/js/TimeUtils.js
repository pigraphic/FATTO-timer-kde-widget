.pragma library

// TimeUtils.js - Pure helper functions for formatting and date calculations

/**
 * Formats seconds into HH:MM:SS string
 * @param {number} totalSeconds
 * @returns {string}
 */
function formatSeconds(totalSeconds) {
    var secs = Math.max(0, Math.floor(Number(totalSeconds) || 0));
    var hours = Math.floor(secs / 3600);
    var minutes = Math.floor((secs % 3600) / 60);
    var seconds = secs % 60;

    var pad = function(num) {
        return num < 10 ? "0" + num : "" + num;
    };

    return pad(hours) + ":" + pad(minutes) + ":" + pad(seconds);
}

/**
 * Formats a Date object, timestamp, or date string into YYYY-MM-DD
 * @param {Date|number|string} [date]
 * @returns {string}
 */
function formatDateIso(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        date = date ? new Date(date) : new Date();
        if (isNaN(date.getTime())) date = new Date();
    }
    var year = date.getFullYear();
    var month = date.getMonth() + 1;
    var day = date.getDate();

    var pad = function(num) {
        return num < 10 ? "0" + num : "" + num;
    };

    return year + "-" + pad(month) + "-" + pad(day);
}

/**
 * Formats a Date object, timestamp, or date string into a readable header, e.g. "Thursday, 12 Nov"
 * @param {Date|number|string} [date]
 * @returns {string}
 */
function formatHeaderDate(date) {
    if (!(date instanceof Date) || isNaN(date.getTime())) {
        date = date ? new Date(date) : new Date();
        if (isNaN(date.getTime())) date = new Date();
    }
    var days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
    var months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return days[date.getDay()] + ", " + date.getDate() + " " + months[date.getMonth()];
}

/**
 * Checks if two timestamps/dates represent the same calendar day
 * @param {Date|number|string} d1
 * @param {Date|number|string} d2
 * @returns {boolean}
 */
function isSameDay(d1, d2) {
    if (!d1 || !d2) return false;
    var a = d1 instanceof Date ? d1 : new Date(d1);
    var b = d2 instanceof Date ? d2 : new Date(d2);

    if (isNaN(a.getTime()) || isNaN(b.getTime())) return false;

    return a.getFullYear() === b.getFullYear() &&
           a.getMonth() === b.getMonth() &&
           a.getDate() === b.getDate();
}

/**
 * Calculates duration of a session in seconds
 * @param {number} started Epoch ms
 * @param {number|null} [ended] Epoch ms
 * @param {number} [now] Epoch ms
 * @returns {number}
 */
function calculateSessionSeconds(started, ended, now) {
    var startNum = Number(started);
    var endNum = (ended !== null && ended !== undefined) ? Number(ended) : (now !== undefined && now !== null ? Number(now) : Date.now());
    var diff = (endNum - startNum) / 1000;
    return isNaN(diff) || diff < 0 ? 0 : Math.floor(diff);
}

if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        formatSeconds: formatSeconds,
        formatDateIso: formatDateIso,
        formatHeaderDate: formatHeaderDate,
        isSameDay: isSameDay,
        calculateSessionSeconds: calculateSessionSeconds
    };
}
