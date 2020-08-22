import {Mat} from "opencv4nodejs";
import {AllDirections, Color, Direction, Grid, ID, matToColorGrid, Path, PathColor} from "../Types";
import {logD} from "../Log";

export const PathScanner = {
    parsePaths(mat: Mat, minThreshold: number = 50): Map<number, Path> {
        const pointsGrid: Grid<PathColor> = matToColorGrid(mat)
            .map((column: Array<Color>, y: number) =>
                column.map((color: Color, x: number) => {
                    if (color.isNotZero) return PathColor.fromColor({x: x, y: y}, color)
                    else return PathColor.NULL
                })
            )

        const height = pointsGrid.length
        const width = pointsGrid[0].length
        const paths = new Map<ID, Path>()
        let currentId: { id: number } = {id: 0}

        pointsGrid.forEach((column: Array<PathColor>) => {
            column.forEach((pathColor: PathColor) => {
                if (pathColor.isNotNull && (
                    pathColor.r > minThreshold ||
                    pathColor.g > minThreshold ||
                    pathColor.b > minThreshold)) { // we are an edge pixel above minThreshold
                    this.followPath(pathColor, pointsGrid, paths, width, height, currentId)
                }
            })
        })
        logD(`Paths: ${paths.size}`)

        return paths
    },

    followPath(pathColor: PathColor, pointsGrid: Grid<PathColor>, paths: Map<ID, Path>,
               width: number, height: number, currentId: { id: number }) {
        logD(`Follow path: ${currentId.id}`)
        const neighbors: Array<PathColor> =
            AllDirections.map((dir: Direction) => pathColor.point.shifted(dir, 1))
                .filter(point => point.x >= 0 && point.x < width && point.y >= 0 && point.y < height)
                .map(point => pointsGrid[point.y][point.x])
                .filter(pathColor => pathColor.isNotNull && pathColor.isNotZero && !pathColor.hasPath)
        if (neighbors.isEmpty()) return

        // if my neighbors have a path and I don't I should probably take one of those paths

        if (!pathColor.hasPath && neighbors.isNotEmpty()) {
            const newPath = new Path({id: currentId.id++})
            newPath.add(pathColor)
            newPath.addAll(neighbors)
            paths.set(newPath.id, newPath)
            this.followPath(pathColor, pointsGrid, paths, width, height, currentId)
        } else if (pathColor.hasPath && neighbors.isNotEmpty()) {
            const path: Path | undefined = paths.get(pathColor.pathId)
            if (!path) throw new Error(`Path at ${pathColor.pathId} not valid`)
            path.addAll(neighbors)
            this.followPath(pathColor, pointsGrid, paths, width, height, currentId)
        }
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