import * as cp from "child_process";
import {ChildProcess} from "child_process";
import * as electron from "electron";
import {logD, logE} from "./Utils";
import * as path from "path";

export default async function (...args: Array<string>): Promise<void> {
    return new Promise((resolve, reject) => {
        logD(`Starting ffmpeg ${args.join(" ")}`)

        const ffmpeg: ChildProcess = cp.spawn(path.join(electron.app.getAppPath(), "ffmpeg/bin/ffmpeg"), args)

        ffmpeg.on("message", (msg) => logD(`ffmpeg message:, ${msg}`))
        ffmpeg.on("error", (msg) => {
            logE(`ffmpeg error: ${msg}`)
            reject(msg)
        });
        ffmpeg.on("close", (status) => {
            if (status !== 0) {
                logE(`ffmpeg closed with status ${status}`)
                reject(`ffmpeg closed with status ${status}`)
            } else {
                resolve()
            }
        })

        if (ffmpeg.stdout) ffmpeg.stdout.on("data", (data) => logD(`ffmpeg stdout: ${data}`))
        if (ffmpeg.stderr) ffmpeg.stderr.on("data", (data) => logE(`ffmpeg stderr: ${data}`))
    });
}