"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron = require("electron");
function logD(message, calledFrom) {
    if (calledFrom === void 0) { calledFrom = ""; }
    if (!electron.app.isPackaged)
        console.log(message.toString() + "\n    " + calledFrom);
}
exports.logD = logD;
function logE(message, calledFrom) {
    if (calledFrom === void 0) { calledFrom = ""; }
    if (!electron.app.isPackaged)
        console.error(message.toString() + "\n    " + calledFrom);
}
exports.logE = logE;
function assert(condition, message) {
    if (!electron.app.isPackaged)
        console.assert(condition, message);
}
exports.assert = assert;
