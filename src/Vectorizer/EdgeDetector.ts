import {imread, Mat} from "opencv4nodejs";
import {Grid} from "../Types";

export const EdgeDetector = {
    on({imagePath, threshold1, threshold2, apertureSize, L2gradient}: {
        imagePath: string, threshold1: number, threshold2: number, apertureSize?: number, L2gradient?: boolean
    }): Grid<number> {
        const src: Mat = imread(imagePath)
        const result: Mat = src.canny(threshold1, threshold2, apertureSize, L2gradient)
        return result.getDataAsArray()
    }
}