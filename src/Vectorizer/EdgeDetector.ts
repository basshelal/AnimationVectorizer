import {imread, Mat} from "opencv4nodejs";
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

    averageEdgesGPU(mats: Array<Mat>) {
        const height: number = mats[0].cols
        const width: number = mats[0].rows
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


        let chunksNumber = totalMats / 20 // Each chunk has 20 mats
        let rem = totalMats % 20 // number of mats in last chunk


        // TODO tired... must sleep...


        const results: number[][][] = []

        /*
         * You have to split the input into manageable chunks (10 or 20 is good),
         * do this by running the kernel function on each chunk of the input
         * then you can rerun it on all the results of those
         */

        for (let i = 0; i < 5; i++) {
            const result: number[][] = kernel([[[]]], 20) as number[][]
            results.push(result)

            //  console.log(result)

        }

        const result: number[][] = kernel(results, 10) as number[][]

        console.log(result)
    }
}