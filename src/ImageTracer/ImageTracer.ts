// Original Library https://github.com/jankovicsandras/imagetracerjs

import {Options} from "./Options";
import {floor, from, random} from "../Utils";
import {ColorQuantizer} from "./ColorQuantizer";
import {
    BoundingBox,
    Color,
    Direction,
    Grid,
    ImageData,
    IndexedImage,
    Palette,
    Point,
    PointPath,
    Segment,
    SegmentPath,
    TraceData
} from "./Types";
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

// Tracing imageData, then returning traceData (layers with paths, palette, image size)
export function imageDataToTraceData(imageData: ImageData, options: Options): TraceData {
    const indexedImage: IndexedImage = colorQuantization(imageData, options)

    // Loop to trace each color layer
    const layers: Grid<SegmentPath> = indexedImage.palette.map((_, colorIndex: number) => {
            const edges: Grid<number> = edgeDetection(indexedImage, colorIndex)
            const paths: Array<PointPath> = pathScan(edges, options.pathomit)
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
        Array.init(imageData.width + 2, () => -1)
    )

    const paletteSum: Array<{ r: number, g: number, b: number, a: number, n: number }> = []

    const palette: Palette = new ColorQuantizer(imageData.uniqueColors).makePalette(options.colorsNumber)

    logD(`Original image unique colors: ${imageData.uniqueColors.length}`)
    logD(`New Palette colors: ${palette.length}`)

    writeLog(palette, "palette")
    writePixels(palette, "palette")

    logD(`Quantization cycles: ${options.colorquantcycles}, palette size: ${palette.length}\n` +
        `Total loop iterations are: ${(options.colorquantcycles * palette.length * imageData.totalPixels * palette.length).comma()}`)

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
                // TODO fix this! This is non deterministic!
                if ((paletteSum[k].n / imageData.totalPixels < 0) &&
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

        // Resetting palette accumulator for averaging
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
// 3. Walking through an edge node array, discarding edge node types 0 and 15 and creating paths from the rest.

// Edge node types ( ▓: this layer or 1; ░: not this layer or 0 )
// 12  ░░  ▓░  ░▓  ▓▓  ░░  ▓░  ░▓  ▓▓  ░░  ▓░  ░▓  ▓▓  ░░  ▓░  ░▓  ▓▓
// 48  ░░  ░░  ░░  ░░  ▓░  ▓░  ▓░  ▓░  ░▓  ░▓  ░▓  ░▓  ▓▓  ▓▓  ▓▓  ▓▓
//     0   1   2   3   4   5   6   7   8   9   10  11  12  13  14  15
function edgeDetection(indexedImage: IndexedImage, colorNumber: number): Grid<number> {
    const height = indexedImage.height
    const width = indexedImage.width

    // Creating a layer for each indexed color in indexedImage.array
    const pixels: Grid<number> = Array.init(height, () => Array.init(width, () => 0))

    // Looping through all pixels and calculating edge node type
    // TODO why are we starting from 1?? Anything else breaks :/
    //  probably has to do with the +2 we saw earlier
    from(1).to(height).forEach(y => {
        from(1).to(width).forEach(x => {
            pixels[y][x] =
                (indexedImage.array[y - 1][x - 1] === colorNumber ? 1 : 0) +    // top left (1)
                (indexedImage.array[y - 1][x] === colorNumber ? 2 : 0) +        // top right (2)
                (indexedImage.array[y][x] === colorNumber ? 4 : 0) +            // bottom left (4)
                (indexedImage.array[y][x - 1] === colorNumber ? 8 : 0)          // bottom right (8)
        })
    })
    return pixels
}

// Walk directions (dir): 0 > ; 1 ^ ; 2 < ; 3 v
function pathScan(grid: Grid<number>, pathOmit: number): Array<PointPath> {
    let paths: Array<PointPath> = []
    const width = grid[0].length
    const height = grid.length

    let pathCount = 0
    from(0).to(height).forEach(y => {
        from(0).to(width).forEach(x => {
            if ((grid[y][x] === 4) || (grid[y][x] === 11)) { // Other values are not valid // TODO why????

                // Init
                let px = x
                let py = y
                paths[pathCount] = {
                    points: [],
                    boundingBox: new BoundingBox({x1: px, y1: py, x2: px, y2: py}),
                    holeChildren: [],
                    isHolePath: false
                };
                let pathFinished = false
                let pointCount = 0
                let holePath = (grid[y][x] == 11)
                let dir = 1

                // Path points loop
                while (!pathFinished) {

                    // New path point
                    paths[pathCount].points[pointCount] = new Point({
                        x: px - 1,
                        y: py - 1,
                        lineSegment: null
                    })

                    // Bounding box
                    if ((px - 1) < paths[pathCount].boundingBox.x1) {
                        paths[pathCount].boundingBox.x1 = px - 1
                    }
                    if ((px - 1) > paths[pathCount].boundingBox.x2) {
                        paths[pathCount].boundingBox.x2 = px - 1
                    }
                    if ((py - 1) < paths[pathCount].boundingBox.y1) {
                        paths[pathCount].boundingBox.y1 = py - 1
                    }
                    if ((py - 1) > paths[pathCount].boundingBox.y2) {
                        paths[pathCount].boundingBox.y2 = py - 1
                    }

                    // Next: look up the replacement, direction and coordinate changes = clear this cell, turn if required, walk forward
                    const lookupRow = pathScanCombinedLookup[grid[py][px]][dir]
                    grid[py][px] = lookupRow[0]
                    dir = lookupRow[1]
                    px += lookupRow[2]
                    py += lookupRow[3]

                    // Close path
                    if ((px - 1 === paths[pathCount].points[0].x) && (py - 1 === paths[pathCount].points[0].y)) {
                        pathFinished = true

                        // Discarding paths shorter than pathOmit
                        if (paths[pathCount].points.length < pathOmit) {
                            paths.pop()
                        } else {

                            paths[pathCount].isHolePath = holePath;

                            // Finding the parent shape for this hole
                            if (holePath) {

                                let parentIndex = 0
                                let parentbbox = new BoundingBox({x1: -1, y1: -1, x2: width + 1, y2: height + 1})
                                from(0).to(pathCount).forEach(parent => {
                                    if ((!paths[parent].isHolePath) &&
                                        paths[parent].boundingBox.includes(paths[pathCount].boundingBox) &&
                                        parentbbox.includes(paths[parent].boundingBox) &&
                                        paths[pathCount].points[0].isInPolygon(paths[parent].points)
                                    ) {
                                        parentIndex = parent;
                                        parentbbox = paths[parent].boundingBox
                                    }
                                })

                                paths[parentIndex].holeChildren.push(pathCount)

                            }// End of holePath parent finding
                            pathCount++
                        }
                    }// End of Close path
                    pointCount++
                }// End of Path points loop
            }// End of Follow path
        })
    })
    return paths
}

// 4. interpolating between path points for nodes with 8 directions ( East, SouthEast, S, SW, W, NW, N, NE )
function interNodes(paths: Array<PointPath>): Array<PointPath> {
    const ins: Array<PointPath> = []

    from(0).to(paths.length).forEach(path => {
        ins[path] = PointPath.fromPath(paths[path])
        const pathLength = paths[path].points.length

        from(0).to(pathLength).forEach(point => {
            // next and previous point indexes
            let nextidx = (point + 1) % pathLength
            let nextidx2 = (point + 2) % pathLength
            let previdx = (point - 1 + pathLength) % pathLength
            let previdx2 = (point - 2 + pathLength) % pathLength

            // right angle enhance
            if (testRightAngle(paths[path], previdx2, previdx, point, nextidx, nextidx2)) {

                // Fix previous direction
                if (ins[path].points.length > 0) {
                    ins[path].points[ins[path].points.length - 1].lineSegment = getDirection(
                        ins[path].points[ins[path].points.length - 1].x,
                        ins[path].points[ins[path].points.length - 1].y,
                        paths[path].points[point].x,
                        paths[path].points[point].y
                    );
                }

                // This corner point
                ins[path].points.push(new Point({
                    x: paths[path].points[point].x,
                    y: paths[path].points[point].y,
                    lineSegment: getDirection(
                        paths[path].points[point].x,
                        paths[path].points[point].y,
                        ((paths[path].points[point].x + paths[path].points[nextidx].x) / 2),
                        ((paths[path].points[point].y + paths[path].points[nextidx].y) / 2)
                    )
                }))

            }// End of right angle enhance

            // interpolate between two path points
            ins[path].points.push(new Point({
                x: ((paths[path].points[point].x + paths[path].points[nextidx].x) / 2),
                y: ((paths[path].points[point].y + paths[path].points[nextidx].y) / 2),
                lineSegment: getDirection(
                    ((paths[path].points[point].x + paths[path].points[nextidx].x) / 2),
                    ((paths[path].points[point].y + paths[path].points[nextidx].y) / 2),
                    ((paths[path].points[nextidx].x + paths[path].points[nextidx2].x) / 2),
                    ((paths[path].points[nextidx].y + paths[path].points[nextidx2].y) / 2)
                )
            }))
        })
    })
    return ins
}

function testRightAngle(path: PointPath, idx1: number, idx2: number, idx3: number, idx4: number, idx5: number): boolean {
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

function getDirection(x1: number, y1: number, x2: number, y2: number): Direction {
    let dir: Direction
    if (x1 < x2) { // East
        if (y1 < y2) dir = "SE"
        else if (y1 > y2) dir = "NE"
        else dir = "E"
    } else if (x1 > x2) { // West
        if (y1 < y2) dir = "SW"
        else if (y1 > y2) dir = "NW"
        else dir = "W"
    } else {
        if (y1 < y2) dir = "S"
        else if (y1 > y2) dir = "N"
        else dir = null // this should not happen
    }
    return dir
}

// 5.2. - 5.6. recursively fitting a straight or quadratic line segment on this sequence of path nodes,

function tracePath(path: PointPath, ltres: number, qtres: number): SegmentPath {
    const smp: SegmentPath = SegmentPath.fromPath(path)

    let pointCount = 0
    while (pointCount < path.points.length) {
        // 5.1. Find sequences of points with only 2 segment types
        let segtype1: Direction = path.points[pointCount].lineSegment
        let segtype2: Direction = null
        let seqend = pointCount + 1
        while (((path.points[seqend].lineSegment === segtype1) ||
            (path.points[seqend].lineSegment === segtype2) ||
            (segtype2 === null)) && (seqend < path.points.length - 1)) {

            if ((path.points[seqend].lineSegment !== segtype1) && (segtype2 === null)) {
                segtype2 = path.points[seqend].lineSegment
            }
            seqend++
        }
        if (seqend === path.points.length - 1) {
            seqend = 0
        }

        // 5.2. - 5.6. Split sequence and recursively apply 5.2. - 5.6. to startpoint-splitpoint and splitpoint-endpoint sequences
        smp.segments = smp.segments.concat(fitSeq(path, ltres, qtres, pointCount, seqend))

        // forward pointCount;
        if (seqend > 0) {
            pointCount = seqend
        } else {
            pointCount = path.points.length
        }

    }

    return smp
}

// called from tracePath()
function fitSeq(path: PointPath, ltres: number, qtres: number, seqstart: number, seqend: number): Array<any> {
    // return if invalid seqend
    if ((seqend > path.points.length) || (seqend < 0)) return []
    // variables
    let errorpoint = seqstart
    let errorval = 0
    let curvepass = true
    let px
    let py
    let dist2
    let tl = (seqend - seqstart)
    if (tl < 0) {
        tl += path.points.length
    }
    let vx = (path.points[seqend].x - path.points[seqstart].x) / tl
    let vy = (path.points[seqend].y - path.points[seqstart].y) / tl

    // 5.2. Fit a straight line on the sequence
    let pcnt = (seqstart + 1) % path.points.length, pl
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
        }]
    }

    // 5.3. If the straight line fails (distance error>ltres), find the point with the biggest error
    let fitpoint = errorpoint;
    curvepass = true;
    errorval = 0;

    // 5.4. Fit a quadratic spline through this point, measure errors on every point in the sequence
    // helpers and projecting to get control point
    let t = (fitpoint - seqstart) / tl
    let t1 = (1 - t) * (1 - t)
    let t2 = 2 * (1 - t) * t
    let t3 = t * t
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
function batchTracePaths(interNodePaths: Array<PointPath>, ltres: number, qtres: number): Array<SegmentPath> {
    return interNodePaths.map(path => tracePath(path, ltres, qtres))
}

// Getting SVG path element string from a traced path
function svgPathString(traceData: TraceData, lnum: number, pathnum: number, options: Options): string {

    let layer = traceData.layers[lnum]
    let smp = layer[pathnum]

    // Starting path element, desc contains layer and path number
    let str = `<path ${traceData.palette[lnum].toSVG} d="`

    // Creating non-hole path string
    if (options.roundcoords === -1) {
        str += `M ${smp.segments[0].x1} ${smp.segments[0].y1} `
        smp.segments.forEach((segment: Segment) => {
            str += `${segment.type} ${segment.x2} ${segment.y2} `
            if (segment.hasOwnProperty('x3')) {
                str += `${segment.x3} ${segment.y3} `
            }
        })
        str += `Z `
    } else {
        str += `M ${smp.segments[0].x1.roundToDec(options.roundcoords)} ${smp.segments[0].y1.roundToDec(options.roundcoords)} `
        smp.segments.forEach((segment: Segment) => {
            str += `${segment.type} ${segment.x2.roundToDec(options.roundcoords)} ${segment.y2.roundToDec(options.roundcoords)} `
            if (segment.hasOwnProperty('x3')) {
                str += `${segment.x3.roundToDec(options.roundcoords)} ${segment.y3.roundToDec(options.roundcoords)} `
            }
        })
        str += `Z `
    }// End of creating non-hole path string

    // Hole children
    for (let hcnt = 0; hcnt < smp.holeChildren.length; hcnt++) {
        let hsmp = layer[smp.holeChildren[hcnt]];
        // Creating hole path string
        if (options.roundcoords === -1) {

            if (hsmp.segments[hsmp.segments.length - 1].hasOwnProperty('x3')) {
                str += `M ${hsmp.segments[hsmp.segments.length - 1].x3} ${hsmp.segments[hsmp.segments.length - 1].y3} `
            } else {
                str += `M ${hsmp.segments[hsmp.segments.length - 1].x2} ${hsmp.segments[hsmp.segments.length - 1].y2} `
            }

            for (let pcnt = hsmp.segments.length - 1; pcnt >= 0; pcnt--) {
                str += `${hsmp.segments[pcnt].type} `
                if (hsmp.segments[pcnt].hasOwnProperty('x3')) {
                    str += `${hsmp.segments[pcnt].x2} ${hsmp.segments[pcnt].y2} `
                }

                str += `${hsmp.segments[pcnt].x1} ${hsmp.segments[pcnt].y1} `
            }

        } else {

            if (hsmp.segments[hsmp.segments.length - 1].hasOwnProperty('x3')) {
                str += `M ${hsmp.segments[hsmp.segments.length - 1].x3.roundToDec()} ${hsmp.segments[hsmp.segments.length - 1].y3.roundToDec()} `
            } else {
                str += `M ${hsmp.segments[hsmp.segments.length - 1].x2.roundToDec()} ${hsmp.segments[hsmp.segments.length - 1].y2.roundToDec()} `
            }

            for (let pcnt = hsmp.segments.length - 1; pcnt >= 0; pcnt--) {
                str += `${hsmp.segments[pcnt].type} `
                if (hsmp.segments[pcnt].hasOwnProperty('x3')) {
                    str += `${hsmp.segments[pcnt].x2.roundToDec()} ${hsmp.segments[pcnt].y2.roundToDec()} `
                }
                str += `${hsmp.segments[pcnt].x1.roundToDec()} ${hsmp.segments[pcnt].y1.roundToDec()} `
            }


        }// End of creating hole path string

        str += `Z ` // Close path

    }// End of holepath check

    // Closing path element
    str += `" />`

    return str

}

/**
 * Converts the passed in `traceData` with the desired `options` into an SVG `string`
 */
function getSvgString(traceData: TraceData, options: Options): string {

    let svg = `<svg width="${traceData.width}" height="${traceData.height}" xmlns="http://www.w3.org/2000/svg" >`

    logD("Converting TraceData to SVG String")

    // Drawing: Layers and Paths loops
    from(0).to(traceData.layers.length).forEach(layerIndex => {
        from(0).to(traceData.layers[layerIndex].length).forEach(pathIndex => {
            // Adding SVG <path> string
            if (!traceData.layers[layerIndex][pathIndex].isHolePath) {
                svg += svgPathString(traceData, layerIndex, pathIndex, options)
            }
        })
    })

    svg += `</svg>`

    logD(`Finished conversion SVG size is ${svg.length.comma()} bytes`)

    return svg
}