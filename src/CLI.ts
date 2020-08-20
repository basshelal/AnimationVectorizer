import extensions from "./Extensions";
import {logD, logW, writeLog} from "./Log";
import {now} from "./Utils";
import moment, {duration} from "moment";
import {imread, imwrite, Mat} from "opencv4nodejs";
import {EdgeDetector} from "./Vectorizer/EdgeDetector";
import {matDataTo2DArray} from "./Types";
import {PathScanner} from "./Vectorizer/PathScanner";
import * as v8 from "v8";

extensions()

async function test() {
    const start = moment()
    logD(`Starting at ${now()}`)

    const totalMemoryGB = (v8.getHeapStatistics().total_available_size / 1024 / 1024 / 1024)
        .toFixed(2)

    logW(`Running Node with ${totalMemoryGB} GB of available memory...`)

    logD(`Looping...`)

    const images: Array<Mat> = EdgeDetector.loopOnImage({
        imagePath: "./out/frames/1.png",
        iterations: 500,
        minThresholdStart: 0,
        maxThresholdStart: 100,
        L2gradient: false,
        apertureSize: 3
    })

    logD(`Writing...`)

    images.forEach((image, i) => imwrite(`./out/test/${i}.png`, image))

    logD(`Converting...`)

    const mats = images.map((mat) => matDataTo2DArray(mat))

    logW(`Running on GPU...`)

    const avg = EdgeDetector.averageEdgesGPU(mats, 50)
    imwrite(`./out/test/avg.png`, avg)

    const img = imread(`./out/test/avg.png`)

    const paths = PathScanner.pathsFromEdgesMat(avg)

    writeLog(paths, `paths`)

    const finish = moment()
    logD(`Finished at ${now()}\n` +
        `Operation took ${duration(finish.diff(start), "milliseconds").asSeconds()} seconds`)

}

test()