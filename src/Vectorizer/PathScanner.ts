import {Mat} from "opencv4nodejs";
import {AllDirections, Color, Direction, Grid, ID, matToColorGrid, Path, PathColor} from "../Types";
import {logD} from "../Log";
import {NumberObject} from "../Utils";

export const PathScanner = {
    parsePaths(mat: Mat, minThreshold: number = 40): Map<number, Path> {
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
    },

    followPath(pathColor: PathColor, pointsGrid: Grid<PathColor>, paths: Map<ID, Path>,
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
            this.followPath(pathColor, pointsGrid, paths, width, height, currentId)
        } else if (pathColor.hasPath && neighbors.isNotEmpty()) {
            const path: Path | undefined = paths.get(pathColor.pathId)
            if (!path) throw new Error(`Path at ${pathColor.pathId} not valid`)
            path.addAll(neighbors)
            this.followPath(pathColor, pointsGrid, paths, width, height, currentId)
        }

        // Check my neighbors and check their paths
        // Don't have neighbors? look a little further maybe???

        // Do have neighbors? Read on...
        // Cases:
        //  I dont have a path and my neighbors dont
        //  I dont have a path but my neighbors have the same path
        //  I dont have a path and my neighbors have different paths
        //  I have a path but my neighbors dont
        //  I have a path and my neighbors also have the same path
        //  I have a path and my neighbors have many different paths

        // Here we need to determine which path do I become and thus will tell the rest of
        //  my neighborhood to become

        // When I set my path, I need to tell my neighbors to set themselves
        //  and their neighbors to that path (recursion)

        // ensure that when a PathColor's path is reset it is also removed from that path
        //  by getting the path from the paths Map and changing its points

    },

    pathsToColorGrid(paths: Array<Path>, width: number, height: number): Grid<Color> {
        const result = Array.init(height, y => Array.init(width, x => new Color({r: 0, g: 0, b: 0, a: 255})))
        paths.forEach(path => path.points.forEach(pathColor => result[pathColor.y][pathColor.x] = pathColor))
        return result
    }
}