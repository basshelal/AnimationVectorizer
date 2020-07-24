"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ImageTracer_1 = require("./ImageTracer");
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
    await ImageTracer_1.default({
        inputFile: "./out/PIE/350.png",
        outputFile: "./out.svg"
    });
}
main();
