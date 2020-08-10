// Original Library https://github.com/jankovicsandras/imagetracerjs

import {Options} from "./Options";
import {floor, from, random} from "../Utils";
import {ColorQuantizer} from "./ColorQuantizer";
import {Color, Grid, ImageData, IndexedImage, Palette, Path, Point, SMP, TraceData} from "./Types";
import {logD, logW, writeLog, writePixels} from "../Log";

// pathScanCombinedLookup[ arr[py][px] ][ dir ] = [nextarrpypx, nextdir, deltapx, deltapy];
const pathScanCombinedLookup: Array<Grid<number>> = [
    [[-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1]],// arr[py][px]===0 is invalid
    [[0, 1, 0, -1], [-1, -1, -1, -1], [-1, -1, -1, -1], [0, 2, -1, 0]],
    [[-1, -1, -1, -1], [-1, -1, -1, -1], [0, 1, 0, -1], [0, 0, 1, 0]],
    [[0, 0, 1, 0], [-1, -1, -1, -1], [0, 2, -1, 0], [-1, -1, -1, -1]],

    [[-1, -1, -1, -1], [0, 0, 1, 0], [0, 3, 0, 1], [-1, -1, -1, -1]],
    [[13, 3, 0, 1], [13, 2, -1, 0], [7, 1, 0, -1], [7, 0, 1, 0]],
    [[-1, -1, -1, -1], [0, 1, 0, -1], [-1, -1, -1, -1], [0, 3, 0, 1]],
    [[0, 3, 0, 1], [0, 2, -1, 0], [-1, -1, -1, -1], [-1, -1, -1, -1]],

    [[0, 3, 0, 1], [0, 2, -1, 0], [-1, -1, -1, -1], [-1, -1, -1, -1]],
    [[-1, -1, -1, -1], [0, 1, 0, -1], [-1, -1, -1, -1], [0, 3, 0, 1]],
    [[11, 1, 0, -1], [14, 0, 1, 0], [14, 3, 0, 1], [11, 2, -1, 0]],
    [[-1, -1, -1, -1], [0, 0, 1, 0], [0, 3, 0, 1], [-1, -1, -1, -1]],

    [[0, 0, 1, 0], [-1, -1, -1, -1], [0, 2, -1, 0], [-1, -1, -1, -1]],
    [[-1, -1, -1, -1], [-1, -1, -1, -1], [0, 1, 0, -1], [0, 0, 1, 0]],
    [[0, 1, 0, -1], [-1, -1, -1, -1], [-1, -1, -1, -1], [0, 2, -1, 0]],
    [[-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1], [-1, -1, -1, -1]]// arr[py][px]===15 is invalid
]

/**
 * Converts the passed in `imageData` with the desired `options` into an SVG `string`
 */
export function imageDataToSVG(imageData: ImageData, options: Options): string {
    const traceData: TraceData = imageDataToTraceData(imageData, options)
    return getSvgString(traceData, options)
}

// 1. Color quantization

// Tracing imagedata, then returning tracedata (layers with paths, palette, image size)
function imageDataToTraceData(imageData: ImageData, options: Options): TraceData {
    const indexedImage: IndexedImage = colorQuantization(imageData, options)

    // Loop to trace each color layer
    const layers = indexedImage.palette.map((_, colorIndex: number) => {
            const layers: Grid<number> = layeringStep(indexedImage, colorIndex)
            const paths: Array<Path> = pathScan(layers, options.pathomit)
            return batchTracePaths(interNodes(paths), options.lineThreshold, options.qSplineThreshold)
        }
    )
    return new TraceData({
        layers: layers,
        palette: indexedImage.palette,
        width: indexedImage.array[0].length - 2,
        height: indexedImage.array.length - 2
    })
}

// Using a form of k-means clustering repeated `options.colorquantcycles` times. http://en.wikipedia.org/wiki/Color_quantization
function colorQuantization(imageData: ImageData, options: Options): IndexedImage {
    logD("Beginning Color Quantization...")

    imageData.ensureRGBA()

    // TODO why + 2????? Less than 2 fails :/ Has something to do with the pathScan
    //  for a 1 px border perhaps??
    const array: Grid<number> = Array.init(imageData.height + 2, () =>
        Array.init(imageData.width + 2, -1)
    )

    const paletteSum: Array<{ r: number, g: number, b: number, a: number, n: number }> = []

    const palette: Palette = new ColorQuantizer(imageData.uniqueColors).makePalette(options.colorsNumber)

    logD(`Original image unique colors: ${imageData.uniqueColors.length}`)
    logD(`New Palette colors: ${palette.length}`)

    writeLog(palette, "palette")
    writePixels(palette, "palette")

    // Repeat clustering step options.colorquantcycles times
    from(0).to(options.colorquantcycles).forEach((cycle: number) => {

        // Average colors from the second iteration onwards
        if (cycle > 0) {
            // averaging paletteSum for palette
            from(0).to(palette.length).forEach(k => {
                // averaging
                if (paletteSum[k].n > 0) {
                    palette[k] = new Color({
                        r: floor(paletteSum[k].r / paletteSum[k].n),
                        g: floor(paletteSum[k].g / paletteSum[k].n),
                        b: floor(paletteSum[k].b / paletteSum[k].n),
                        a: floor(paletteSum[k].a / paletteSum[k].n)
                    })
                }

                // Randomizing a color, if there are too few pixels and there will be a new cycle
                if ((paletteSum[k].n / imageData.totalPixels < options.mincolorratio) &&
                    (cycle < options.colorquantcycles - 1)) {
                    logW("Randomizing a palette color!")
                    palette[k] = new Color({
                        r: floor(random() * 255),
                        g: floor(random() * 255),
                        b: floor(random() * 255),
                        a: floor(random() * 255)
                    })
                }
            })
        }

        // Reseting palette accumulator for averaging
        from(0).to(palette.length)
            .forEach(i => paletteSum[i] = {r: 0, g: 0, b: 0, a: 0, n: 0})

        // loop through all pixels
        imageData.forEachPixel((y, x, imageColor) => {

            // find closest color from palette by measuring (rectilinear) color distance between this pixel and all palette colors
            let colorIndex = 0
            let lastMinDistance = imageData.isRGBA ? (256 * 4) : (256 * 3) // 4 * 256 is the maximum RGBA distance

            palette.forEach((paletteColor: Color, index: number) => {
                // In my experience, https://en.wikipedia.org/wiki/Rectilinear_distance works better than https://en.wikipedia.org/wiki/Euclidean_distance
                const distance = (paletteColor.r - imageColor.r).abs() +
                    (paletteColor.g - imageColor.g).abs() +
                    (paletteColor.b - imageColor.b).abs() +
                    (paletteColor.a - imageColor.a).abs()

                // Remember this color if this is the closest yet
                if (distance < lastMinDistance) {
                    lastMinDistance = distance
                    colorIndex = index
                }
            })

            // add to paletteSum
            paletteSum[colorIndex].r += imageColor.r
            paletteSum[colorIndex].g += imageColor.g
            paletteSum[colorIndex].b += imageColor.b
            paletteSum[colorIndex].a += imageColor.a
            paletteSum[colorIndex].n++

            // update the indexed color array
            array[y + 1][x + 1] = colorIndex
        })
    })

    writeLog(paletteSum, "paletteSum")
    writeLog(array, "indexedArray")

    writeLog(palette, "palette-1")
    writePixels(palette, "palette-1")

    logD("Finished Color Quantization...")
    logD(`Indexed image is ${array.length} x ${array[0].length} and has ${palette.length} colors in palette`)

    return new IndexedImage({array: array, palette: palette})
}

// 2. Layer separation and edge detection
// Edge node types ( ▓: this layer or 1; ░: not this layer or 0 )
// 12  ░░  ▓░  ░▓  ▓▓  ░░  ▓░  ░▓  ▓▓  ░░  ▓░  ░▓  ▓▓  ░░  ▓░  ░▓  ▓▓
// 48  ░░  ░░  ░░  ░░  ░▓  ░▓  ░▓  ░▓  ▓░  ▓░  ▓░  ▓░  ▓▓  ▓▓  ▓▓  ▓▓

// 3. Walking through an edge node array, discarding edge node types 0 and 15 and creating paths from the rest.

//     0   1   2   3   4   5   6   7   8   9   10  11  12  13  14  15
function layeringStep(indexedImage: IndexedImage, colorNumber: number): Grid<number> {
    const height = indexedImage.array.length
    const width = indexedImage.array[0].length

    // Creating a layer for each indexed color in indexedImage.array
    const layers: Grid<number> = Array.init(height, () => Array.init(width, () => 0))

    // Looping through all pixels and calculating edge node type
    // TODO why are we starting from 1?? Anything else breaks :/
    //  probably has to do with the +2 we saw earlier
    from(1).to(height).forEach(y => {
        from(1).to(width).forEach(x => {
            layers[y][x] =
                (indexedImage.array[y - 1][x - 1] === colorNumber ? 1 : 0) +
                (indexedImage.array[y - 1][x] === colorNumber ? 2 : 0) +
                (indexedImage.array[y][x - 1] === colorNumber ? 8 : 0) +
                (indexedImage.array[y][x] === colorNumber ? 4 : 0)
        })
    })
    return layers
}

function isPointInPolygon(point: Point, polygon: Array<Point>): boolean {
    let isIn = false

    // 2 pointer for loop r being 1 greater than l, and l being max when r == 0
    for (let r = 0, l = polygon.length - 1; r < polygon.length; l = r++) {
        isIn =
            (((polygon[r].y > point.y) !== (polygon[l].y > point.y)) &&
                (point.x <
                    ((polygon[l].x - polygon[r].x) * (point.y - polygon[r].y) / (polygon[l].y - polygon[r].y) + polygon[r].x)
                )) ? !isIn : isIn
    }

    return isIn
}

// Walk directions (dir): 0 > ; 1 ^ ; 2 < ; 3 v
function pathScan(arr: Grid<number>, pathomit: number): Array<Path> {
    let paths: Array<Path> = [],
        pacnt = 0,
        pcnt = 0,
        px = 0,
        py = 0,
        w = arr[0].length,
        h = arr.length,
        dir = 0,
        pathfinished = true,
        holepath = false,
        lookuprow: Array<number>;

    for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
            if ((arr[j][i] == 4) || (arr[j][i] == 11)) { // Other values are not valid

                // Init
                px = i;
                py = j;
                paths[pacnt] = {
                    points: [],
                    boundingBox: [px, py, px, py],
                    holeChildren: [],
                    isHolePath: false
                };
                pathfinished = false;
                pcnt = 0;
                holepath = (arr[j][i] == 11);
                dir = 1;

                // Path points loop
                while (!pathfinished) {

                    // New path point
                    paths[pacnt].points[pcnt] = new Point({
                        x: px - 1,
                        y: py - 1,
                        lineSegment: 0
                    })

                    // Bounding box
                    if ((px - 1) < paths[pacnt].boundingBox[0]) {
                        paths[pacnt].boundingBox[0] = px - 1;
                    }
                    if ((px - 1) > paths[pacnt].boundingBox[2]) {
                        paths[pacnt].boundingBox[2] = px - 1;
                    }
                    if ((py - 1) < paths[pacnt].boundingBox[1]) {
                        paths[pacnt].boundingBox[1] = py - 1;
                    }
                    if ((py - 1) > paths[pacnt].boundingBox[3]) {
                        paths[pacnt].boundingBox[3] = py - 1;
                    }

                    // Next: look up the replacement, direction and coordinate changes = clear this cell, turn if required, walk forward
                    lookuprow = pathScanCombinedLookup[arr[py][px]][dir];
                    arr[py][px] = lookuprow[0];
                    dir = lookuprow[1];
                    px += lookuprow[2];
                    py += lookuprow[3];

                    // Close path
                    if ((px - 1 === paths[pacnt].points[0].x) && (py - 1 === paths[pacnt].points[0].y)) {
                        pathfinished = true;

                        // Discarding paths shorter than pathomit
                        if (paths[pacnt].points.length < pathomit) {
                            paths.pop();
                        } else {

                            paths[pacnt].isHolePath = holepath;

                            // Finding the parent shape for this hole
                            if (holepath) {

                                let parentidx = 0, parentbbox = [-1, -1, w + 1, h + 1];
                                for (let parentcnt = 0; parentcnt < pacnt; parentcnt++) {
                                    if ((!paths[parentcnt].isHolePath) &&
                                        boundingBoxIncludes(paths[parentcnt].boundingBox, paths[pacnt].boundingBox) &&
                                        boundingBoxIncludes(parentbbox, paths[parentcnt].boundingBox) &&
                                        isPointInPolygon(paths[pacnt].points[0], paths[parentcnt].points)
                                    ) {
                                        parentidx = parentcnt;
                                        parentbbox = paths[parentcnt].boundingBox;
                                    }
                                }

                                paths[parentidx].holeChildren.push(pacnt);

                            }// End of holepath parent finding

                            pacnt++;

                        }

                    }// End of Close path

                    pcnt++;

                }// End of Path points loop

            }// End of Follow path

        }// End of i loop
    }// End of j loop

    return paths
}

function boundingBoxIncludes(parentbbox: Array<any>, childbbox: Array<any>): boolean {
    return ((parentbbox[0] < childbbox[0]) && (parentbbox[1] < childbbox[1]) && (parentbbox[2] > childbbox[2]) && (parentbbox[3] > childbbox[3]));
}

// 4. interpollating between path points for nodes with 8 directions ( East, SouthEast, S, SW, W, NW, N, NE )
function interNodes(paths: Array<Path>): Array<Path> {
    const ins: Array<Path> = []

    // paths loop
    for (let pacnt = 0; pacnt < paths.length; pacnt++) {

        ins[pacnt] = {
            points: [],
            boundingBox: paths[pacnt].boundingBox,
            holeChildren: paths[pacnt].holeChildren,
            isHolePath: paths[pacnt].isHolePath
        }
        let palen = paths[pacnt].points.length;

        // pathpoints loop
        for (let pcnt = 0; pcnt < palen; pcnt++) {

            // next and previous point indexes
            let nextidx = (pcnt + 1) % palen;
            let nextidx2 = (pcnt + 2) % palen;
            let previdx = (pcnt - 1 + palen) % palen;
            let previdx2 = (pcnt - 2 + palen) % palen;

            // right angle enhance
            if (testRightAngle(paths[pacnt], previdx2, previdx, pcnt, nextidx, nextidx2)) {

                // Fix previous direction
                if (ins[pacnt].points.length > 0) {
                    ins[pacnt].points[ins[pacnt].points.length - 1].lineSegment = getDirection(
                        ins[pacnt].points[ins[pacnt].points.length - 1].x,
                        ins[pacnt].points[ins[pacnt].points.length - 1].y,
                        paths[pacnt].points[pcnt].x,
                        paths[pacnt].points[pcnt].y
                    );
                }

                // This corner point
                ins[pacnt].points.push(new Point({
                    x: paths[pacnt].points[pcnt].x,
                    y: paths[pacnt].points[pcnt].y,
                    lineSegment: getDirection(
                        paths[pacnt].points[pcnt].x,
                        paths[pacnt].points[pcnt].y,
                        ((paths[pacnt].points[pcnt].x + paths[pacnt].points[nextidx].x) / 2),
                        ((paths[pacnt].points[pcnt].y + paths[pacnt].points[nextidx].y) / 2)
                    )
                }))

            }// End of right angle enhance

            // interpolate between two path points
            ins[pacnt].points.push(new Point({
                x: ((paths[pacnt].points[pcnt].x + paths[pacnt].points[nextidx].x) / 2),
                y: ((paths[pacnt].points[pcnt].y + paths[pacnt].points[nextidx].y) / 2),
                lineSegment: getDirection(
                    ((paths[pacnt].points[pcnt].x + paths[pacnt].points[nextidx].x) / 2),
                    ((paths[pacnt].points[pcnt].y + paths[pacnt].points[nextidx].y) / 2),
                    ((paths[pacnt].points[nextidx].x + paths[pacnt].points[nextidx2].x) / 2),
                    ((paths[pacnt].points[nextidx].y + paths[pacnt].points[nextidx2].y) / 2)
                )
            }))
        }
    }
    return ins
}

function testRightAngle(path: Path, idx1: number, idx2: number, idx3: number, idx4: number, idx5: number): boolean {
    return (((path.points[idx3].x === path.points[idx1].x) &&
            (path.points[idx3].x === path.points[idx2].x) &&
            (path.points[idx3].y === path.points[idx4].y) &&
            (path.points[idx3].y === path.points[idx5].y)
        ) ||
        ((path.points[idx3].y === path.points[idx1].y) &&
            (path.points[idx3].y === path.points[idx2].y) &&
            (path.points[idx3].x === path.points[idx4].x) &&
            (path.points[idx3].x === path.points[idx5].x)
        )
    );
}

// 5. tracePath() : recursively trying to fit straight and quadratic spline segments on the 8 direction internode path

// 5.1. Find sequences of points with only 2 segment types
// 5.2. Fit a straight line on the sequence
// 5.3. If the straight line fails (distance error > ltres), find the point with the biggest error
// 5.4. Fit a quadratic spline through errorpoint (project this to get controlpoint), then measure errors on every point in the sequence
// 5.5. If the spline fails (distance error > qtres), find the point with the biggest error, set splitpoint = fitting point
// 5.6. Split sequence and recursively apply 5.2. - 5.6. to startpoint-splitpoint and splitpoint-endpoint sequences

function getDirection(x1: number, y1: number, x2: number, y2: number): number {
    let val: number
    if (x1 < x2) {
        if (y1 < y2) val = 1 // SouthEast
        else if (y1 > y2) val = 7 // NE
        else val = 0 // E
    } else if (x1 > x2) {
        if (y1 < y2) val = 3 // SW
        else if (y1 > y2) val = 5 // NW
        else val = 4 // W
    } else {
        if (y1 < y2) val = 2 // S
        else if (y1 > y2) val = 6 // N
        else val = 8 // center, this should not happen
    }
    return val
}

// 5.2. - 5.6. recursively fitting a straight or quadratic line segment on this sequence of path nodes,

function tracePath(path: Path, ltres: number, qtres: number): SMP {
    let pcnt = 0,
        segtype1,
        segtype2,
        seqend;

    const smp: SMP = {
        segments: [],
        boundingBox: path.boundingBox,
        holeChildren: path.holeChildren,
        isHolePath: path.isHolePath
    }

    while (pcnt < path.points.length) {
        // 5.1. Find sequences of points with only 2 segment types
        segtype1 = path.points[pcnt].lineSegment;
        segtype2 = -1;
        seqend = pcnt + 1;
        while (
            ((path.points[seqend].lineSegment === segtype1) || (path.points[seqend].lineSegment === segtype2) || (segtype2 === -1))
            && (seqend < path.points.length - 1)) {

            if ((path.points[seqend].lineSegment !== segtype1) && (segtype2 === -1)) {
                segtype2 = path.points[seqend].lineSegment;
            }
            seqend++;

        }
        if (seqend === path.points.length - 1) {
            seqend = 0;
        }

        // 5.2. - 5.6. Split sequence and recursively apply 5.2. - 5.6. to startpoint-splitpoint and splitpoint-endpoint sequences
        smp.segments = smp.segments.concat(fitSeq(path, ltres, qtres, pcnt, seqend));

        // forward pcnt;
        if (seqend > 0) {
            pcnt = seqend;
        } else {
            pcnt = path.points.length;
        }

    }

    return smp
}

// called from tracePath()
function fitSeq(path: Path, ltres: number, qtres: number, seqstart: number, seqend: number): Array<any> {
    // return if invalid seqend
    if ((seqend > path.points.length) || (seqend < 0)) {
        return [];
    }
    // variables
    let errorpoint = seqstart, errorval = 0, curvepass = true, px, py, dist2;
    let tl = (seqend - seqstart);
    if (tl < 0) {
        tl += path.points.length;
    }
    let vx = (path.points[seqend].x - path.points[seqstart].x) / tl,
        vy = (path.points[seqend].y - path.points[seqstart].y) / tl;

    // 5.2. Fit a straight line on the sequence
    let pcnt = (seqstart + 1) % path.points.length, pl;
    while (pcnt != seqend) {
        pl = pcnt - seqstart;
        if (pl < 0) {
            pl += path.points.length;
        }
        px = path.points[seqstart].x + vx * pl;
        py = path.points[seqstart].y + vy * pl;
        dist2 = (path.points[pcnt].x - px) * (path.points[pcnt].x - px) + (path.points[pcnt].y - py) * (path.points[pcnt].y - py);
        if (dist2 > ltres) {
            curvepass = false;
        }
        if (dist2 > errorval) {
            errorpoint = pcnt;
            errorval = dist2;
        }
        pcnt = (pcnt + 1) % path.points.length;
    }
    // return straight line if fits
    if (curvepass) {
        return [{
            type: 'L',
            x1: path.points[seqstart].x,
            y1: path.points[seqstart].y,
            x2: path.points[seqend].x,
            y2: path.points[seqend].y
        }];
    }

    // 5.3. If the straight line fails (distance error>ltres), find the point with the biggest error
    let fitpoint = errorpoint;
    curvepass = true;
    errorval = 0;

    // 5.4. Fit a quadratic spline through this point, measure errors on every point in the sequence
    // helpers and projecting to get control point
    let t = (fitpoint - seqstart) / tl, t1 = (1 - t) * (1 - t), t2 = 2 * (1 - t) * t, t3 = t * t;
    let cpx = (t1 * path.points[seqstart].x + t3 * path.points[seqend].x - path.points[fitpoint].x) / -t2,
        cpy = (t1 * path.points[seqstart].y + t3 * path.points[seqend].y - path.points[fitpoint].y) / -t2;

    // Check every point
    pcnt = seqstart + 1;
    while (pcnt != seqend) {
        t = (pcnt - seqstart) / tl;
        t1 = (1 - t) * (1 - t);
        t2 = 2 * (1 - t) * t;
        t3 = t * t;
        px = t1 * path.points[seqstart].x + t2 * cpx + t3 * path.points[seqend].x;
        py = t1 * path.points[seqstart].y + t2 * cpy + t3 * path.points[seqend].y;

        dist2 = (path.points[pcnt].x - px) * (path.points[pcnt].x - px) + (path.points[pcnt].y - py) * (path.points[pcnt].y - py);

        if (dist2 > qtres) {
            curvepass = false;
        }
        if (dist2 > errorval) {
            errorpoint = pcnt;
            errorval = dist2;
        }
        pcnt = (pcnt + 1) % path.points.length;
    }
    // return spline if fits
    if (curvepass) {
        return [{
            type: 'Q',
            x1: path.points[seqstart].x,
            y1: path.points[seqstart].y,
            x2: cpx,
            y2: cpy,
            x3: path.points[seqend].x,
            y3: path.points[seqend].y
        }];
    }
    // 5.5. If the spline fails (distance error>qtres), find the point with the biggest error
    let splitpoint = fitpoint; // Earlier: floor((fitpoint + errorpoint)/2);

    // 5.6. Split sequence and recursively apply 5.2. - 5.6. to startpoint-splitpoint and splitpoint-endpoint sequences
    return fitSeq(path, ltres, qtres, seqstart, splitpoint).concat(
        fitSeq(path, ltres, qtres, splitpoint, seqend));

}

// 5. Batch tracing paths
function batchTracePaths(interNodePaths: Array<Path>, ltres: number, qtres: number): Array<SMP> {
    return interNodePaths.map(path => tracePath(path, ltres, qtres))
}

// Getting SVG path element string from a traced path
function svgPathString(tracedata: TraceData, lnum: number, pathnum: number, options: Options): string {

    let layer = tracedata.layers[lnum],
        smp = layer[pathnum],
        str = "",
        pcnt

    // Line filter
    if (options.lineFilter && (smp.segments.length < 3)) {
        return str;
    }

    // Starting path element, desc contains layer and path number
    str = `<path ${tracedata.palette[lnum].toSVGString()} d="`

    // Creating non-hole path string
    if (options.roundcoords === -1) {
        str += 'M ' + smp.segments[0].x1 * options.scale + ' ' + smp.segments[0].y1 * options.scale + ' ';
        for (pcnt = 0; pcnt < smp.segments.length; pcnt++) {
            str += smp.segments[pcnt].type + ' ' + smp.segments[pcnt].x2 * options.scale + ' ' + smp.segments[pcnt].y2 * options.scale + ' ';
            if (smp.segments[pcnt].hasOwnProperty('x3')) {
                str += smp.segments[pcnt].x3 * options.scale + ' ' + smp.segments[pcnt].y3 * options.scale + ' ';
            }
        }
        str += 'Z ';
    } else {
        str += 'M ' + roundToDec(smp.segments[0].x1 * options.scale, options.roundcoords) + ' ' + roundToDec(smp.segments[0].y1 * options.scale, options.roundcoords) + ' ';
        for (pcnt = 0; pcnt < smp.segments.length; pcnt++) {
            str += smp.segments[pcnt].type + ' ' + roundToDec(smp.segments[pcnt].x2 * options.scale, options.roundcoords) + ' ' + roundToDec(smp.segments[pcnt].y2 * options.scale, options.roundcoords) + ' ';
            if (smp.segments[pcnt].hasOwnProperty('x3')) {
                str += roundToDec(smp.segments[pcnt].x3 * options.scale, options.roundcoords) + ' ' + roundToDec(smp.segments[pcnt].y3 * options.scale, options.roundcoords) + ' ';
            }
        }
        str += 'Z ';
    }// End of creating non-hole path string

    // Hole children
    for (let hcnt = 0; hcnt < smp.holeChildren.length; hcnt++) {
        let hsmp = layer[smp.holeChildren[hcnt]];
        // Creating hole path string
        if (options.roundcoords === -1) {

            if (hsmp.segments[hsmp.segments.length - 1].hasOwnProperty('x3')) {
                str += 'M ' + hsmp.segments[hsmp.segments.length - 1].x3 * options.scale + ' ' + hsmp.segments[hsmp.segments.length - 1].y3 * options.scale + ' ';
            } else {
                str += 'M ' + hsmp.segments[hsmp.segments.length - 1].x2 * options.scale + ' ' + hsmp.segments[hsmp.segments.length - 1].y2 * options.scale + ' ';
            }

            for (pcnt = hsmp.segments.length - 1; pcnt >= 0; pcnt--) {
                str += hsmp.segments[pcnt].type + ' ';
                if (hsmp.segments[pcnt].hasOwnProperty('x3')) {
                    str += hsmp.segments[pcnt].x2 * options.scale + ' ' + hsmp.segments[pcnt].y2 * options.scale + ' ';
                }

                str += hsmp.segments[pcnt].x1 * options.scale + ' ' + hsmp.segments[pcnt].y1 * options.scale + ' ';
            }

        } else {

            if (hsmp.segments[hsmp.segments.length - 1].hasOwnProperty('x3')) {
                str += 'M ' + roundToDec(hsmp.segments[hsmp.segments.length - 1].x3 * options.scale) + ' ' + roundToDec(hsmp.segments[hsmp.segments.length - 1].y3 * options.scale) + ' ';
            } else {
                str += 'M ' + roundToDec(hsmp.segments[hsmp.segments.length - 1].x2 * options.scale) + ' ' + roundToDec(hsmp.segments[hsmp.segments.length - 1].y2 * options.scale) + ' ';
            }

            for (pcnt = hsmp.segments.length - 1; pcnt >= 0; pcnt--) {
                str += hsmp.segments[pcnt].type + ' ';
                if (hsmp.segments[pcnt].hasOwnProperty('x3')) {
                    str += roundToDec(hsmp.segments[pcnt].x2 * options.scale) + ' ' + roundToDec(hsmp.segments[pcnt].y2 * options.scale) + ' ';
                }
                str += roundToDec(hsmp.segments[pcnt].x1 * options.scale) + ' ' + roundToDec(hsmp.segments[pcnt].y1 * options.scale) + ' ';
            }


        }// End of creating hole path string

        str += 'Z '; // Close path

    }// End of holepath check

    // Closing path element
    str += '" />';

    // Rendering control points
    if (options.lcpr || options.qcpr) {
        for (pcnt = 0; pcnt < smp.segments.length; pcnt++) {
            if (smp.segments[pcnt].hasOwnProperty('x3') && options.qcpr) {
                str += '<circle cx="' + smp.segments[pcnt].x2 * options.scale + '" cy="' + smp.segments[pcnt].y2 * options.scale + '" r="' + options.qcpr + '" fill="cyan" stroke-width="' + options.qcpr * 0.2 + '" stroke="black" />';
                str += '<circle cx="' + smp.segments[pcnt].x3 * options.scale + '" cy="' + smp.segments[pcnt].y3 * options.scale + '" r="' + options.qcpr + '" fill="white" stroke-width="' + options.qcpr * 0.2 + '" stroke="black" />';
                str += '<line x1="' + smp.segments[pcnt].x1 * options.scale + '" y1="' + smp.segments[pcnt].y1 * options.scale + '" x2="' + smp.segments[pcnt].x2 * options.scale + '" y2="' + smp.segments[pcnt].y2 * options.scale + '" stroke-width="' + options.qcpr * 0.2 + '" stroke="cyan" />';
                str += '<line x1="' + smp.segments[pcnt].x2 * options.scale + '" y1="' + smp.segments[pcnt].y2 * options.scale + '" x2="' + smp.segments[pcnt].x3 * options.scale + '" y2="' + smp.segments[pcnt].y3 * options.scale + '" stroke-width="' + options.qcpr * 0.2 + '" stroke="cyan" />';
            }
            if ((!smp.segments[pcnt].hasOwnProperty('x3')) && options.lcpr) {
                str += '<circle cx="' + smp.segments[pcnt].x2 * options.scale + '" cy="' + smp.segments[pcnt].y2 * options.scale + '" r="' + options.lcpr + '" fill="white" stroke-width="' + options.lcpr * 0.2 + '" stroke="black" />';
            }
        }

        // Hole children control points
        for (let hcnt = 0; hcnt < smp.holeChildren.length; hcnt++) {
            let hsmp = layer[smp.holeChildren[hcnt]];
            for (pcnt = 0; pcnt < hsmp.segments.length; pcnt++) {
                if (hsmp.segments[pcnt].hasOwnProperty('x3') && options.qcpr) {
                    str += '<circle cx="' + hsmp.segments[pcnt].x2 * options.scale + '" cy="' + hsmp.segments[pcnt].y2 * options.scale + '" r="' + options.qcpr + '" fill="cyan" stroke-width="' + options.qcpr * 0.2 + '" stroke="black" />';
                    str += '<circle cx="' + hsmp.segments[pcnt].x3 * options.scale + '" cy="' + hsmp.segments[pcnt].y3 * options.scale + '" r="' + options.qcpr + '" fill="white" stroke-width="' + options.qcpr * 0.2 + '" stroke="black" />';
                    str += '<line x1="' + hsmp.segments[pcnt].x1 * options.scale + '" y1="' + hsmp.segments[pcnt].y1 * options.scale + '" x2="' + hsmp.segments[pcnt].x2 * options.scale + '" y2="' + hsmp.segments[pcnt].y2 * options.scale + '" stroke-width="' + options.qcpr * 0.2 + '" stroke="cyan" />';
                    str += '<line x1="' + hsmp.segments[pcnt].x2 * options.scale + '" y1="' + hsmp.segments[pcnt].y2 * options.scale + '" x2="' + hsmp.segments[pcnt].x3 * options.scale + '" y2="' + hsmp.segments[pcnt].y3 * options.scale + '" stroke-width="' + options.qcpr * 0.2 + '" stroke="cyan" />';
                }
                if ((!hsmp.segments[pcnt].hasOwnProperty('x3')) && options.lcpr) {
                    str += '<circle cx="' + hsmp.segments[pcnt].x2 * options.scale + '" cy="' + hsmp.segments[pcnt].y2 * options.scale + '" r="' + options.lcpr + '" fill="white" stroke-width="' + options.lcpr * 0.2 + '" stroke="black" />';
                }
            }
        }
    }// End of Rendering control points

    return str;

}

function roundToDec(val: number, places: number = 0): number {
    return +val.toFixed(places)
}

/**
 * Converts the passed in `traceData` with the desired `options` into an SVG `string`
 */
function getSvgString(traceData: TraceData, options: Options): string {

    let svgString = `<svg width="${traceData.width}" height="${traceData.height}" xmlns="http://www.w3.org/2000/svg" >`

    logD("Converting TraceData to SVG String")

    // Drawing: Layers and Paths loops
    from(0).to(traceData.layers.length).forEach(layerIndex => {
        from(0).to(traceData.layers[layerIndex].length).forEach(pathIndex => {
            // Adding SVG <path> string
            if (!traceData.layers[layerIndex][pathIndex].isHolePath) {
                svgString += svgPathString(traceData, layerIndex, pathIndex, options);
            }
        })
    })

    svgString += '</svg>'

    logD(`Finished conversion SVG size is ${svgString.length} bytes`)

    return svgString

}

