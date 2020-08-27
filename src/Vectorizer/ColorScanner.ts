import {Color, ColorRegion, Direction, Grid, ID, ImageData, RegionColor} from "../Types";
import {NumberObject} from "../Utils";
import {logD, writeLog} from "../Log";

export class ColorScanner {
    private constructor() {
    }

    static parseColorRegions(imageData: ImageData, delta: number = 25): Map<ID, ColorRegion> {
        const colorGrid: Grid<RegionColor> = imageData.pixelsGrid
            .map((column: Array<Color>, y: number) =>
                column.map((color: Color, x: number) =>
                    RegionColor.fromColor({x: x, y: y}, color)))

        const height = imageData.height
        const width = imageData.width
        const regions = new Map<ID, ColorRegion>()
        const currentId: NumberObject = {it: 0}

        colorGrid.forEach((column: Array<RegionColor>) => {
            column.forEach((regionColor: RegionColor) => {
                // Check my previous neighbors and check their colors
                const previousNeighbors: Array<RegionColor> = Array.from<Direction>(["W", "NW", "N", "NE"])
                    .map(dir => regionColor.point.shifted(dir, 1))
                    .filter(point => point.x >= 0 && point.x < width && point.y >= 0 && point.y < height)
                    .map(point => colorGrid[point.y][point.x])

                // Don't have previous neighbors?
                if (previousNeighbors.isEmpty()) {
                    // new region with just me! No need to check anything since no neighbors
                    const newRegion = new ColorRegion({id: currentId.it++})
                    newRegion.add(regionColor)
                    regions.set(newRegion.id, newRegion)
                }
                // Do have neighbors?
                else {
                    // Get their distinct regions
                    const previousRegions: Array<ColorRegion> = previousNeighbors.map(neighbor => neighbor.regionId)
                        .distinct()
                        .map(id => regions.get(id))
                        .filter(it => it !== undefined)
                        .map(it => it!!)


                    // TODO we need to merge any regions that are too close to each other here,
                    // After merging, which one best fits me?

                    let bestFit: ColorRegion | null = null
                    let lowestDelta = Number.MAX_VALUE

                    previousRegions.forEach(region => {
                        const diff = regionColor.difference(region.averageColor)
                        const delta = diff.r + diff.g + diff.b + diff.a
                        if (delta < lowestDelta) {
                            lowestDelta = delta
                            bestFit = region
                        }
                    })

                    // I have a best fit, is it within delta?
                    if (bestFit !== null) {
                        if (!regionColor.closeTo(bestFit!!.averageColor, delta)) bestFit = null
                        else bestFit!!.add(regionColor)
                    }
                    // None fit me? then a new region for myself
                    if (bestFit === null) {
                        const newRegion = new ColorRegion({id: currentId.it++})
                        newRegion.add(regionColor)
                        regions.set(newRegion.id, newRegion)
                    }
                }
            })
        })

        writeLog(regions.keysArray(), `regions`)

        logD(`Initial Pixels: ${imageData.totalPixels}`)
        logD(`Unique Colors: ${imageData.uniqueColors.length}`)
        logD(`Regions: ${regions.size}`)
        logD(`Ratio: ${(regions.size / imageData.totalPixels).roundToDec(3)}`)

        return regions
    }

    static regionsToColorGrid(regions: Array<ColorRegion>, width: number, height: number): Grid<Color> {
        const result = Array.init(height, y => Array.init(width, x => new Color({r: 0, g: 0, b: 0, a: 255})))
        regions.forEach(region => region.pixels.forEach(pixel => result[pixel.y][pixel.x] = region.averageColor))
        return result
    }

}