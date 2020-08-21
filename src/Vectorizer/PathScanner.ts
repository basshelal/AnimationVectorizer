import {Mat} from "opencv4nodejs";
import {AllDirections, Color, Direction, Grid, matToColorGrid, Path, PathIndexedColor, Point} from "../Types";
import {assert, logD} from "../Log";

export const PathScanner = {
    parsePaths(mat: Mat): Array<Path> {
        const image: Grid<Color> = matToColorGrid(mat)
        const paths: Array<Path> = []

        let currentPath: Path = Path.NULL
        let currentPathHasFinished: boolean = false
        let currentId: number = 0

        const pointsGrid: Grid<PathIndexedColor> = image.map((column: Array<Color>, y: number) =>
            column.map((color: Color, x: number) => {
                if (color.isNotZero) return PathIndexedColor.fromColor({x: x, y: y}, color)
                else return PathIndexedColor.NULL
            })
        )

        pointsGrid.forEach((column: Array<PathIndexedColor>, y: number) => {
            column.forEach((point: PathIndexedColor, x: number) => {
                if (point.isNotNull) { // we are an edge pixel!
                    assert(point.x === x && point.y === y,
                        `Point y and x are not corresponding!`, arguments, this.parsePaths)
                    if (!point.hasPath) { // Beginning a new path
                        const currentPath = new Path({id: currentId++})
                        currentPath.add(point)
                        // Start following path
                        const followed = this.followPath(currentPath, pointsGrid)
                        if (followed.isComplete) paths.push(followed)
                    }
                }
            })
        })

        return paths
    },

    followPath(path: Path, pointsGrid: Grid<PathIndexedColor>): Path {
        if (path.isComplete) return path // base case

        const height = pointsGrid.length
        const width = pointsGrid[0].length

        const last: PathIndexedColor = path.points.last()

        const x = last.x
        const y = last.y

        const lastPoint = new Point({x: last.x, y: last.y})

        const allShiftsBy1: Array<Point> = AllDirections.map((dir: Direction) => lastPoint.shifted(dir, 1))
        const validShifts: Array<PathIndexedColor> = allShiftsBy1
            .filter(point => point.x >= 0 && point.x <= width && point.y >= 0 && point.y <= height) // within bounds
            .map(point => pointsGrid[point.y][point.x]) // map to the PathIndexedColor at that position
            .filter(color => color.isNotNull && color.isNotZero) // filter to only be valid colors // TODO what about image edges?

        logD(`Valid shifts: ${validShifts.length}`)

        if (!validShifts.isEmpty()) path.add(validShifts[0])
        else return path

        return this.followPath(path, pointsGrid)
    }

}