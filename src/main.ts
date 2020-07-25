import {readdirSync} from "fs";
import {mkdirpSync} from "fs-extra";
import * as path from "path";
import ImageTracer from "./ImageTracer";
import {logD, now} from "./utils";

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

    /*await ImageTracer({
        inputFile: "./out/PIE/350.png",
        outputFile: "./out.svg"
    })*/


    const framesDir = "./out/PIE"

    const frames: Array<string> =
        readdirSync(framesDir)
            .sort()
            .map(it => path.join(framesDir, it))

    mkdirpSync("./svg")

    logD(`Starting Vectorization at ${now()}`)

    await Promise.all(frames.map((file: string, index: number) =>
        ImageTracer({
            inputFile: file,
            outputFile: path.join(`./svg/${index + 1}.svg`)
        })
    ))

    logD(`Finished Vectorization at ${now()}`)

    Electron.app.exit(0)
}

main()