import extensions from "./Extensions";
import {writeFileSync} from "fs";
import {PNGImageData, PNGImageDataToImageData, readPNG} from "./PNG";
import {ImageData, imageDataToSVG} from "./ImageTracer/ImageTracer";
import {optionDetailed} from "./ImageTracer/Options";
import {logD} from "./Utils";

extensions()

async function test() {

    logD("Reading PNG...")
    let pngImageData: PNGImageData = await readPNG("./out/frames/500.png")

    logD("Converting PNGImageData to ImageData...")
    let imageData: ImageData = PNGImageDataToImageData(pngImageData)

    logD("Converting ImageData to SVG string...")
    const options = optionDetailed
    options.colorsNumber = 64
    let svg: string = imageDataToSVG(imageData, options)

    logD("Writing output svg file...")
    writeFileSync("./out/test.svg", svg)

    logD("Finished!")

    process.exit(0)

}

test()