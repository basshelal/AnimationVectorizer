import extensions from "./extensions";
import {PNGImageDataToImageData, readPNG} from "./PNG";
import {imageDataToSVG} from "./ImageTracer";
import {optionDetailed} from "./Options";
import {writeFileSync} from "fs";

extensions()

async function main() {
    /*await extractFrames({
        videoFilePath: path.resolve("./res/PIE.avi"),
        framesFolderPath: path.resolve("./out/PIE")
    })

    await joinFrames({
        framesFolderPath: path.resolve("./out/PIE"),
        outputFilePath: path.resolve("./out/PIE/output.mp4"),
        frameRate: 1
    })

    const framesDir = "./out/PIE"

    const frames: Array<string> =
        readdirSync(framesDir)
            .sort()
            .map(it => path.join(framesDir, it))

    mkdirpSync("./svg")

    logD(`Starting Vectorization at ${now()}`)

    await Promise.all(frames.map((file: string, index: number) =>
        ImageTracerCLI({
            inputFile: file,
            outputFile: path.join(`./svg/${index + 1}.svg`),
            args: ["numberofcolors", "64"]
        })
    ))

    logD(`Finished Vectorization at ${now()}`)*/


    let pngImageData = await readPNG("./out/PIE/512.png")

    let imageData = PNGImageDataToImageData(pngImageData)

    let svg = imageDataToSVG(imageData, optionDetailed)

    writeFileSync("./out.svg", svg)

    console.log("Finished")

}

main()

