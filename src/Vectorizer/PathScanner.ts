import {Mat} from "opencv4nodejs";
import {AllDirections, Color, Direction, Grid, ID, matToColorGrid, NO_ID, Path, PathColor} from "../Types";
import {logD} from "../Log";
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

        pointsGrid.forEach((column: Array<PathColor>) => {
            column.forEach((pathColor: PathColor) => {
                if (pathColor.isNotNull) { // we are an edge pixel
                    this.followPath(pathColor, pointsGrid, paths, width, height, currentId)
                }
            })
        })
        logD(`Paths: ${paths.size}`)

        return paths
    }

    static followPath(pathColor: PathColor, pointsGrid: Grid<PathColor>, paths: Map<ID, Path>,
                      width: number, height: number, currentId: NumberObject) {
        // logD(`Follow path: ${currentId.it}`)
        // Check my neighbors and check their paths
        const neighbors: Array<PathColor> =
            AllDirections.map((dir: Direction) => pathColor.point.shifted(dir, 1))
                .filter(point => point.x >= 0 && point.x < width && point.y >= 0 && point.y < height)
                .map(point => pointsGrid[point.y][point.x])
                .filter(pathColor => pathColor.isNotNull && pathColor.isNotZero)

        // Don't have neighbors? look a little further maybe???
        if (neighbors.isEmpty()) return // TODO look further? It's risky

        // Do have neighbors? Get their Paths
        const neighborPaths: Array<Path> = neighbors.map(neighbor => neighbor.pathId)
            .filter(id => id !== NO_ID)
            .map(id => paths.get(id)!!)
            .distinct()
        // Possible cases
        if (!pathColor.hasPath) {
            //  I dont have a path and neither do any of my neighbors
            if (neighborPaths.isEmpty()) {
                // Make a new path and set me and my neighbors to it
                const newPath = new Path({id: currentId.it++})
                this.resetPathColorPath(pathColor, newPath, paths)
                paths.set(newPath.id, newPath)
                neighbors.forEach(neighbor => {
                    this.resetPathColorPath(neighbor, newPath, paths)
                    this.followPath(neighbor, pointsGrid, paths, width, height, currentId)
                })
            }
            //  I dont have a path but my neighbors have the same path
            else if (neighborPaths.length === 1) {
                // Set my path to it and do nothing else
                const neighborPath = neighborPaths[0]
                this.resetPathColorPath(pathColor, neighborPath, paths)
            }
            //  I dont have a path and my neighbors have different paths
            else if (neighborPaths.length > 1) {
                let maxEntry: { count: number, path: Path } = {count: 0, path: Path.NULL}
                const countMap: Map<Path, number> = neighborPaths.countMap()

                countMap.forEach((count: number, path: Path) => {
                    if (count > maxEntry.count) maxEntry = {count: count, path: path}
                })

                if (maxEntry.count > 1) {
                    // does anyone have the same path
                    //  if so then that path wins and we all take that path
                    const path = maxEntry.path
                    this.resetPathColorPath(pathColor, path, paths)
                    neighbors.forEach(neighbor => {
                        this.resetPathColorPath(neighbor, path, paths)
                        this.followPath(neighbor, pointsGrid, paths, width, height, currentId)
                    })
                } else {
                    // worst case, they all have different paths each... :/
                    //  We pick the lowest ID one
                    const lowestID = neighborPaths.map(it => it.id).sort()[0]
                    const path = paths.get(lowestID)!!
                    this.resetPathColorPath(pathColor, path, paths)
                    neighbors.forEach(neighbor => {
                        this.resetPathColorPath(neighbor, path, paths)
                        this.followPath(neighbor, pointsGrid, paths, width, height, currentId)
                    })
                }
            }
        } else if (pathColor.hasPath) {
            //  I have a path but my neighbors dont
            if (neighborPaths.isEmpty()) {
                // Set my neighbors path to be the same as mine
                const path = paths.get(pathColor.pathId)!!
                neighbors.forEach(neighbor => {
                    this.resetPathColorPath(neighbor, path, paths)
                    this.followPath(neighbor, pointsGrid, paths, width, height, currentId)
                })
            }
            //  I have a path and my neighbors have different paths from me
            else if (neighborPaths.isNotEmpty()) {
                const myPath = paths.get(pathColor.pathId)!!
                const winningPath = neighborPaths.plus(myPath).sort((a, b) => a.id - b.id)[0]

                // set all of us to the lowest ID path

                this.resetPathColorPath(pathColor, winningPath, paths)
                neighbors.forEach(neighbor => {
                    this.resetPathColorPath(neighbor, winningPath, paths)
                    // this.followPath(neighbor, pointsGrid, paths, width, height, currentId)
                })
            }
        }
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