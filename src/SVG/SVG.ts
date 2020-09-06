import {ColorRegion} from "../Types";

export class SVG {
    static colorRegionToSVG(colorRegion: ColorRegion): string {
        const svg = ``
        // use colorRegion.edgePixels to make a path and fill the path with colorRegion.averageColor
        // we need to get a first pixel though in a guaranteed deterministic way so that it's the same every time
        return svg
    }
}