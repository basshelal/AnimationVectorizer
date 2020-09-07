import {ColorRegion, RegionPixel} from "../Types"

export class SVG {
    private constructor() {}

    // TODO use colorRegion.edgePixels to make a path and fill the path with colorRegion.averageColor
    //  we need to get a first pixel though in a guaranteed deterministic way so that it's the same every time
    //  we need to convert the edge pixels into paths because they may not be adjacent :/
    static colorRegionsToSVG(colorRegions: Array<ColorRegion>, height: number, width: number): string {
        let svg = SVG.headBoilerplate
        svg += ` width="${width}" height="${height}">`
        colorRegions.forEach((colorRegion: ColorRegion) => {
            colorRegion.sortEdgePixels()
            let path = `<path d="`
            colorRegion.edgePixels.forEach((edgePixel: RegionPixel, index: number) => {
                if (index === 0) {
                    path += `M${edgePixel.x} ${edgePixel.y}`
                } else {
                    path += `L${edgePixel.x} ${edgePixel.y}`
                }
            })
            path += `" fill="${colorRegion.averageColor.toHex()}"/>`
            svg += path
        })
        svg += `</svg>`
        return svg
    }

    static get headBoilerplate(): string {return `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"`}
}