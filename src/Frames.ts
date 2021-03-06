import {now} from "./Utils";
import {mkdirpSync} from "fs-extra";
import ffmpeg from "./Ffmpeg";
import {logD} from "./Log";

export async function extractFrames(options: {
    videoFilePath: string,
    framesFolderPath: string
}) {
    logD(`Beginning extract frames for ${options.videoFilePath} on ${now()}`)

    mkdirpSync(options.framesFolderPath)

    await ffmpeg("-i", options.videoFilePath, `${options.framesFolderPath}/%d.png`, "-y")

    logD(`Finished extract frames for ${options.videoFilePath} on ${now()}`)
}

export async function joinFrames(options: {
    framesFolderPath: string,
    outputFilePath: string,
    frameRate: number
}) {

    logD(`Beginning join frames for ${options.framesFolderPath} on ${now()}`)

    await ffmpeg("-framerate", `${options.frameRate}`,
        "-i", `${options.framesFolderPath}/%d.png`,
        `${options.outputFilePath}`, "-y")

    logD(`Finished join frames for ${options.framesFolderPath} on ${now()}`)
}