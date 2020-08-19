import extensions from "./Extensions";
import {logD} from "./Log";
import {json, now} from "./Utils";
import moment, {duration} from "moment";
import {imread, imwrite, Mat} from "opencv4nodejs";
import {PathScanner} from "./Vectorizer/PathScanner";
import {writeFileSync} from "fs";
import {EdgeDetector} from "./Vectorizer/EdgeDetector";

extensions()

async function test() {
    const start = moment()
    logD(`Starting at ${now()}`)

    logD(`Looping...`)

    const images: Array<Mat> = EdgeDetector.loopOnImage({
        imagePath: "./out/frames/1.png",
        iterations: 300,
        minThresholdStart: 0,
        maxThresholdStart: 100,
        L2gradient: false,
        apertureSize: 3
    })

    logD(`Writing...`)

    images.forEach((image, i) => imwrite(`./out/test/${i}.png`, image))

    const avg = EdgeDetector.averageEdges(images)
    imwrite(`./out/test/avg.png`, avg)

    const img = imread(`./out/test/avg.png`)

    const paths = PathScanner.pathsFromEdgesMat(avg)

    writeFileSync(`./paths.json`, json(paths, 1))

    const finish = moment()
    logD(`Finished at ${now()}\n` +
        `Operation took ${duration(finish.diff(start), "milliseconds").asSeconds()} seconds`)

}

test()