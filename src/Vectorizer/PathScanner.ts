import {Mat} from "opencv4nodejs";
import {AllDirections, Color, Direction, Grid, ID, matToColorGrid, Path, PathColor} from "../Types";
import {logD} from "../Log";

export const PathScanner = {
    parsePaths(mat: Mat, minThreshold: number = 50): Map<number, Path> {
        const image: Grid<Color> = matToColorGrid(mat)
        const paths = new Map<ID, Path>()

        /* TODO
         *  We need to use a Map to store the Paths so that we can index it by path ID
         *  We also need to use a Breadth First Search style algorithm when adding pathColors
         *  to the paths because using recursion quickly overloads stack size
         *  For each pixel if it's not attached to a path and it's neighbors aren't then
         *  attach them all to the same new Path
         *  else just attach it's neighbors to its own path
         *  For polygon detection though we need to reiterate over all the paths and do a quick
         *  cycle detection algorithm, this MUST iterate over all points
         */


        let currentPath: Path = Path.NULL
        let currentPathHasFinished: boolean = false
        let currentId: number = 0

        const pointsGrid: Grid<PathColor> = image.map((column: Array<Color>, y: number) =>
            column.map((color: Color, x: number) => {
                if (color.isNotZero) return PathColor.fromColor({x: x, y: y}, color)
                else return PathColor.NULL
            })
        )

        const height = pointsGrid.length
        const width = pointsGrid[0].length

        pointsGrid.forEach((column: Array<PathColor>) => {
            column.forEach((pathColor: PathColor) => {
                if (pathColor.isNotNull && (
                    pathColor.r > minThreshold ||
                    pathColor.g > minThreshold ||
                    pathColor.b > minThreshold)) { // we are an edge pixel above minThreshold
                    const validNeighbors: Array<PathColor> =
                        AllDirections.map((dir: Direction) => pathColor.point.shifted(dir, 1))
                            .filter(point => point.x >= 0 && point.x < width && point.y >= 0 && point.y < height)
                            .map(point => pointsGrid[point.y][point.x]) // map to the PathIndexedColor at that position
                            .filter(pathColor => pathColor.isNotNull && pathColor.isNotZero) // filter to only be valid colors // TODO what about image edges?
                    if (!pathColor.hasPath) { // Beginning a new path
                        const newPath = new Path({id: currentId++})
                        newPath.add(pathColor)
                        newPath.addAll(validNeighbors)
                        paths.set(newPath.id, newPath)
                    } else { // already have a path
                        const path: Path | undefined = paths.get(pathColor.pathId)
                        if (!path) throw new Error(`Path at ${pathColor.pathId} not valid`)
                        path.addAll(validNeighbors)
                    }
                }
            })
        })
        logD(`Paths: ${paths.size}`)

        return paths
    },

    // Warning very very slow!
    pathsToColorGrid(paths: Array<Path>, width: number, height: number): Grid<Color> {
        return Array.init(height, y => Array.init(width, x => {
            let found: PathColor | null = null
            for (let path of paths) {
                const foundPoint = path.pointAt({x: x, y: y})
                if (foundPoint !== null) {
                    found = foundPoint
                    break
                }
            }
            if (found === null) return new Color({r: 0, g: 0, b: 0, a: 255})
            else return found
        }))
    }
}