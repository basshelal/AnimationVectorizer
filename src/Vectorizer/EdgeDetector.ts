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
        return from(0).to(iterations).map(iteration => {
            logD(iteration)
            return this.onImage({
                imagePath: imagePath,
                minThreshold: minThresholdStart + iteration,
                maxThreshold: maxThresholdStart + iteration,
                apertureSize: apertureSize,
                L2gradient: L2gradient
            })
        }).reverse()
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
        const height: number = mats[0].length
        const width: number = mats[0][0].length
        const totalMats: number = mats.length

        const kernelFunc: KernelFunction = function (mats: number[][][], length: number): number {
            let sum = 0
            for (let i = 0; i < length; i++) {
                sum += mats[i][this.thread.x][this.thread.y!!]
            }
            return sum / length
        }

        const kernel: IKernelRunShortcut = gpu.createKernel(kernelFunc)
            .setOutput([height, width])

        let chunksNumber = (totalMats / chunkSize).floor()

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
        logD(`Remaining ${totalMats - (chunksNumber * chunkSize)}`)

        if (totalMats % chunkSize !== 0) {
            const lastChunk: number[][][] = []
            from(chunksNumber * chunkSize).to(totalMats).forEach(index => {
                lastChunk.push(mats[index])
            })
            matsChunks.push(lastChunk)
        }

        logD(`Chunks after remainder are ${matsChunks.length}`)

        const averagedMats: number[][][] = []

        matsChunks.forEach(mat => {
            averagedMats.push(kernel(mat, mat.length) as number[][])
        })

        // What if averagedMats is still too big??
        // Then we need to recurse probably :/

        const finalAveragedMat: number[][] = kernel(averagedMats, averagedMats.length) as number[][]

        console.log(finalAveragedMat.length)
        console.log(finalAveragedMat[0].length)

        const final: number[][][] = Array.init(finalAveragedMat.length, (yIndex) =>
            Array.init(finalAveragedMat[yIndex].length, (xIndex) =>
                Array.init(1, () => finalAveragedMat[yIndex][xIndex]))
        )

        console.log(final.length)
        console.log(final[0].length)
        console.log(final[0][0].length)

        return new Mat(final, CV_8UC1)
    },

    averageEdgesGPUArray(mats: number[][][], chunkSize: number = 20) {

    }
}