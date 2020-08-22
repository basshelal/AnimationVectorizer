import {Mat} from "opencv4nodejs";
import {AllDirections, Color, Direction, Grid, matToColorGrid, Path, PathColor, Point} from "../Types";
import {assert, logD} from "../Log";

export const PathScanner = {
    parsePaths(mat: Mat): Array<Path> {
        const image: Grid<Color> = matToColorGrid(mat)
        const paths: Array<Path> = []

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

        let count = 0

        pointsGrid.forEach((column: Array<PathColor>, y: number) => {
            column.forEach((pathColor: PathColor, x: number) => {
                if (pathColor.isNotNull) { // we are an edge pixel!
                    count++
                    assert(pathColor.x === x && pathColor.y === y,
                        `Point y and x are not corresponding!`, arguments, this.parsePaths)
                    if (!pathColor.hasPath) { // Beginning a new path
                        const currentPath = new Path({id: currentId++})
                        currentPath.add(pathColor)
                        // Start following path
                        const followed = this.followPath(currentPath, pointsGrid)
                        if (followed.isComplete) paths.push(followed)
                    }
                }
            })
        })
        logD(`Count: ${count}`)
        logD(`Paths: ${paths.length}`)

        return paths
    },

    followPath(path: Path, pointsGrid: Grid<PathColor>): Path {
        if (path.isComplete) return path // base case

        const height = pointsGrid.length
        const width = pointsGrid[0].length

        const last: PathColor = path.points.last()

        const x = last.x
        const y = last.y

        const lastPoint = new Point({x: last.x, y: last.y})

        const allShiftsBy1: Array<Point> = AllDirections.map((dir: Direction) => lastPoint.shifted(dir, 1))
        const validShifts: Array<PathColor> = allShiftsBy1
            .filter(point => point.x >= 0 && point.x < width && point.y >= 0 && point.y < height) // within bounds 0->max-1
            .map(point => {
                return pointsGrid[point.y][point.x]
            }) // map to the PathIndexedColor at that position
            .filter(pathColor => {
                return pathColor.isNotNull && pathColor.isNotZero
            }) // filter to only be valid colors // TODO what about image edges?

        logD(`Valid shifts: ${validShifts.length}`)

        path.addAll(validShifts)
        path.isComplete = true

        return path
    },

}