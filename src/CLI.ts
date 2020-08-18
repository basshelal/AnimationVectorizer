import extensions from "./Extensions";
import {logD, logOptions} from "./Log";
import {now} from "./Utils";
import moment, {duration} from "moment";
import {imwrite, Mat} from "opencv4nodejs";
import {PNGImageDataToImageData, readPNG} from "./PNG";
import {EdgeDetector} from "./Vectorizer/EdgeDetector";

extensions()

async function test() {
    logOptions.enabled = true

    const start = moment()
    logD(`Starting at ${now()}`)

    /*logD("Reading PNG...")
    let pngImageData: PNGImageData = await readPNG("./out/shapes.png")

    logD("Converting PNGImageData to ImageData...")
    let imageData: ImageData = PNGImageDataToImageData(pngImageData)

    logD("Converting ImageData to SVG string...")
    const options = optionDetailed
    options.colorsNumber = 32
    let svg: string = imageDataToSVG(imageData, options)

    writeFileSync("./out/test.svg", svg)

    logD(`Original PNG size is ${statSync("./out/frames/218.png").size.comma()} bytes`)
    logD(`Output   SVG size is ${statSync("./out/test.svg").size.comma()} bytes`)*/

    const edges: Mat = EdgeDetector.onImage({
        imagePath: "./out/frames/1.png", threshold1: 75, threshold2: 125, apertureSize: 3, L2gradient: false
    })
    imwrite("./out.png", edges)

    const pngImageData = PNGImageDataToImageData(await readPNG("./out.png"))
    logD(pngImageData.totalPixels)
    logD(pngImageData.data.length)

    const finish = moment()
    logD(`Finished at ${now()}`)
    logD(`Operation took ${duration(finish.diff(start), "milliseconds").asSeconds()} seconds`)

    process.exit(0)
}

test()