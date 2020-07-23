"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const utils_1 = require("./utils");
const ffmpegExtractFrames = require("ffmpeg-extract-frames");
async function extractFrames(filePath) {
    utils_1.logD(`Beginning extract frames for ${filePath} on ${utils_1.now()}`);
    await ffmpegExtractFrames({
        input: filePath,
        output: "out/frame-%d.png"
    });
    utils_1.logD(`Finished extract frames for ${filePath} on ${utils_1.now()}`);
}
exports.extractFrames = extractFrames;
