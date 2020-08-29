import {Color, ColorRegion, Direction, Grid, ID, ImageData, RegionColor} from "../Types";
import {average, NumberObject} from "../Utils";
import {logD, writeLog} from "../Log";

export class ColorScanner {
    private constructor() {
    }

    static parseColorRegions(imageData: ImageData, delta: number = 20): Map<ID, ColorRegion> {
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

                    // Anyone close enough to me so that we can merge?
                    const toMerge: Array<ColorRegion> = previousRegions
                        .filter(previousRegion => previousRegion.averageColor.closeTo(regionColor, delta))

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
                        // Re-set previousRegions after the merge because regionsMap has changed its contents
                        previousRegions = previousNeighbors.map(neighbor => neighbor.regionId)
                            .distinct()
                            .map(id => regionsMap.get(id))
                            .filter(it => it !== undefined)
                            .map(it => it!!)
                    }

                    // After merging, which region best fits me?
                    let bestFit: ColorRegion = ColorRegion.NULL
                    let lowestDelta = Number.MAX_VALUE

                    previousRegions.forEach(region => {
                        const diff = regionColor.difference(region.averageColor)
                        const delta = average(diff.r, diff.g, diff.b, diff.a)
                        if (delta < lowestDelta) {
                            lowestDelta = delta
                            bestFit = region
                        }
                    })

                    // I have a best fit, is it within delta?
                    if (bestFit !== ColorRegion.NULL && bestFit.averageColor.closeTo(regionColor, delta)) {
                        bestFit.add(regionColor)
                    }
                    // None fit me or the delta is too big? Then a new region for myself
                    else {
                        const newRegion = new ColorRegion({id: currentId.it++})
                        newRegion.add(regionColor)
                        regionsMap.set(newRegion.id, newRegion)
                    }
                }
            })
        })

        writeLog(regionsMap.valuesArray().sort((a, b) => a.pixels.length - b.pixels.length), `regions`)

        logD(`Initial Pixels: ${imageData.totalPixels.comma()}`)
        logD(`Unique Colors: ${imageData.uniqueColors.length.comma()}`)
        logD(`Regions: ${regionsMap.size.comma()}`)
        logD(`Ratio: ${(regionsMap.size / imageData.totalPixels).roundToDec(3)}`)

        const idLengthArray: Array<{ id: number, length: number }> = regionsMap.valuesArray().map(r => {
            return {id: r.id, length: r.pixels.length}
        })

        writeLog(idLengthArray, `idLengthArray`)

        logD(`1 pixel regions: ${idLengthArray.filter(r => r.length === 1).length.comma()}`)
        logD(`2 pixel regions: ${idLengthArray.filter(r => r.length === 2).length.comma()}`)
        logD(`3 pixel regions: ${idLengthArray.filter(r => r.length === 3).length.comma()}`)
        logD(`4 pixel regions: ${idLengthArray.filter(r => r.length === 4).length.comma()}`)
        logD(`5 pixel regions: ${idLengthArray.filter(r => r.length === 5).length.comma()}`)
        logD(`Regions < 5 pixels large: ${idLengthArray.filter(r => r.length < 5).length.comma()}`)
        logD(`Regions >= 8 pixels large: ${idLengthArray.filter(r => r.length >= 8).length.comma()}`)
        logD(`Regions >= 16 pixels large: ${idLengthArray.filter(r => r.length >= 16).length.comma()}`)

        return regionsMap
    }

    static regionsToColorGrid(regions: Array<ColorRegion>, width: number, height: number): Grid<Color> {
        const result = Array.init(height, y => Array.init(width, x => new Color({r: 0, g: 0, b: 0, a: 255})))
        regions.forEach(region => region.pixels.forEach(pixel => result[pixel.y][pixel.x] = region.averageColor))
        return result
    }

}