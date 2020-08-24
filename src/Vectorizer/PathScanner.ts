import {Mat} from "opencv4nodejs";
import {Color, Direction, Grid, ID, matToColorGrid, Path, PathColor} from "../Types";
import {NumberObject} from "../Utils";
import {logD, writeLog} from "../Log";

// Read this https://en.wikipedia.org/wiki/Connected-component_labeling
export class PathScanner {

    private constructor() {
    }

    static parsePaths(mat: Mat, minThreshold: number = 40): Map<ID, Path> {
        const pointsGrid: Grid<PathColor> = matToColorGrid(mat)
            .map((column: Array<Color>, y: number) =>
                column.map((color: Color, x: number) => {
                    if (color.isNotZero && (
                        color.r > minThreshold || color.g > minThreshold || color.b > minThreshold))
                        return PathColor.fromColor({x: x, y: y}, color)
                    else return PathColor.NULL
                })
            )

        const height = pointsGrid.length
        const width = pointsGrid[0].length
        const paths = new Map<ID, Path>()
        const currentId: NumberObject = {it: 0}

        pointsGrid.forEach((column: Array<PathColor>) => {
            column.forEach((pathColor: PathColor) => {
                if (pathColor.isNotNull) { // we are an edge pixel
                    // Check my previous neighbors and check their paths
                    const previousNeighbors: Array<PathColor> = Array.from<Direction>(["W", "NW", "N", "NE"])
                        .map(dir => pathColor.point.shifted(dir, 1))
                        .filter(point => point.x >= 0 && point.x < width && point.y >= 0 && point.y < height)
                        .map(point => pointsGrid[point.y][point.x])
                        .filter(pathColor => pathColor.isNotNull && pathColor.isNotZero)

                    // Don't have previous neighbors?
                    if (previousNeighbors.isEmpty()) {
                        // new Path with just me!
                        const newPath = new Path({id: currentId.it++})
                        newPath.add(pathColor)
                        paths.set(newPath.id, newPath)
                    }
                    // Do have neighbors?
                    else {
                        // Get their distinct Path Ids
                        const previousNeighborIds: Array<ID> = previousNeighbors.map(neighbor => neighbor.pathId)
                            .distinct()
                            .sort(((a, b) => a - b))

                        // set my path to the first neighbor path
                        const path = paths.get(previousNeighborIds.first()!!)!!
                        path.add(pathColor)
                        paths.set(path.id, path)
                        // If there were more than one distinct previous neighbor paths then merge them all to
                        // my path
                        if (previousNeighborIds.length > 1) {

                            previousNeighborIds.forEach(previousNeighborId => {
                                if (previousNeighborId !== path.id) {
                                    const fromMap: Path = paths.get(previousNeighborId)!!
                                    // remove all the points from that path and add them to the new path
                                    const points: Array<PathColor> = Array.from(fromMap.points)
                                    fromMap.removeAll(points)
                                    path.addAll(points)
                                    // remove that old path from the Paths Map
                                    paths.delete(fromMap.id)
                                    paths.set(path.id, path)
                                }
                            })
                        }
                    }
                }
            })
        })

        writeLog(paths.keysArray(), `equivalentPaths`)

        logD(`Paths: ${paths.size}`)

        return paths
    }

    static pathsToColorGrid(paths: Array<Path>, width: number, height: number): Grid<Color> {
        const result = Array.init(height, y => Array.init(width, x => new Color({r: 0, g: 0, b: 0, a: 255})))
        paths.forEach(path => path.points.forEach(pathColor => result[pathColor.y][pathColor.x] = pathColor))
        return result
    }
}