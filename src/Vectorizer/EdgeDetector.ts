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
            })).reverse()
    },

    // TODO try to convert to GPU
    averageEdges(mats: Array<Mat>): Mat {
        const height: number = mats[0].cols
        const width: number = mats[0].rows
        const totalMats: number = mats.length
        const result = new Mat(mats[0].rows, mats[0].cols, mats[0].type)

        from(0).to(height).forEach(y => {
            logD(`y: ${y}`)
            from(0).to(width).forEach(x => {
                let sum = 0
                mats.forEach(mat => sum += mat.at(x, y))
                result.set(x, y, (sum / totalMats).roundToDec(1))
            })
        })
        return result
    },

    averageEdgesGPU(mats: number[][][], chunkSize: number = 20) {
        const totalMats: number = mats.length
        const height: number = mats[0].length
        const width: number = mats[0][0].length

        logD(`totalMats: ${totalMats}`)
        logD(`height: ${height}`)
        logD(`width: ${width}`)

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

        // What if averagedMats is still too big??
        // Then we need to recurse probably :/

        const finalAveragedMat: number[][] = kernel(averagedMats, averagedMats.length) as number[][]

        logD(`Averaged Height: ${finalAveragedMat.length}`)
        logD(`Averaged Width: ${finalAveragedMat[0].length}`)

        const final: number[][][] = Array.init(finalAveragedMat.length, (yIndex) =>
            Array.init(finalAveragedMat[yIndex].length, (xIndex) =>
                Array.init(1, () => finalAveragedMat[yIndex][xIndex]))
        )

        logD(`Final Height: ${final.length}`)
        logD(`Final Width: ${final[0].length}`)

        const result = new Mat(final, CV_8UC1)

        logD(`Mat cols: ${result.cols}`)
        logD(`Mat rows: ${result.rows}`)

        return result
    },
}