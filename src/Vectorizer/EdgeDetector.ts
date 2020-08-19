import {imread, Mat} from "opencv4nodejs";
import {from} from "../Utils";
import {assert, logD} from "../Log";

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
    }
}