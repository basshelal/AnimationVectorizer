"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron = require("electron");
const moment = require("moment");
exports.momentFormat = "dddd Do MMMM YYYY, HH:mm:ss:SSS";
function now() {
    return moment().format(exports.momentFormat);
}
exports.now = now;
function logD(message, calledFrom = "") {
    if (!electron.app.isPackaged)
        console.log(`${message.toString()}
    ${calledFrom}`);
}
exports.logD = logD;
function logE(message, calledFrom = "") {
    if (!electron.app.isPackaged)
        console.error(`${message.toString()}
    ${calledFrom}`);
}
exports.logE = logE;
function assert(condition, message) {
    if (!electron.app.isPackaged)
        console.assert(condition, message);
}
exports.assert = assert;
