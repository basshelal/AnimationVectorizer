import {Mat} from "opencv4nodejs";
import {Color, Direction, Grid, ID, matToColorGrid, NO_ID, Path, PathColor} from "../Types";
import {NumberObject} from "../Utils";
import {logE, writeLog} from "../Log";

// Read this https://en.wikipedia.org/wiki/Connected-component_labeling
export class PathScanner {

    private constructor() {
    }

    static parsePaths(mat: Mat, minThreshold: number = 40): Map<number, Path> {
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
                    const previousDirections: Array<Direction> = ["W", "NW", "N", "NE"]
                    // Check my previous neighbors and check their paths
                    const previousNeighbors: Array<PathColor> =
                        previousDirections.map((dir: Direction) => pathColor.point.shifted(dir, 1))
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

                        // set my path to the first neighbor path
                        const path = paths.get(previousNeighborIds.first()!!)!!
                        pathColor.pathId = NO_ID
                        path.add(pathColor)
                        paths.set(path.id, path)
                        // If there were more than one distinct previous neighbor paths then merge them all to
                        // my path
                        if (previousNeighborIds.length > 1) {

                            previousNeighborIds.forEach(previousNeighborId => {
                                if (previousNeighborId !== path.id) {
                                    const fromMap: Path = paths.get(previousNeighborId)!!
                                    if (!fromMap) {
                                        logE(path.id)
                                        logE(previousNeighbors)
                                        logE(previousNeighborId)
                                        logE(paths.keysArray())
                                    }
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

        writeLog(paths.valuesArray(), `equivalentPaths`)

        return paths
    }

    static pathsToColorGrid(paths: Array<Path>, width: number, height: number): Grid<Color> {
        const result = Array.init(height, y => Array.init(width, x => new Color({r: 0, g: 0, b: 0, a: 255})))
        paths.forEach(path => path.points.forEach(pathColor => result[pathColor.y][pathColor.x] = pathColor))
        return result
    }

    private static attachPathColorToPath(pathColor: PathColor, path: Path,
                                         pointsGrid: Grid<PathColor>, paths: Map<ID, Path>,
                                         width: number, height: number, currentId: NumberObject) {


    }

    private static resetPathColorPath(pathColor: PathColor, newPath: Path, allPaths: Map<ID, Path>) {
        // ensure that when a PathColor's path is re-set it is also removed from that path
        //  by getting the path from the paths Map and changing its points
        const oldPath = allPaths.get(pathColor.pathId)
        if (oldPath) oldPath.remove(pathColor)
        pathColor.pathId = NO_ID
        newPath.add(pathColor)
    }

    // Idea!
    // Path merging, if Path Scanning still produced inconsistencies and faults, before any polygon detection
    //  we can always iterate through all paths and check if paths can be merged to become one, this may be
    //  expensive though
}