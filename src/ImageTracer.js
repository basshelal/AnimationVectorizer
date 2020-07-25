"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const child_process_1 = require("child_process");
const utils_1 = require("./utils");
async function default_1(options) {
    return new Promise((resolve, reject) => {
        const process = child_process_1.spawn("node", ["./node_modules/imagetracerjs/nodecli/nodecli", options.inputFile,
            "-outfilename", options.outputFile].concat(options.args))
            .on("message", utils_1.logD)
            .on("close", code => {
            if (code !== 0) {
                utils_1.logE(`ImageTracer failed with status code ${status}`);
                reject(`ImageTracer failed with status code ${status}`);
            }
            else
                resolve();
        })
            .on("error", err => {
            utils_1.logE(err);
            reject(err);
        });
        process.stdout.on("data", utils_1.logD);
        process.stderr.on("data", utils_1.logE);
    });
}
exports.default = default_1;
