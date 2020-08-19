import extensions from "./Extensions";
import {logD} from "./Log";
import {now, random} from "./Utils";
import moment, {duration} from "moment";
import {IKernelRunShortcut, KernelFunction} from "gpu.js";
import {gpu} from "./GPU";

extensions()

async function test() {
    const start = moment()
    logD(`Starting at ${now()}`)

    /*logD(`Looping...`)

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

    writeFileSync(`./paths.json`, json(paths, 1))*/

    logD(`Creating Mats...`)

    const mats: number[][][] =
        Array.init(20,
            () => Array.init(1920,
                () => Array.init(1080, () => random() * 255)))

    const kernelFunc: KernelFunction = function (mats: number[][][], length: number): number {
        let sum = 0
        for (let i = 0; i < length; i++) {
            sum += mats[i][this.thread.x][this.thread.y!!]
        }
        return sum / 10
    }

    logD(`Creating Kernel...`)

    const kernel: IKernelRunShortcut = gpu.createKernel(kernelFunc)
        .setOutput([1920, 1080])

    logD(`Running Kernel...`)

    const results: number[][][] = []

    /*
     * You have to split the input into manageable chunks (10 or 20 is good),
     * do this by running the kernel function on each chunk of the input
     * then you can rerun it on all the results of those
     */

    for (let i = 0; i < 5; i++) {
        const result: number[][] = kernel(mats, mats.length) as number[][]
        results.push(result)

        //  console.log(result)

    }

    const result: number[][] = kernel(results, 10) as number[][]

    console.log(result)

    const finish = moment()
    logD(`Finished at ${now()}\n` +
        `Operation took ${duration(finish.diff(start), "milliseconds").asSeconds()} seconds`)

}

test()