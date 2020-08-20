import {CV_8UC1, imread, Mat} from "opencv4nodejs";
import {from} from "../Utils";
import {assert, logD} from "../Log";
import {IKernelRunShortcut, KernelFunction} from "gpu.js";
import {gpu} from "../GPU";

export const EdgeDetector = {
    onImage({imagePath, minThreshold, maxThreshold, apertureSize = 3, L2gradient = false}: {
        imagePath: string, minThreshold: number, maxThreshold: number,
        apertureSize?: number, L2gradient?: boolean
    }): Mat {
        return imread(imagePath).canny(minThreshold, maxThreshold, apertureSize, L2gradient)
    },

    // TODO This is good but not great, the bigger differentiating factor is the difference between the
    //  threshold not how far they reach, we should explore methods that have varying differences but also
    //  consider having steps because the difference between (100,150) and (101,151) is miniscule and will
    //  be invisible when averaging, instead we could just step over like 10 steps or so and the savings in
    //  time and memory we can use to have a variable difference (maxThreshold - minThreshold) to have more
    //  diverse sample set
    loopOnImage({imagePath, iterations, minThresholdStart, maxThresholdStart, apertureSize = 3, L2gradient = false}: {
        imagePath: string,
        iterations: number,
        minThresholdStart: number, maxThresholdStart: number,
        apertureSize?: number, L2gradient?: boolean
    }): Array<Mat> {
        assert(minThresholdStart <= maxThresholdStart && iterations > 0,
            `EdgeDetector.loopOnImage thresholds are not valid!`,
            arguments, this.loopOnImage)
        return from(0).to(iterations).map(iteration =>
            this.onImage({
                imagePath: imagePath,
                minThreshold: minThresholdStart + iteration,
                maxThreshold: maxThresholdStart + iteration,
                apertureSize: apertureSize,
                L2gradient: L2gradient
            }))
    },

    averageEdgesGPU(mats: number[][][], chunkSize: number = 20) {
        const totalMats: number = mats.length
        const height: number = mats[0].length
        const width: number = mats[0][0].length

        logD(`totalMats: ${totalMats}\n` +
            `height: ${height}\n` +
            `width: ${width}`)

        const kernelFunc: KernelFunction = function (mats: number[][][], length: number): number {
            const x = this.thread.x
            const y = this.thread.y!!
            let sum = 0
            for (let i = 0; i < length; i++) {
                sum += mats[i][y][x]
            }
            return sum / length
        }

        const kernel: IKernelRunShortcut = gpu.createKernel(kernelFunc)
            .setOutput([width, height])

        const chunksNumber = (totalMats / chunkSize).floor()

        const matsChunks: number[][][][] = []

        from(0).to(chunksNumber).forEach(chunk => {
            const matChunk: number[][][] = []
            from(0).to(chunkSize).forEach(mat => {
                const index = (chunk * chunkSize) + mat
                matChunk.push(mats[index])
            })
            matsChunks.push(matChunk)
        })

        logD(`Chunks before remainder are ${matsChunks.length}`)

        // Remainder mats in the last chunks

        logD(`Remaining ${totalMats % chunkSize}`)

        if (totalMats % chunkSize !== 0) {
            const lastChunk: number[][][] = []
            from(chunksNumber * chunkSize).to(totalMats).forEach(index => {
                lastChunk.push(mats[index])
            })
            matsChunks.push(lastChunk)
        }

        logD(`Chunks after remainder are ${matsChunks.length}`)

        const averagedMats: number[][][] = []

        matsChunks.forEach((chunk: number[][][]) => {
            averagedMats.push(kernel(chunk, chunk.length) as number[][])
        })

        // TODO What if averagedMats is still too big??
        //  Then we need to recurse probably :/
        //  This can happen and it seems will only show a GPUJs internal error

        logD(`Averaged Mats: ${averagedMats.length}`)

        const finalAveragedMat: number[][] = kernel(averagedMats, averagedMats.length) as number[][]

        logD(`Averaged Height: ${finalAveragedMat.length}\n` +
            `Averaged Width: ${finalAveragedMat[0].length}`)

        const final: number[][][] = Array.init(finalAveragedMat.length, (yIndex) =>
            Array.init(finalAveragedMat[yIndex].length, (xIndex) =>
                Array.init(1, () => finalAveragedMat[yIndex][xIndex]))
        )

        logD(`Final Height: ${final.length}\n` +
            `Final Width: ${final[0].length}`)

        const result = new Mat(final, CV_8UC1)

        logD(`Mat cols: ${result.cols}\n` +
            `Mat rows: ${result.rows}`)

        return result
    },
}