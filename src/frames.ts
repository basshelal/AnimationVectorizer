import {logD, now} from "./utils";

const ffmpegExtractFrames = require("ffmpeg-extract-frames");

export async function extractFrames(filePath: string) {

    logD(`Beginning extract frames for ${filePath} on ${now()}`)

    await ffmpegExtractFrames({
        input: filePath,
        output: "out/frame-%d.png"
    })

    logD(`Finished extract frames for ${filePath} on ${now()}`)

}