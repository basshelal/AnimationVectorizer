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
    PointPath,
    Segment,
    SegmentPath,
    SegmentPoint,
    TraceData
} from "../Types";
import {logD, logW, writeLog, writeLogImage, writePixels} from "../Log";

let iterationCount: number = 0

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
    iterationCount = 0
    const traceData: TraceData = imageDataToTraceData(imageData, options)
    return getSvgString(traceData, options)
}

// 1. Color quantization

// Tracing imageData, then returning traceData (layers with paths, palette, image size)
export function imageDataToTraceData(imageData: ImageData, options: Options): TraceData {
    const indexedImage: IndexedImage = colorQuantization(imageData, options)

    writeLogImage(ImageData.fromIndexedImage(indexedImage), `indexedImage`)

    logD(`Tracing layers...`)

    // Loop to trace each color layer
    // TODO parellelizable! A thread for every color since they don't need any communication
    const layers: Grid<SegmentPath> = []
    const colorPaths: Array<{ color: Color, pointPaths: Array<PointPath> }> = []
    indexedImage.palette.forEach((color: Color, colorIndex: number) => {
            iterationCount++
            const edges: Grid<number> = edgeDetection(indexedImage, colorIndex)
            const paths: Array<PointPath> = pathScan(edges, options.pathOmit)
            colorPaths.push({color: color, pointPaths: paths})
            const interpolated: Array<PointPath> = interpolatePaths(paths)
            const tracedPaths: Array<SegmentPath> = interpolated.map(path => tracePath(path, options.lineThreshold, options.qSplineThreshold))
            layers.push(tracedPaths)
        }
    )
    writeLog(colorPaths, `colorPaths`)
    logD(`Finished tracing layers...\n` +
        `Total layers: ${layers.length}\n` +
        `Final iteration count ~${iterationCount.comma()}`)
    return new TraceData({
        layers: layers,
        palette: indexedImage.palette,
        width: indexedImage.grid[0].length - 2,
        height: indexedImage.grid.length - 2
    })
}

// Using a form of k-means clustering repeated `options.colorquantcycles` times. http://en.wikipedia.org/wiki/Color_quantization
function colorQuantization(imageData: ImageData, options: Options): IndexedImage {
    logD("Beginning Color Quantization...")

    imageData.ensureRGBA()

    // TODO why + 2????? Less than 2 fails :/ Has something to do with the pathScan
    //  for a 1 px border perhaps??
    const grid: Grid<number> = Array.init(imageData.height + 2, () =>
        Array.init(imageData.width + 2, () => -1)
    )

    const paletteSum: Array<{ r: number, g: number, b: number, a: number, n: number }> = []

    const palette: Palette = new ColorQuantizer(imageData.uniqueColors).makePalette(options.colorsNumber)

    logD(`Original image unique colors: ${imageData.uniqueColors.length}\n` +
        `New Palette colors: ${palette.length}`)

    writeLog(palette, "palette")
    writePixels(palette, "palette")

    logD(`Quantization cycles: ${options.colorQuantCycles}, palette size: ${palette.length}\n` +
        `Total loop iterations are: ${(options.colorQuantCycles * palette.length * imageData.totalPixels * palette.length).comma()}`)

    // Repeat clustering step options.colorquantcycles times
    from(0).to(options.colorQuantCycles).forEach((cycle: number) => {

        // Average colors from the second iteration onwards
        if (cycle > 0) {
            // averaging paletteSum for palette
            from(0).to(palette.length).forEach(k => {
                iterationCount++
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
                    (cycle < options.colorQuantCycles - 1)) {
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
            iterationCount++

            // find closest color from palette by measuring (rectilinear) color distance between this pixel and all palette colors
            let colorIndex = 0
            let lastMinDistance = imageData.isRGBA ? (256 * 4) : (256 * 3) // 4 * 256 is the maximum RGBA distance

            palette.forEach((paletteColor: Color, index: number) => {
                iterationCount++
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
            grid[y + 1][x + 1] = colorIndex
        })
    })

    writeLog(paletteSum, "paletteSum")
    writeLog(grid, "indexedArray")

    writeLog(palette, "palette-1")
    writePixels(palette, "palette-1")

    logD(`Finished Color Quantization...\n` +
        `Indexed image is ${grid.length} x ${grid[0].length} and has ${palette.length} colors in palette`)

    return new IndexedImage({grid: grid, palette: palette})
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
            iterationCount++
            pixels[y][x] =
                (indexedImage.grid[y - 1][x - 1] === colorNumber ? 1 : 0) +    // top left (1)
                (indexedImage.grid[y - 1][x] === colorNumber ? 2 : 0) +        // top right (2)
                (indexedImage.grid[y][x] === colorNumber ? 4 : 0) +            // bottom left (4)
                (indexedImage.grid[y][x - 1] === colorNumber ? 8 : 0)          // bottom right (8)
        })
    })

    //writeLog(pixels, `edgeDetection${colorNumber}`)
    return pixels
}

// Walk directions (dir): 0 > ; 1 ^ ; 2 < ; 3 v
function pathScan(edges: Grid<number>, pathOmit: number): Array<PointPath> {
    const pointPaths: Array<PointPath> = []
    const width = edges[0].length
    const height = edges.length

    let pathCount = 0
    from(0).to(height).forEach(y => {
        from(0).to(width).forEach(x => {
            iterationCount++
            if ((edges[y][x] === 4) || (edges[y][x] === 11)) { // Other values are not valid // TODO why????

                // Init
                let px = x
                let py = y
                pointPaths[pathCount] = new PointPath({
                    points: [],
                    boundingBox: new BoundingBox({x1: px, y1: py, x2: px, y2: py}),
                    holeChildren: [],
                    isHolePath: false
                })
                let pathFinished = false
                let pointCount = 0
                let holePath = (edges[y][x] === 11)
                let dir = 1

                // Path points loop
                while (!pathFinished) {

                    // New path point
                    pointPaths[pathCount].points[pointCount] = new SegmentPoint({
                        x: px - 1,
                        y: py - 1,
                        direction: null
                    })

                    // Bounding box
                    if ((px - 1) < pointPaths[pathCount].boundingBox.x1) {
                        pointPaths[pathCount].boundingBox.x1 = px - 1
                    }
                    if ((px - 1) > pointPaths[pathCount].boundingBox.x2) {
                        pointPaths[pathCount].boundingBox.x2 = px - 1
                    }
                    if ((py - 1) < pointPaths[pathCount].boundingBox.y1) {
                        pointPaths[pathCount].boundingBox.y1 = py - 1
                    }
                    if ((py - 1) > pointPaths[pathCount].boundingBox.y2) {
                        pointPaths[pathCount].boundingBox.y2 = py - 1
                    }

                    // Next: look up the replacement, direction and coordinate changes = clear this cell, turn if required, walk forward
                    const lookupRow = pathScanCombinedLookup[edges[py][px]][dir]
                    edges[py][px] = lookupRow[0]
                    dir = lookupRow[1]
                    px += lookupRow[2]
                    py += lookupRow[3]

                    // Close path
                    if ((px - 1 === pointPaths[pathCount].points[0].x) && (py - 1 === pointPaths[pathCount].points[0].y)) {
                        pathFinished = true

                        // Discarding pointPaths shorter than pathOmit
                        if (pointPaths[pathCount].points.length < pathOmit) {
                            pointPaths.pop()
                        } else {

                            pointPaths[pathCount].isHolePath = holePath

                            // Finding the parent shape for this hole
                            if (holePath) {

                                let parentIndex = 0
                                let parentbbox = new BoundingBox({x1: -1, y1: -1, x2: width + 1, y2: height + 1})
                                from(0).to(pathCount).forEach(parent => {
                                    iterationCount++
                                    if ((!pointPaths[parent].isHolePath) &&
                                        pointPaths[parent].boundingBox.includes(pointPaths[pathCount].boundingBox) &&
                                        parentbbox.includes(pointPaths[parent].boundingBox) &&
                                        pointPaths[pathCount].points[0].isInPolygon(pointPaths[parent].points)
                                    ) {
                                        parentIndex = parent;
                                        parentbbox = pointPaths[parent].boundingBox
                                    }
                                })

                                pointPaths[parentIndex].holeChildren.push(pathCount)

                            }// End of holePath parent finding
                            pathCount++
                        }
                    }// End of Close path
                    pointCount++
                }// End of Path points loop
            }// End of Follow path
        })
    })
    return pointPaths
}

// 4. interpolating between path points for nodes with 8 directions ( East, SouthEast, S, SW, W, NW, N, NE )
function interpolatePaths(paths: Array<PointPath>): Array<PointPath> {
    const result: Array<PointPath> = []

    from(0).to(paths.length).forEach(pathIndex => {
        const path = paths[pathIndex]
        const resultPath = PointPath.fromPath(path)
        result[pathIndex] = resultPath
        const pathLength = path.points.length

        from(0).to(pathLength).forEach(point => {
            iterationCount++
            // next and previous point indexes
            const nextIndex = (point + 1) % pathLength
            const nextIndex2 = (point + 2) % pathLength
            const previousIndex = (point - 1 + pathLength) % pathLength
            const previousIndex2 = (point - 2 + pathLength) % pathLength

            // right angle enhance
            if (testRightAngle(path, previousIndex2, previousIndex, point, nextIndex, nextIndex2)) {

                // Fix previous direction
                if (resultPath.points.length > 0) {
                    resultPath.points[resultPath.points.length - 1].direction = getDirection(
                        resultPath.points[resultPath.points.length - 1].x,
                        resultPath.points[resultPath.points.length - 1].y,
                        path.points[point].x,
                        path.points[point].y
                    )
                }

                // This corner point
                resultPath.points.push(new SegmentPoint({
                    x: path.points[point].x,
                    y: path.points[point].y,
                    direction: getDirection(
                        path.points[point].x,
                        path.points[point].y,
                        ((path.points[point].x + path.points[nextIndex].x) / 2),
                        ((path.points[point].y + path.points[nextIndex].y) / 2)
                    )
                }))

            }// End of right angle enhance

            // interpolate between two path points
            resultPath.points.push(new SegmentPoint({
                x: ((path.points[point].x + path.points[nextIndex].x) / 2),
                y: ((path.points[point].y + path.points[nextIndex].y) / 2),
                direction: getDirection(
                    ((path.points[point].x + path.points[nextIndex].x) / 2),
                    ((path.points[point].y + path.points[nextIndex].y) / 2),
                    ((path.points[nextIndex].x + path.points[nextIndex2].x) / 2),
                    ((path.points[nextIndex].y + path.points[nextIndex2].y) / 2)
                )
            }))
        })
    })
    return result
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
        let segtype1: Direction = path.points[pointCount].direction
        let segtype2: Direction = null
        let seqend = pointCount + 1
        while (((path.points[seqend].direction === segtype1) ||
            (path.points[seqend].direction === segtype2) ||
            (segtype2 === null)) && (seqend < path.points.length - 1)) {
            iterationCount++

            if ((path.points[seqend].direction !== segtype1) && (segtype2 === null)) {
                segtype2 = path.points[seqend].direction
            }
            seqend++
        }
        if (seqend === path.points.length - 1) {
            seqend = 0
        }

        // 5.2. - 5.6. Split sequence and recursively apply 5.2. - 5.6. to startpoint-splitpoint and splitpoint-endpoint sequences
        smp.segments.pushAll(fitSeq(path, ltres, qtres, pointCount, seqend))

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
function fitSeq(path: PointPath, ltres: number, qtres: number, seqstart: number, seqend: number): Array<Segment> {
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
        iterationCount++
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
        return [new Segment({
            type: 'L',
            x1: path.points[seqstart].x,
            y1: path.points[seqstart].y,
            x2: path.points[seqend].x,
            y2: path.points[seqend].y
        })]
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
        return [new Segment({
            type: 'Q',
            x1: path.points[seqstart].x,
            y1: path.points[seqstart].y,
            x2: cpx,
            y2: cpy,
            x3: path.points[seqend].x,
            y3: path.points[seqend].y
        })]
    }
    // 5.5. If the spline fails (distance error>qtres), find the point with the biggest error
    const splitpoint = fitpoint // Earlier: floor((fitpoint + errorpoint)/2);

    // 5.6. Split sequence and recursively apply 5.2. - 5.6. to startpoint-splitpoint and splitpoint-endpoint sequences
    return fitSeq(path, ltres, qtres, seqstart, splitpoint).pushAll(
        fitSeq(path, ltres, qtres, splitpoint, seqend))

}

// Getting SVG path element string from a traced path
function svgPathString(traceData: TraceData, lnum: number, pathnum: number, options: Options): string {

    // TODO if the last command is the same as the first M then just have the Z
    //  we can have huge size savings from this

    const places: number = options.roundToDec
    const layer = traceData.layers[lnum]
    const smp = layer[pathnum]

    // Starting path element, desc contains layer and path number
    let string = `<path lnum="${lnum}" pnum="${pathnum}" ${traceData.palette[lnum].toSVG} d="`

    // Creating non-hole path string
    string += `M ${smp.segments[0].x1} ${smp.segments[0].y1} `
    smp.segments.forEach((segment: Segment) => {
        iterationCount++
        string += `${segment.type} ${segment.x2.roundToDec(places)} ${segment.y2.roundToDec(places)} `
        if (segment.x3 !== null && segment.y3 !== null) {
            string += `${segment.x3.roundToDec(places)} ${segment.y3.roundToDec(places)} `
        }
    })
    string += `Z `

    // Hole children
    smp.holeChildren.forEach((hole: number) => {
        const hsmp: SegmentPath = layer[hole]
        const last: Segment = hsmp.segments[hsmp.segments.length - 1]
        // Creating hole path string
        if (last.x3 !== null && last.y3 !== null) {
            string += `M ${last.x3.roundToDec(places)} ${last.y3.roundToDec(places)} `
        } else {
            string += `M ${last.x2.roundToDec(places)} ${last.y2.roundToDec(places)} `
        }

        from(hsmp.segments.length - 1).to(-1).step(-1).forEach(point => {
            iterationCount++
            const segment: Segment = hsmp.segments[point]
            string += `${segment.type} `
            if (segment.x3 !== null && segment.y3 !== null) {
                string += `${segment.x2.roundToDec(places)} ${segment.y2.roundToDec(places)} `
            }
            string += `${segment.x1.roundToDec(places)} ${segment.y1.roundToDec(places)} `
        })

        string += `Z`
    })
    string += `"/>`

    return string
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
            iterationCount++
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