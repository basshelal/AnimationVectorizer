import {Mat} from "opencv4nodejs";
import {Color, IndexedColor, matToColorGrid} from "../Types";

export const PathScanner = {
    pathsFromEdgesMat(mat: Mat): Array<IndexedColor> {
        const result: Array<IndexedColor> = []
        const image = matToColorGrid(mat)
        image.forEach((column: Array<Color>, y) => {
            column.forEach((color, x) => {
                if (!color.isZero)
                    result.push(new IndexedColor({x: x, y: y}, color))
            })
        })
        return result
    },
}