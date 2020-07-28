import {ChildProcess, spawn} from "child_process";
import {logD, logE} from "./Utils";

export default async function (options: {
    inputFile: string,
    outputFile: string,
    args?: Array<string>,
}): Promise<void> {
    return new Promise((resolve, reject) => {
        const process: ChildProcess = spawn("node",
            ["./node_modules/imagetracerjs/nodecli/nodecli", options.inputFile,
                "-outfilename", options.outputFile].concat(options.args))
            .on("message", logD)
            .on("close", code => {
                if (code !== 0) {
                    logE(`ImageTracer failed with status code ${status}`)
                    reject(`ImageTracer failed with status code ${status}`)
                } else resolve()
            })
            .on("error", err => {
                logE(err)
                reject(err)
            })
        process.stdout.on("data", logD)
        process.stderr.on("data", logE)
    })
}