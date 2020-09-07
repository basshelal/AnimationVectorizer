import {ColorRegion} from "../Types"

export class SVG {
    private constructor() {}

    static colorRegionToSVG(colorRegion: ColorRegion): string {
        const svg = SVG.headBoilerplate
        colorRegion.sortEdgePixels()
        // use colorRegion.edgePixels to make a path and fill the path with colorRegion.averageColor
        // we need to get a first pixel though in a guaranteed deterministic way so that it's the same every time
        // we need to convert the edge pixels into paths because they may not be adjacent :/
        return svg
    }

    static get headBoilerplate(): string {
        return `<svg version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"`
    }
}