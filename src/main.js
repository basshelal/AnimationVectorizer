"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const frames_1 = require("./frames");
const path = require("path");
async function main() {
    await frames_1.extractFrames({
        videoFilePath: path.resolve("./res/PIE.avi"),
        framesFolderPath: path.resolve("./out/PIE")
    });
    await frames_1.joinFrames({
        framesFolderPath: path.resolve("./out/PIE"),
        outputFilePath: path.resolve("./out/PIE/output.mp4"),
        frameRate: 1
    });
}
main();
