import {Mat} from "opencv4nodejs";
import {Color, matToImage} from "../Types";

export const PathScanner = {
    pathsFromEdgesMat(mat: Mat): Array<Color> {
        const result: Array<Color> = []
        const image = matToImage(mat)
        image.forEach(color => {
            if (!color.isZero) result.push(color)
        })
        return result
    }
}