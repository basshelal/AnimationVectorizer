import extensions from "./Extensions";
import {logD, logOptions} from "./Log";
import {now} from "./Utils";
import moment, {duration} from "moment";
import {imread, imwrite, Mat} from "opencv4nodejs";
import {PNGImageDataToImageData, readPNG} from "./PNG";
import {Grid} from "./ImageTracer/Types";

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

    const src: Mat = imread("./out/frames/1.png")
    logD(src.getData().length)
    const result: Mat = src.canny(50, 100, 3, false)
    const grid: Grid<number> = result.getDataAsArray()
    logD(grid.length * grid[0].length)
    imwrite("./out.png", result)
    //writeImage("./out-1.png", ImageData.fromGrid(grid))

    const pngImageData = PNGImageDataToImageData(await readPNG("./out.png"))
    logD(pngImageData.totalPixels)

    const flat: Array<number> = []
    grid.forEach(array => array.forEach(num => flat.push(num)))

    logD(flat.length)
    logD(pngImageData.data.length)

    const finish = moment()
    logD(`Finished at ${now()}`)
    console.log(`Operation took ${duration(finish.diff(start), "milliseconds").asSeconds()} seconds`)

    process.exit(0)

}

test()