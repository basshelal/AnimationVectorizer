import {Color, Direction, Grid, ID, ImageData, Path, PathColor} from "../Types";
import {NumberObject} from "../Utils";
import {logD, writeLog} from "../Log";

export class ColorScanner {
    private constructor() {
    }

    static parseColorRegions(imageData: ImageData): Map<ID, Path> {
        const pointsGrid: Grid<PathColor> = imageData.pixelsGrid
            .map((column: Array<Color>, y: number) =>
                column.map((color: Color, x: number) =>
                    PathColor.fromColor({x: x, y: y}, color)))

        const height = imageData.height
        const width = imageData.width
        const paths = new Map<ID, Path>()
        const currentId: NumberObject = {it: 0}

        pointsGrid.forEach((column: Array<PathColor>) => {
            column.forEach((pathColor: PathColor) => {
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
            })
        })

        writeLog(paths.keysArray(), `equivalentPaths`)

        logD(`Paths: ${paths.size}`)

        return paths
    }

}