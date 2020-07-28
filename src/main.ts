import extensions from "./Extensions";
import {writeFileSync} from "fs";
import {PNGImageData, PNGImageDataToImageData, readPNG} from "./PNG";
import {ImageData, imageDataToSVG} from "./ImageTracer";
import {optionDetailed} from "./Options";
import {logD} from "./Utils";

extensions()

async function test() {

    logD("Reading PNG...")
    let pngImageData: PNGImageData = await readPNG("./out/frames/500.png")

    logD("Converting PNGImageData to ImageData...")
    let imageData: ImageData = PNGImageDataToImageData(pngImageData)

    logD("Converting ImageData to SVG string...")
    let svg: string = imageDataToSVG(imageData, optionDetailed)

    logD("Writing output svg file...")
    writeFileSync("./out/test.svg", svg)

    console.log("Finished!")

    process.exit(0)

}

test()