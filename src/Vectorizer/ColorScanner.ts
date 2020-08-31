import {AllDirections, Color, ColorRegion, Direction, Grid, ID, ImageData, NO_ID, Point, RegionColor} from "../Types";
import {NumberObject} from "../Utils";
import {logD, writeLog} from "../Log";
import {writeImage} from "../PNG";

export class ColorScanner {
    private constructor() {
    }

    static async parseColorRegions(imageData: ImageData, delta: number = 20): Promise<Map<ID, ColorRegion>> {
        const colorGrid: Grid<RegionColor> = imageData.pixelsGrid
            .map((column: Array<Color>, y: number) =>
                column.map((color: Color, x: number) =>
                    RegionColor.fromColor({x: x, y: y}, color)))

        const height = imageData.height
        const width = imageData.width
        const regionsMap = new Map<ID, ColorRegion>()
        const regionsGrid: Grid<ID> = Array.init(height, () => Array.init(width, () => NO_ID))
        const currentId: NumberObject = {it: 0}

        colorGrid.forEach((row: Array<RegionColor>, y: number) => {
            row.forEach((regionColor: RegionColor, x: number) => {
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
                    regionsGrid[y][x] = newRegion.id
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

                    // There is? Then let's merge!
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

                    // Now that merging is complete, which region best fits me?
                    let bestFit: ColorRegion = ColorRegion.NULL
                    let lowestDelta = Number.MAX_VALUE
                    previousRegions.forEach(region => {
                        const delta = regionColor.difference(region.averageColor).average
                        if (delta < lowestDelta) {
                            lowestDelta = delta
                            bestFit = region
                        }
                    })

                    // I have a best fit, is it within delta?
                    if (bestFit !== ColorRegion.NULL && bestFit.averageColor.closeTo(regionColor, delta)) {
                        bestFit.add(regionColor)
                        regionsMap.set(bestFit.id, bestFit)
                        regionsGrid[y][x] = bestFit.id
                    }
                    // None fit me or the delta is too big? Then a new region for myself
                    else {
                        const newRegion = new ColorRegion({id: currentId.it++})
                        newRegion.add(regionColor)
                        regionsMap.set(newRegion.id, newRegion)
                        regionsGrid[y][x] = newRegion.id
                    }
                }
            })
        })

        writeLog(regionsMap.valuesArray().sort((a, b) => a.totalPixels - b.totalPixels), `regions`)

        logD(`Initial Pixels: ${imageData.totalPixels.comma()}`)
        logD(`Unique Colors: ${imageData.uniqueColors.length.comma()}`)
        logD(`Regions: ${regionsMap.size.comma()}`)
        logD(`Ratio: ${(regionsMap.size / imageData.totalPixels).roundToDec(3)}`)

        const idLengthArray: Array<{ id: number, length: number }> = regionsMap.valuesArray().map(r => {
            return {id: r.id, length: r.totalPixels}
        })

        writeLog(idLengthArray, `idLengthArray`)

        logD(`1 pixel regions: ${idLengthArray.filter(r => r.length === 1).length.comma()}`)
        logD(`2 pixel regions: ${idLengthArray.filter(r => r.length === 2).length.comma()}`)
        logD(`3 pixel regions: ${idLengthArray.filter(r => r.length === 3).length.comma()}`)
        logD(`4 pixel regions: ${idLengthArray.filter(r => r.length === 4).length.comma()}`)
        logD(`5 pixel regions: ${idLengthArray.filter(r => r.length === 5).length.comma()}`)
        logD(`Regions < 5 pixels large: ${idLengthArray.filter(r => r.length < 5).length.comma()}`)
        logD(`Regions < 9 pixels large: ${idLengthArray.filter(r => r.length < 9).length.comma()}`)
        logD(`Regions >= 16 pixels large: ${idLengthArray.filter(r => r.length >= 16).length.comma()}`)
        logD(`Regions Grid height: ${regionsGrid.length}`)
        logD(`Regions Grid width: ${regionsGrid[0].length}`)
        logD(`Regions Grid NO_ID: ${regionsGrid.filter(it => it.filter(id => id === NO_ID).isNotEmpty()).length}`)

        await this.writeImage(`./out/beforeReduce.png`, regionsMap, width, height)
        await this.writeImageCondition(`./out/beforeReduceLarge.png`, regionsMap, width, height, r => r.totalPixels >= 9)
        await this.writeImageCondition(`./out/beforeReduceSmall.png`, regionsMap, width, height, r => r.totalPixels < 9)
        await this.writeImageRandomized(`./out/beforeReduceRandom.png`, regionsMap, width, height)

        const reduced = this.reduceColorRegions(regionsMap, regionsGrid)

        await this.writeImage(`./out/afterReduce.png`, reduced, width, height)
        await this.writeImageCondition(`./out/afterReduceLarge.png`, reduced, width, height, r => r.totalPixels >= 9)
        await this.writeImageCondition(`./out/afterReduceSmall.png`, reduced, width, height, r => r.totalPixels < 9)
        await this.writeImageRandomized(`./out/afterReduceRandom.png`, reduced, width, height)

        logD(`Reduced Regions: ${reduced.size.comma()}`)

        return reduced
    }

    static reduceColorRegions(regionsMap: Map<ID, ColorRegion>, regionsGrid: Grid<ID>, minRegionSize: number = 9): Map<ID, ColorRegion> {
        const height = regionsGrid.length
        const width = regionsGrid[0].length
        regionsGrid.forEach((row: Array<ID>, y: number) => {
            row.forEach((id: ID, x: number) => {
                const region: ColorRegion | undefined = regionsMap.get(id)
                // I am a region that needs to be merged
                if (region && region.totalPixels < minRegionSize) {
                    // Get my neighbors
                    const neighbors: Array<ColorRegion> = AllDirections
                        .map(dir => new Point({x: x, y: y}).shifted(dir, 1))
                        .filter(point => point.x >= 0 && point.x < width && point.y >= 0 && point.y < height)
                        .map(point => regionsMap.get(regionsGrid[point.y][point.x]))
                        .filter(it => it !== undefined).map(it => it!!)

                    // Sorted neighbors by closest color to me
                    const sortedNeighbors: Array<ColorRegion> = neighbors
                        .filter(it => it.totalPixels >= minRegionSize)
                        .sort((a, b) =>
                            a.averageColor.difference(region.averageColor).average - b.averageColor.difference(region.averageColor).average
                        )

                    const winner = sortedNeighbors.isNotEmpty() ? sortedNeighbors.first() : neighbors.first()

                    if (winner) {
                        // Winner takes everything from me
                        winner.takeAllColorsFrom(region)
                        regionsMap.set(winner.id, winner)
                        regionsMap.delete(region.id)
                    }
                }
            })
        })
        return regionsMap
    }

    // TOO SLOW!
    static regionsToPolygons(regions: Array<ColorRegion>): Array<ColorRegion> {
        regions.forEach((region: ColorRegion) => {
            const toRemove: Array<RegionColor> = []
            region.pixels.forEach((pixel: RegionColor) => {
                const points = region.pixels.map(it => it.point)
                const neighbors: Array<Point> = AllDirections.map(dir => pixel.point.shifted(dir, 1))
                const shouldRemove: boolean = neighbors.every(neighbor => points.contains(neighbor))
                if (shouldRemove) toRemove.push(pixel)
            })
            region.pixels.removeAll(toRemove)
        })
        return regions
    }

    static regionsToColorGrid(regions: Array<ColorRegion>, width: number, height: number): Grid<Color> {
        const result = Array.init(height, () => Array.init(width, () => Color.ZERO))
        regions.forEach(region => region.pixels.forEach(pixel => result[pixel.y][pixel.x] = region.averageColor))
        return result
    }

    static async writeImage(path: string, regions: Map<ID, ColorRegion>, width: number, height: number) {
        await writeImage(path, ImageData.fromPixelsGrid(this.regionsToColorGrid(regions.valuesArray(), width, height)))
    }

    static async writeImageRandomized(path: string, regions: Map<ID, ColorRegion>, width: number, height: number) {
        await writeImage(path, ImageData.fromPixelsGrid(this.regionsToColorGrid(regions.valuesArray().copy()
            .onEach(r => r.averageColor = Color.random()), width, height))
        )
    }

    static async writeImageCondition(path: string, regions: Map<ID, ColorRegion>, width: number, height: number,
                                     condition: (r: ColorRegion) => boolean) {
        await writeImage(path, ImageData.fromPixelsGrid(this.regionsToColorGrid(regions.valuesArray().filter(condition), width, height)))
    }

}