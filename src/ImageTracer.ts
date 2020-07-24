import {ChildProcess, spawn} from "child_process";
import {logD, logE} from "./utils";

export default async function (options: {
    inputFile: string,
    outputFile: string,
}) {
    const process: ChildProcess = spawn("node",
        ["./node_modules/imagetracerjs/nodecli/nodecli", options.inputFile,
            "-outfilename", options.outputFile])
        .on("message", logD)
        .on("error", logE)
    process.stdout.on("data", logD)
}