import {ColorRegion, Direction, emptyFunction, Grid, ID, ImageData, NO_ID, Pixel, Point, RegionPixel} from "../Types"
import {NumberObject} from "../Utils"
import {logD, writeLog} from "../Log"
import {writeImage} from "../PNG"
import {SVG} from "../SVG/SVG"
import {writeFileSync} from "fs"

export class ColorScanner {
    private constructor() {}

    static async parseColorRegions(imageData: ImageData, delta: number = 20): Promise<Map<ID, ColorRegion>> {
        const colorGrid: Grid<RegionPixel> = imageData.pixelsGrid
            .map((column: Array<Pixel>, y: number) =>
                column.map((color: Pixel, x: number) =>
                    RegionPixel.fromPixel({x: x, y: y}, color)))

        const height = imageData.height
        const width = imageData.width
        const regionsMap = new Map<ID, ColorRegion>()
        const regionsGrid: Grid<ID> = Array.init(height, () => Array.init(width, () => NO_ID))
        const currentId: NumberObject = {it: 0}

        colorGrid.forEach((row: Array<RegionPixel>, y: number) => {
            row.forEach((regionPixel: RegionPixel, x: number) => {
                // Check my previous neighbors and check their colors
                const previousNeighbors: Array<RegionPixel> = Array.from<Direction>(["W", "NW", "N", "NE"])
                    .map(dir => regionPixel.point.shifted(dir, 1))
                    .filter(point => point.x >= 0 && point.x < width && point.y >= 0 && point.y < height)
                    .map(point => colorGrid[point.y][point.x])

                // Don't have previous neighbors?
                if (previousNeighbors.isEmpty()) {
                    // new region with just me! No need to check anything since no neighbors
                    const newRegion = new ColorRegion({id: currentId.it++})
                    newRegion.add(regionPixel)
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
                        .filter(previousRegion => previousRegion.averageColor.closeTo(regionPixel, delta))

                    // There is? Then let's merge!
                    if (toMerge.isNotEmpty()) {
                        // Pick a master, the one with the lowest ID
                        const master = toMerge.sort((a, b) => a.id - b.id).first()
                        if (master) {
                            toMerge.forEach(colorRegionToMerge => {
                                if (colorRegionToMerge !== master) {
                                    master.takeAllColorsFrom(colorRegionToMerge)
                                    regionsMap.set(master.id, master)
                                    regionsMap.delete(colorRegionToMerge.id)
                                }
                            })
                        }
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
                        const delta = regionPixel.difference(region.averageColor).average
                        if (delta < lowestDelta) {
                            lowestDelta = delta
                            bestFit = region
                        }
                    })

                    // I have a best fit, is it within delta?
                    if (bestFit !== ColorRegion.NULL && bestFit.averageColor.closeTo(regionPixel, delta)) {
                        bestFit.add(regionPixel)
                        regionsMap.set(bestFit.id, bestFit)
                        regionsGrid[y][x] = bestFit.id
                    }
                    // None fit me or the delta is too big? Then a new region for myself
                    else {
                        const newRegion = new ColorRegion({id: currentId.it++})
                        newRegion.add(regionPixel)
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

        logD(`Writing Before Reduce Images...`)

        await this.writeImage(`./out/beforeReduce.png`, regionsMap, width, height)
        await this.writeImage(`./out/beforeReduceLarge.png`, regionsMap, width, height, r => {
            if (r.totalPixels < 9) r.averageColor = Pixel.MAGENTA
        })
        await this.writeImage(`./out/beforeReduceSmall.png`, regionsMap, width, height, r => {
            if (r.totalPixels >= 9) r.averageColor = Pixel.ZERO
        })
        await this.writeImage(`./out/beforeReduceRandom.png`, regionsMap, width, height, r => r.averageColor = Pixel.random())

        logD(`Writing Before Reduce Edges...`)

        await this.writeImageRegionEdges(`./out/beforeEdges.png`, regionsMap, width, height)

        logD(`Writing Before Reduce SVG...`)

        writeFileSync(`./out/before.svg`, SVG.colorRegionsToSVG(regionsMap.valuesArray(), height, width))

        logD(`Reducing...`)

        const reduced = this.reduceColorRegions(regionsMap, regionsGrid)

        logD(`Reduced Regions: ${reduced.size.comma()}`)

        logD(`Writing After Reduce Images...`)

        await this.writeImage(`./out/afterReduce.png`, reduced, width, height)
        await this.writeImage(`./out/afterReduceLarge.png`, reduced, width, height, r => {
            if (r.totalPixels < 9) r.averageColor = Pixel.MAGENTA
        })
        await this.writeImage(`./out/afterReduceSmall.png`, reduced, width, height, r => {
            if (r.totalPixels >= 9) r.averageColor = Pixel.ZERO
        })
        await this.writeImage(`./out/afterReduceRandom.png`, reduced, width, height, r => r.averageColor = Pixel.random())

        logD(`Writing After Reduce Edges...`)

        await this.writeImageRegionEdges(`./out/afterEdges.png`, reduced, width, height)

        logD(`Writing After Reduce SVG...`)

        writeFileSync(`./out/after.svg`, SVG.colorRegionsToSVG(reduced.valuesArray(), height, width))

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
                    const neighbors: Array<ColorRegion> = new Point({x: x, y: y}).allNeighbors
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

    // TODO new way of reduce is instead to re-run the region parser but have higher delta thresholds
    //  this way we're not forcing merges we're just slowly pushing them in that direction so that we can still
    //  have small-ish regions but hopefully ones that make sense

    static regionsToPolygons(regions: Array<ColorRegion>): Array<ColorRegion> {
        return regions.onEach(region => region.calculateEdgePixels())
    }

    static async writeImageRegionEdges(path: string, regions: Map<ID, ColorRegion>, width: number, height: number) {
        this.regionsToPolygons(regions.valuesArray())
        const grid: Grid<Pixel> = Array.init(height, () => Array.init(width, () => Pixel.ZERO))
        regions.forEach(region => region.edgePixels.forEach(pixel => grid[pixel.y][pixel.x] = region.averageColor))
        await writeImage(path, ImageData.fromPixelsGrid(grid))
    }

    static regionsToColorGrid(regions: Array<ColorRegion>, width: number, height: number): Grid<Pixel> {
        const result = Array.init(height, () => Array.init(width, () => Pixel.ZERO))
        regions.forEach(region => region.pixels.forEach(pixel => result[pixel.y][pixel.x] = region.averageColor))
        return result
    }

    static async writeImage(path: string, regions: Map<ID, ColorRegion>, width: number, height: number,
                            onEach: (r: ColorRegion) => any = emptyFunction) {
        await writeImage(path,
            ImageData.fromPixelsGrid(
                this.regionsToColorGrid(regions.valuesArray().map(r => r.copy()).onEach(r => onEach(r)), width, height))
        )
    }
}