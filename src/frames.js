"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const fs_extra_1 = require("fs-extra");
const ffmpeg_1 = require("./ffmpeg");
async function extractFrames(options) {
    utils_1.logD(`Beginning extract frames for ${options.videoFilePath} on ${utils_1.now()}`);
    fs_extra_1.mkdirpSync(options.framesFolderPath);
    await ffmpeg_1.default("-i", options.videoFilePath, `${options.framesFolderPath}/%d.png`, "-y");
    utils_1.logD(`Finished extract frames for ${options.videoFilePath} on ${utils_1.now()}`);
}
exports.extractFrames = extractFrames;
async function joinFrames(options) {
    if (!options.frameRate)
        options.frameRate = 24;
    utils_1.logD(`Beginning join frames for ${options.framesFolderPath} on ${utils_1.now()}`);
    await ffmpeg_1.default("-framerate", `${options.frameRate}`, "-i", `${options.framesFolderPath}/%d.png`, `${options.outputFilePath}`, "-y");
    utils_1.logD(`Finished join frames for ${options.framesFolderPath} on ${utils_1.now()}`);
}
exports.joinFrames = joinFrames;
