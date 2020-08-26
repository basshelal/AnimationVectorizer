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

                // TODO here we need to take into account the actual value of this pixel,
                //  as well as the values of previous pixels
                //  thus we also need a function to determine whether 2 pixels are in the same region or not
                //  or more likely, whether this pixel is TOO DIFFERENT from the previous to be considered in the
                //  same neighborhood
                //  Then in the end what is the ONE color of that region? Again could be done inline instead
                //  of in a second pass as we did with Path merging

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

                    /*// How different are these regions from each other, what do we merge?

                    const regionsToMerge: Set<ColorRegion> = new Set<ColorRegion>()

                    previousRegions.forEach(region1 => {
                        previousRegions.forEach(region2 => {
                            if (region1.averageColor.closeTo(region2.averageColor, delta)) {
                                regionsToMerge.addAll(region1, region2)
                            }
                        })
                    })

                    // Merge regions and recalculate their average
                    regionsToMerge.forEach(region => {

                    })*/

                    let bestFit: ColorRegion | null = null
                    let bestDelta =
                        {r: Number.MAX_VALUE, g: Number.MAX_VALUE, b: Number.MAX_VALUE, a: Number.MAX_VALUE}

                    previousRegions.forEach(previousRegion => {
                        regionColor.difference(previousRegion.averageColor)
                    })

                    // After merging, which one best fits me?

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

        logD(`Regions: ${regions.size}`)

        return regions
    }

    static regionsToColorGrid(paths: Array<ColorRegion>, width: number, height: number): Grid<Color> {
        const result = Array.init(height, y => Array.init(width, x => new Color({r: 0, g: 0, b: 0, a: 255})))
        paths.forEach(path => path.pixels.forEach(pixel => result[pixel.y][pixel.x] = pixel))
        return result
    }

}