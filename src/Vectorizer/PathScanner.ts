import {Mat} from "opencv4nodejs";
import {Color, Direction, Grid, ID, matToColorGrid, NO_ID, Path, PathColor} from "../Types";
import {logD, writeLog} from "../Log";
import {NumberObject} from "../Utils";

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
        const equivalentPaths: Array<Array<ID>> = []

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

                    // Don't have previous neighbors? look a little further maybe???
                    if (previousNeighbors.isEmpty()) {
                        // new Path!
                        const newPath = new Path({id: currentId.it++})
                        newPath.add(pathColor)
                        paths.set(newPath.id, newPath)
                    } else {
                        // Do have neighbors? Get their Paths
                        const previousNeighborPaths: Array<Path> = previousNeighbors.map(neighbor => neighbor.pathId)
                            .filter(id => id !== NO_ID)
                            .map(id => paths.get(id)!!)
                            .distinct()

                        if (previousNeighborPaths.isNotEmpty()) {
                            // set my path to any one of these paths and if there are more than one then add them to the
                            // equivalent paths
                            const previousNeighborIds: Array<ID> = previousNeighborPaths.map(it => it.id)
                            const path = paths.get(previousNeighborIds.first()!!)!!
                            path.add(pathColor)
                            paths.set(path.id, path)
                            if (previousNeighborPaths.length > 1) {

                                const indicesOfPathsToMerge: Set<number> = new Set<number>()

                                equivalentPaths.forEach((ids, index) => {
                                    ids.forEach(id => {
                                        if (previousNeighborIds.contains(id)) {
                                            indicesOfPathsToMerge.add(index)
                                        }
                                    })
                                })

                                if (indicesOfPathsToMerge.size === 0) {
                                    equivalentPaths.push(previousNeighborIds.distinct().sort(((a, b) => a - b)))
                                } else {
                                    const merged: Array<ID> = indicesOfPathsToMerge.valuesArray()
                                        .map(index => equivalentPaths[index])
                                        .plus(previousNeighborIds)
                                        .flatten<ID>()
                                        .distinct().sort(((a, b) => a - b))

                                    indicesOfPathsToMerge.forEach(index => {
                                        equivalentPaths.splice(index)
                                    })

                                    equivalentPaths.push(merged)
                                }
                            }
                        }
                    }
                }
            })
        })
        logD(`Paths: ${paths.size}`)
        logD(`Equivalent Paths: ${equivalentPaths.length}`)

        writeLog(equivalentPaths, `equivalentPaths`)

        // EquivalentPaths loop
        equivalentPaths.forEach((pathIdsList: Array<ID>) => {
            logD(`pathIdsList: ${pathIdsList}`)
            const smallest: ID = pathIdsList.first()!! // because we sorted it earlier
            const mergedPath: Path = paths.get(smallest)!!
            pathIdsList.forEach((pathId: ID) => {
                if (pathId !== smallest) {
                    const pathToRemove = paths.get(pathId)!!
                    const points = pathToRemove.points
                    pathToRemove.removeAll(points)
                    mergedPath.addAll(points)
                    paths.delete(pathId)
                }
            })
            paths.set(smallest, mergedPath)
        })

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