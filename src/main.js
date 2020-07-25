"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = require("fs");
const fs_extra_1 = require("fs-extra");
const path = require("path");
const utils_1 = require("./utils");
const ImageTracerCLI_1 = require("./ImageTracerCLI");
async function main() {
    /*await extractFrames({
        videoFilePath: path.resolve("./res/PIE.avi"),
        framesFolderPath: path.resolve("./out/PIE")
    })

    await joinFrames({
        framesFolderPath: path.resolve("./out/PIE"),
        outputFilePath: path.resolve("./out/PIE/output.mp4"),
        frameRate: 1
    })*/
    const framesDir = "./out/PIE";
    const frames = fs_1.readdirSync(framesDir)
        .sort()
        .map(it => path.join(framesDir, it));
    fs_extra_1.mkdirpSync("./svg");
    utils_1.logD(`Starting Vectorization at ${utils_1.now()}`);
    await Promise.all(frames.map((file, index) => ImageTracerCLI_1.default({
        inputFile: file,
        outputFile: path.join(`./svg/${index + 1}.svg`),
        args: ["numberofcolors", "64"]
    })));
    utils_1.logD(`Finished Vectorization at ${utils_1.now()}`);
    Electron.app.exit(0);
}
main();
