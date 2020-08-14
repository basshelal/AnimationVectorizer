import extensions from "./Extensions";
import {statSync, writeFileSync} from "fs";
import {PNGImageData, PNGImageDataToImageData, readPNG} from "./PNG";
import {imageDataToSVG} from "./ImageTracer/ImageTracer";
import {optionDetailed} from "./ImageTracer/Options";
import {ImageData} from "./ImageTracer/Types";
import {logD, logOptions} from "./Log";
import {now} from "./Utils";
import moment, {duration} from "moment";

extensions()

async function test() {

    logOptions.enabled = true

    const start = moment()
    logD(`Starting at ${now()}`)

    logD("Reading PNG...")
    let pngImageData: PNGImageData = await readPNG("./out/frames/218.png")

    logD("Converting PNGImageData to ImageData...")
    let imageData: ImageData = PNGImageDataToImageData(pngImageData)

    logD("Converting ImageData to SVG string...")
    const options = optionDetailed
    options.colorsNumber = 128
    let svg: string = imageDataToSVG(imageData, options)

    logD("Writing output svg file...")
    writeFileSync("./out/test.svg", svg)

    logD(`Original PNG size is ${statSync("./out/frames/218.png").size.comma()} bytes`)
    logD(`Output   SVG size is ${statSync("./out/test.svg").size.comma()} bytes`)

    const finish = moment()
    logD(`Finished at ${now()}`)
    console.log(`Operation took ${duration(finish.diff(start), "milliseconds").asSeconds()} seconds`)

    process.exit(0)

}

test()