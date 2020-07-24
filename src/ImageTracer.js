"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const utils_1 = require("./utils");
async function default_1(options) {
    const process = child_process_1.spawn("node", ["./node_modules/imagetracerjs/nodecli/nodecli", options.inputFile,
        "-outfilename", options.outputFile])
        .on("message", utils_1.logD)
        .on("error", utils_1.logE);
    process.stdout.on("data", utils_1.logD);
}
exports.default = default_1;
