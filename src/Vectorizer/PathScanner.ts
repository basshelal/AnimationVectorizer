import {Mat} from "opencv4nodejs";
import {Color, Grid, IndexedColor, matToColorGrid, PathIndexedColor} from "../Types";
import {logD} from "../Log";

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
        logD(`Pixel Path count: ${result.length}`)
        return result
    },

    parsePaths(mat: Mat) {
        const image: Grid<Color> = matToColorGrid(mat)
        const paths: Grid<PathIndexedColor> = []

        let currentPath: Array<PathIndexedColor> = []
        let currentPathHasFinished: boolean = false

        image.forEach((column: Array<Color>, y: number) => {
            column.forEach((color: Color, x: number) => {
                if (color.isNotZero) {
                    // we are an edge pixel!

                    // Begin neighbor check
                    //
                }
            })
        })
    }

}