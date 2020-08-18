import {imread, Mat} from "opencv4nodejs";
import {from} from "../Utils";
import {assert} from "../Log";

export const EdgeDetector = {
    onImage({imagePath, threshold1, threshold2, apertureSize, L2gradient}: {
        imagePath: string, threshold1: number, threshold2: number,
        apertureSize?: number, L2gradient?: boolean
    }): Mat {
        return imread(imagePath).canny(threshold1, threshold2, apertureSize, L2gradient)
    },

    loopOnImage({imagePath, step = 1, threshold1Min, threshold1Max, threshold2Min, threshold2Max, apertureSize, L2gradient}: {
        imagePath: string, step?: number,
        threshold1Min: number, threshold1Max: number,
        threshold2Min: number, threshold2Max: number,
        apertureSize?: number, L2gradient?: boolean
    }): Array<Mat> {
        assert(threshold1Min <= threshold1Max && threshold2Min <= threshold2Max,
            `EdgeDetector.loopOnImage thresholds are not valid!`,
            arguments, this.loopOnImage)
        const result: Array<Mat> = []
        from(threshold1Min).to(threshold1Max).step(step).forEach(threshold1 =>
            from(threshold2Min).to(threshold2Max).step(step).forEach(threshold2 =>
                result.push(this.onImage({imagePath, threshold1, threshold2, apertureSize, L2gradient}))
            )
        )
        return result
    }
}