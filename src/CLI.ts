import extensions from "./Extensions";
import {writeFileSync} from "fs";
import {PNGImageData, PNGImageDataToImageData, readPNG} from "./PNG";
import {imageDataToSVG} from "./ImageTracer/ImageTracer";
import {optionDetailed} from "./ImageTracer/Options";
import {ImageData} from "./ImageTracer/Types";
import {logD} from "./Log";

extensions()

async function test() {

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

    logD("Finished!")

    process.exit(0)

}

test()