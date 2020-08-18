import extensions from "./Extensions";
import {logD} from "./Log";
import {now} from "./Utils";
import moment, {duration} from "moment";
import {EdgeDetector} from "./Vectorizer/EdgeDetector";
import {imwrite, Mat} from "opencv4nodejs";

extensions()

async function test() {
    const start = moment()
    logD(`Starting at ${now()}`)

    logD(`Looping...`)

    const images: Array<Mat> = EdgeDetector.loopOnImage({
        imagePath: "./out/frames/1.png",
        threshold1Min: 0,
        threshold1Max: 200,
        threshold2Min: 0,
        threshold2Max: 200,
        L2gradient: false,
        apertureSize: 3
    })

    logD(`Writing...`)

    images.forEach((image, index) => imwrite(`./out/test/${index}.png`, image))

    const finish = moment()
    logD(`Finished at ${now()}\n` +
        `Operation took ${duration(finish.diff(start), "milliseconds").asSeconds()} seconds`)

}

test()