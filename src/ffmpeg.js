"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cp = require("child_process");
const electron = require("electron");
const utils_1 = require("./utils");
const path = require("path");
async function default_1(...args) {
    return new Promise((resolve, reject) => {
        utils_1.logD(`Starting ffmpeg ${args.join(" ")}`);
        const ffmpeg = cp.spawn(path.join(electron.app.getAppPath(), "ffmpeg/bin/ffmpeg"), args);
        ffmpeg.on("message", (msg) => utils_1.logD(`ffmpeg message:, ${msg}`));
        ffmpeg.on("error", (msg) => {
            utils_1.logE(`ffmpeg error: ${msg}`);
            reject(msg);
        });
        ffmpeg.on("close", (status) => {
            if (status !== 0) {
                utils_1.logE(`ffmpeg closed with status ${status}`);
                reject(`ffmpeg closed with status ${status}`);
            }
            else {
                resolve();
            }
        });
        ffmpeg.stdout.on("data", (data) => utils_1.logD(`ffmpeg stdout: ${data}`));
        ffmpeg.stderr.on("data", (data) => utils_1.logE(`ffmpeg stderr: ${data}`));
    });
}
exports.default = default_1;
