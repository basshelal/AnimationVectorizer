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
        const regionsMap = new Map<ID, ColorRegion>()
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
                    regionsMap.set(newRegion.id, newRegion)
                }
                // Do have neighbors?
                else {
                    // Get their distinct regions
                    let previousRegions: Array<ColorRegion> = previousNeighbors.map(neighbor => neighbor.regionId)
                        .distinct()
                        .map(id => regionsMap.get(id))
                        .filter(it => it !== undefined)
                        .map(it => it!!)

                    // TODO we need to merge any regions that are too close to each other here,
                    //  is anyone mergeable with me? If so let's merge as many of us as possible
                    //  but if not then no merges even if some are mergeable because they need a link?
                    //  this is actually impossible because we would have already made a pass that checks
                    //  those guys

                    const toMerge: Array<ColorRegion> = []

                    previousRegions.forEach(previousRegion => {
                        if (previousRegion.averageColor.closeTo(regionColor, delta))
                            toMerge.push(previousRegion)
                    })

                    // Let's merge!
                    if (toMerge.isNotEmpty()) {
                        // Pick a master, the one with the lowest ID
                        const master = toMerge.sort((a, b) => a.id - b.id).first()!!
                        toMerge.forEach(colorRegionToMerge => {
                            if (colorRegionToMerge !== master) {
                                master.takeAllColorsFrom(colorRegionToMerge)
                                regionsMap.set(master.id, master)
                                regionsMap.delete(colorRegionToMerge.id)
                            }
                        })
                    }

                    // After merging, which one best fits me?

                    let bestFit: ColorRegion | null = null
                    let lowestDelta = Number.MAX_VALUE

                    previousRegions = previousNeighbors.map(neighbor => neighbor.regionId)
                        .distinct()
                        .map(id => regionsMap.get(id))
                        .filter(it => it !== undefined)
                        .map(it => it!!)

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
                        regionsMap.set(newRegion.id, newRegion)
                    }
                }
            })
        })

        writeLog(regionsMap.keysArray(), `regions`)

        logD(`Initial Pixels: ${imageData.totalPixels.comma()}`)
        logD(`Unique Colors: ${imageData.uniqueColors.length.comma()}`)
        logD(`Regions: ${regionsMap.size.comma()}`)
        logD(`Ratio: ${(regionsMap.size / imageData.totalPixels).roundToDec(3)}`)

        return regionsMap
    }

    static regionsToColorGrid(regions: Array<ColorRegion>, width: number, height: number): Grid<Color> {
        const result = Array.init(height, y => Array.init(width, x => new Color({r: 0, g: 0, b: 0, a: 255})))
        regions.forEach(region => region.pixels.forEach(pixel => result[pixel.y][pixel.x] = region.averageColor))
        return result
    }

}