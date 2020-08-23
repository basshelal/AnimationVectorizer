import {Mat} from "opencv4nodejs";
import {AllDirections, Color, Direction, Grid, ID, matToColorGrid, NO_ID, Path, PathColor} from "../Types";
import {logD} from "../Log";
import {NumberObject} from "../Utils";

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
                    this.followPath_(pathColor, pointsGrid, paths, width, height, currentId)
                }
            })
        })
        logD(`Paths: ${paths.size}`)

        return paths
    }

    // deprecated
    static followPath_(pathColor: PathColor, pointsGrid: Grid<PathColor>, paths: Map<ID, Path>,
                       width: number, height: number, currentId: NumberObject) {
        logD(`Follow path: ${currentId.it}`)
        const neighbors: Array<PathColor> =
            AllDirections.map((dir: Direction) => pathColor.point.shifted(dir, 1))
                .filter(point => point.x >= 0 && point.x < width && point.y >= 0 && point.y < height)
                .map(point => pointsGrid[point.y][point.x])
                .filter(pathColor => pathColor.isNotNull && pathColor.isNotZero && !pathColor.hasPath)
        if (neighbors.isEmpty()) return

        if (!pathColor.hasPath && neighbors.isNotEmpty()) {
            const newPath = new Path({id: currentId.it++})
            newPath.add(pathColor)
            newPath.addAll(neighbors)
            paths.set(newPath.id, newPath)
            this.followPath_(pathColor, pointsGrid, paths, width, height, currentId)
        } else if (pathColor.hasPath && neighbors.isNotEmpty()) {
            const path: Path | undefined = paths.get(pathColor.pathId)
            if (!path) throw new Error(`Path at ${pathColor.pathId} not valid`)
            path.addAll(neighbors)
            this.followPath_(pathColor, pointsGrid, paths, width, height, currentId)
        }
    }

    static followPath(pathColor: PathColor, pointsGrid: Grid<PathColor>, paths: Map<ID, Path>,
                      width: number, height: number, currentId: NumberObject) {
        logD(`Follow path: ${currentId.it}`)
        // Check my neighbors and check their paths
        const neighbors: Array<PathColor> =
            AllDirections.map((dir: Direction) => pathColor.point.shifted(dir, 1))
                .filter(point => point.x >= 0 && point.x < width && point.y >= 0 && point.y < height)
                .map(point => pointsGrid[point.y][point.x])
                .filter(pathColor => pathColor.isNotNull && pathColor.isNotZero)

        // Don't have neighbors? look a little further maybe???
        if (neighbors.isEmpty()) return

        // Do have neighbors? Get their Paths
        const neighborPaths: Array<Path> = neighbors.map(neighbor => neighbor.pathId)
            .filter(id => id !== NO_ID)
            .map(id => paths.get(id)!!)
            .distinct()
        // Possible cases
        if (!pathColor.hasPath) {
            //  I dont have a path and neither do any of my neighbors
            if (neighborPaths.isEmpty()) {

            }
            //  I dont have a path but my neighbors have the same path
            if (neighborPaths.length === 1) {

            }
            //  I dont have a path and my neighbors have different paths
            if (neighborPaths.length > 1) {

                // does anyone have the same path

                // worst case, they all have different paths each... :/
            }
        } else if (pathColor.hasPath) {
            //  I have a path but my neighbors dont
            if (neighborPaths.isEmpty()) {

            }
            //  I have a path and my neighbors also have the same path as me
            if (neighborPaths.length === 1 && neighborPaths[0].id === pathColor.pathId) {

            }
            //  I have a path and my neighbors have the same path as each other but not me
            if (neighborPaths.length === 1 && neighborPaths[0].id !== pathColor.pathId) {

            }
            //  I have a path and my neighbors have different paths from me and each other
            if (neighborPaths.length > 1) {

                // does anyone have my path?

                // does anyone have the same path

                // worst case, we all have different paths each... :/

            }
        }

        // Here we need to determine which path do I become and thus will tell the rest of
        //  my neighborhood to become

        // When I set my path, I need to tell my neighbors to set themselves
        //  and their neighbors to that path (recursion)

        // ensure that when a PathColor's path is reset it is also removed from that path
        //  by getting the path from the paths Map and changing its points

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

    // Idea!
    // Path merging, if Path Scanning still produced inconsistencies and faults, before any polygon detection
    //  we can always iterate through all paths and check if paths can be merged to become one, this may be
    //  expensive though
}