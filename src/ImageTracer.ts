// Original Library https://github.com/jankovicsandras/imagetracerjs

import {optionPresets, Options} from "./Options";
import {floor, from, logD, random} from "./Utils";
import {writeImage} from "./PNG";

// pathScanCombinedLookup[ arr[py][px] ][ dir ] = [nextarrpypx, nextdir, deltapx, deltapy];
const pathScanCombinedLookup: NumberArray3D = [
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
    options = checkOptions(options)
    // tracing imagedata
    const traceData: TraceData = imageDataToTraceData(imageData, options)
    // returning SVG string
    return getSvgString(traceData, options)
}

// 1. Color quantization

// Tracing imagedata, then returning tracedata (layers with paths, palette, image size)
function imageDataToTraceData(imageData: ImageData, options: Options): TraceData {
    options = checkOptions(options);

    // 1. Color quantization
    const indexedImage: IndexedImage = colorQuantization(imageData, options)

    let traceData = new TraceData({
        layers: [],
        palette: indexedImage.palette,
        width: indexedImage.array[0].length - 2,
        height: indexedImage.array.length - 2
    })

    // Loop to trace each color layer
    for (let colornum = 0; colornum < indexedImage.palette.length; colornum++) {

        // layeringStep -> pathScan -> interNodes -> batchTracePaths
        let tracedlayer =
            batchTracePaths(
                interNodes(
                    pathScan(
                        layeringStep(indexedImage, colornum),
                        options.pathomit
                    ),
                    options
                ),
                options.lineThreshold,
                options.qSplineThreshold
            );

        // adding traced layer
        traceData.layers.push(tracedlayer);

    }// End of color loop
    return traceData
}

/**
 * Ensures the passed in `options` is initialized correctly with default values if any are missing
 */
function checkOptions(options: Options): Options {
    Object.keys(optionPresets.default).forEach((key: string) => {
        if (!options.hasOwnProperty(key)) options[key] = optionPresets.default[key]
    })
    return options
}

// Using a form of k-means clustering repeatead options.colorquantcycles times. http://en.wikipedia.org/wiki/Color_quantization
// BH: We should be doing this because we need to reduce the number of "color regions" as much as possible but pixels
// will not be helpful in this so we have to lose data, or more accurately, regain the data that rasterization loses
// because of pixels etc
function colorQuantization(imageData: ImageData, options: Options): IndexedImage {
    // TODO 28-July-2020: simplify and understand this function!

    const totalPixels = imageData.width * imageData.height

    const colorArray: NumberArray2D = []

    // Filling colorArray (color index array) with -1
    // TODO why + 2????? Less than 2 fails :/ Has something to do with the pathScan
    //  for a 1 px border perhaps??
    imageData.ensureRGBA()
    from(0).to(imageData.height + 2).forEach(y => {
        colorArray[y] = []
        from(0).to(imageData.width + 2).forEach(x => {
            colorArray[y][x] = -1
        })
    })

    const accumulatorPalette: Array<{ r: number, g: number, b: number, a: number, n: number }> = []
    // TODO what is n??? This is a function scoped object so we can easily deduce this :P
    //  n is some kind of index

    // TODO why are we generating a palette?? We end up changing it later anyway
    //  what it is originally matters though!
    let palette: Palette = generatePalette(options.colorsNumber, imageData)

    writeImage("./palette.png", ImageData.fromPixels(palette))

    // Repeat clustering step options.colorquantcycles times
    from(0).to(options.colorquantcycles).forEach((quantCycle: number) => {

        // Average colors from the second iteration
        if (quantCycle > 0) {
            // averaging accumulatorPalette for palette
            from(0).to(palette.length).forEach(k => {
                // averaging
                if (accumulatorPalette[k].n > 0) {
                    palette[k] = new Color({
                        r: floor(accumulatorPalette[k].r / accumulatorPalette[k].n),
                        g: floor(accumulatorPalette[k].g / accumulatorPalette[k].n),
                        b: floor(accumulatorPalette[k].b / accumulatorPalette[k].n),
                        a: floor(accumulatorPalette[k].a / accumulatorPalette[k].n)
                    })
                }

                // Randomizing a color, if there are too few pixels and there will be a new cycle
                if ((accumulatorPalette[k].n / totalPixels < options.mincolorratio) &&
                    (quantCycle < options.colorquantcycles - 1)) {
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
            .forEach(i => accumulatorPalette[i] = {r: 0, g: 0, b: 0, a: 0, n: 0})

        // loop through all pixels
        from(0).to(imageData.height).forEach(y => {
            from(0).to(imageData.width).forEach(x => {

                // pixel index within imageData.data
                let idx = (y * imageData.width + x) * 4

                // find closest color from palette by measuring (rectilinear) color distance between this pixel and all palette colors
                let ci = 0;
                let cdl = 1024; // 4 * 256 is the maximum RGBA distance
                from(0).to(palette.length).forEach(k => {
                    // In my experience, https://en.wikipedia.org/wiki/Rectilinear_distance works better than https://en.wikipedia.org/wiki/Euclidean_distance
                    let cd = (palette[k].r - imageData.data[idx]).abs() +
                        (palette[k].g - imageData.data[idx + 1]).abs() +
                        (palette[k].b - imageData.data[idx + 2]).abs() +
                        (palette[k].a - imageData.data[idx + 3]).abs()

                    // Remember this color if this is the closest yet
                    if (cd < cdl) {
                        cdl = cd
                        ci = k
                    }
                })

                // add to palettacc
                accumulatorPalette[ci].r += imageData.data[idx];
                accumulatorPalette[ci].g += imageData.data[idx + 1];
                accumulatorPalette[ci].b += imageData.data[idx + 2];
                accumulatorPalette[ci].a += imageData.data[idx + 3];
                accumulatorPalette[ci].n++;

                // update the indexed color array
                colorArray[y + 1][x + 1] = ci;
            })
        })
    })

    palette.forEach(color => logD(color.toRGBA()))

    writeImage("./palette-1.png", ImageData.fromPixels(palette))

    return {array: colorArray, palette: palette};
}

// 2. Layer separation and edge detection
// Edge node types ( ▓: this layer or 1; ░: not this layer or 0 )
// 12  ░░  ▓░  ░▓  ▓▓  ░░  ▓░  ░▓  ▓▓  ░░  ▓░  ░▓  ▓▓  ░░  ▓░  ░▓  ▓▓
// 48  ░░  ░░  ░░  ░░  ░▓  ░▓  ░▓  ░▓  ▓░  ▓░  ▓░  ▓░  ▓▓  ▓▓  ▓▓  ▓▓

// Deterministic sampling a palette from imagedata: rectangular grid
// TODO we need a better palette generation method! Look into the article https://en.wikipedia.org/wiki/Color_quantization
function generatePalette(colorsNumber: number, imageData: ImageData): Palette {
    let palette: Palette = []

    logD(`width: ${imageData.width}`)
    logD(`height: ${imageData.height}`)

    // Divide the image into blocks depending on the given colorsNumber
    logD(`colorsNumber: ${colorsNumber}`)
    let horizontalBlocks = colorsNumber.sqrt().ceil()
    logD(`horizontalBlocks: ${horizontalBlocks}`)
    let verticalBlocks = (colorsNumber / horizontalBlocks).ceil()
    logD(`verticalBlocks: ${verticalBlocks}`)
    let blockWidth = imageData.width / (horizontalBlocks + 1)
    logD(`blockWidth: ${blockWidth}`)
    let blockHeight = imageData.height / (verticalBlocks + 1)
    logD(`blockHeight: ${blockHeight}`)

    from(0).to(verticalBlocks).forEach(yBlock => {
        from(0).to(horizontalBlocks).forEach(xBlock => {
            if (palette.length === colorsNumber) return palette
            else {
                const idx = 4 * (((yBlock + 1) * blockHeight) *
                    imageData.width + ((xBlock + 1) * blockWidth)).floor()
                palette.push(new Color({
                    r: imageData.data[idx],
                    g: imageData.data[idx + 1],
                    b: imageData.data[idx + 2],
                    a: imageData.data[idx + 3]
                }))

                logD(`yBlock: ${yBlock}`)
                logD(`xBlock: ${xBlock}`)
                logD(`idx: ${idx}`)
            }
        })
    })
    palette.forEach(color => logD(color.toRGBA()))
    logD(`paletteSize: ${palette.length}`)
    logD("")
    return palette
}

// 3. Walking through an edge node array, discarding edge node types 0 and 15 and creating paths from the rest.

//     0   1   2   3   4   5   6   7   8   9   10  11  12  13  14  15
function layeringStep(indexedImage: IndexedImage, colorNumber: number): NumberArray2D {
    // Creating layers for each indexed color in arr
    let layer = [],
        ah = indexedImage.array.length,
        aw = indexedImage.array[0].length,
        i,
        j,
        k;

    // Create layer
    for (j = 0; j < ah; j++) {
        layer[j] = [];
        for (i = 0; i < aw; i++) {
            layer[j][i] = 0;
        }
    }

    // Looping through all pixels and calculating edge node type
    for (j = 1; j < ah; j++) {
        for (i = 1; i < aw; i++) {
            layer[j][i] =
                (indexedImage.array[j - 1][i - 1] === colorNumber ? 1 : 0) +
                (indexedImage.array[j - 1][i] === colorNumber ? 2 : 0) +
                (indexedImage.array[j][i - 1] === colorNumber ? 8 : 0) +
                (indexedImage.array[j][i] === colorNumber ? 4 : 0)
            ;
        }// End of i loop
    }// End of j loop

    return layer;
}

// Point in polygon test
function isPointInPointsList(point: SVGPoint, pointsList: SVGPointList): boolean {
    let isin = false;

    for (let i = 0, j = pointsList.length - 1; i < pointsList.length; j = i++) {
        isin =
            (((pointsList[i].y > point.y) !== (pointsList[j].y > point.y)) &&
                (point.x < (pointsList[j].x - pointsList[i].x) * (point.y - pointsList[i].y) / (pointsList[j].y - pointsList[i].y) + pointsList[i].x))
                ? !isin : isin;
    }

    return isin;
}

// Walk directions (dir): 0 > ; 1 ^ ; 2 < ; 3 v
function pathScan(arr, pathomit) {
    let paths = [], pacnt = 0, pcnt = 0, px = 0, py = 0, w = arr[0].length, h = arr.length,
        dir = 0, pathfinished = true, holepath = false, lookuprow;

    for (let j = 0; j < h; j++) {
        for (let i = 0; i < w; i++) {
            if ((arr[j][i] == 4) || (arr[j][i] == 11)) { // Other values are not valid

                // Init
                px = i;
                py = j;
                paths[pacnt] = {};
                paths[pacnt].points = [];
                paths[pacnt].boundingbox = [px, py, px, py];
                paths[pacnt].holechildren = [];
                pathfinished = false;
                pcnt = 0;
                holepath = (arr[j][i] == 11);
                dir = 1;

                // Path points loop
                while (!pathfinished) {

                    // New path point
                    paths[pacnt].points[pcnt] = {};
                    paths[pacnt].points[pcnt].x = px - 1;
                    paths[pacnt].points[pcnt].y = py - 1;
                    paths[pacnt].points[pcnt].t = arr[py][px];

                    // Bounding box
                    if ((px - 1) < paths[pacnt].boundingbox[0]) {
                        paths[pacnt].boundingbox[0] = px - 1;
                    }
                    if ((px - 1) > paths[pacnt].boundingbox[2]) {
                        paths[pacnt].boundingbox[2] = px - 1;
                    }
                    if ((py - 1) < paths[pacnt].boundingbox[1]) {
                        paths[pacnt].boundingbox[1] = py - 1;
                    }
                    if ((py - 1) > paths[pacnt].boundingbox[3]) {
                        paths[pacnt].boundingbox[3] = py - 1;
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

                            paths[pacnt].isholepath = holepath;

                            // Finding the parent shape for this hole
                            if (holepath) {

                                let parentidx = 0, parentbbox = [-1, -1, w + 1, h + 1];
                                for (let parentcnt = 0; parentcnt < pacnt; parentcnt++) {
                                    if ((!paths[parentcnt].isholepath) &&
                                        boundingBoxIncludes(paths[parentcnt].boundingbox, paths[pacnt].boundingbox) &&
                                        boundingBoxIncludes(parentbbox, paths[parentcnt].boundingbox) &&
                                        isPointInPointsList(paths[pacnt].points[0], paths[parentcnt].points)
                                    ) {
                                        parentidx = parentcnt;
                                        parentbbox = paths[parentcnt].boundingbox;
                                    }
                                }

                                paths[parentidx].holechildren.push(pacnt);

                            }// End of holepath parent finding

                            pacnt++;

                        }

                    }// End of Close path

                    pcnt++;

                }// End of Path points loop

            }// End of Follow path

        }// End of i loop
    }// End of j loop

    return paths;
}// End of pathScan()

function boundingBoxIncludes(parentbbox, childbbox) {
    return ((parentbbox[0] < childbbox[0]) && (parentbbox[1] < childbbox[1]) && (parentbbox[2] > childbbox[2]) && (parentbbox[3] > childbbox[3]));
}// End of boundingBoxIncludes()

// 4. interpollating between path points for nodes with 8 directions ( East, SouthEast, S, SW, W, NW, N, NE )
function interNodes(paths, options) {
    let ins = [], palen = 0, nextidx = 0, nextidx2 = 0, previdx = 0, previdx2 = 0, pacnt, pcnt;

    // paths loop
    for (pacnt = 0; pacnt < paths.length; pacnt++) {

        ins[pacnt] = {};
        ins[pacnt].points = [];
        ins[pacnt].boundingbox = paths[pacnt].boundingbox;
        ins[pacnt].holechildren = paths[pacnt].holechildren;
        ins[pacnt].isholepath = paths[pacnt].isholepath;
        palen = paths[pacnt].points.length;

        // pathpoints loop
        for (pcnt = 0; pcnt < palen; pcnt++) {

            // next and previous point indexes
            nextidx = (pcnt + 1) % palen;
            nextidx2 = (pcnt + 2) % palen;
            previdx = (pcnt - 1 + palen) % palen;
            previdx2 = (pcnt - 2 + palen) % palen;

            // right angle enhance
            if (options.rightangleenhance && testRightAngle(paths[pacnt], previdx2, previdx, pcnt, nextidx, nextidx2)) {

                // Fix previous direction
                if (ins[pacnt].points.length > 0) {
                    ins[pacnt].points[ins[pacnt].points.length - 1].linesegment = getDirection(
                        ins[pacnt].points[ins[pacnt].points.length - 1].x,
                        ins[pacnt].points[ins[pacnt].points.length - 1].y,
                        paths[pacnt].points[pcnt].x,
                        paths[pacnt].points[pcnt].y
                    );
                }

                // This corner point
                ins[pacnt].points.push({
                    x: paths[pacnt].points[pcnt].x,
                    y: paths[pacnt].points[pcnt].y,
                    linesegment: getDirection(
                        paths[pacnt].points[pcnt].x,
                        paths[pacnt].points[pcnt].y,
                        ((paths[pacnt].points[pcnt].x + paths[pacnt].points[nextidx].x) / 2),
                        ((paths[pacnt].points[pcnt].y + paths[pacnt].points[nextidx].y) / 2)
                    )
                });

            }// End of right angle enhance

            // interpolate between two path points
            ins[pacnt].points.push({
                x: ((paths[pacnt].points[pcnt].x + paths[pacnt].points[nextidx].x) / 2),
                y: ((paths[pacnt].points[pcnt].y + paths[pacnt].points[nextidx].y) / 2),
                linesegment: getDirection(
                    ((paths[pacnt].points[pcnt].x + paths[pacnt].points[nextidx].x) / 2),
                    ((paths[pacnt].points[pcnt].y + paths[pacnt].points[nextidx].y) / 2),
                    ((paths[pacnt].points[nextidx].x + paths[pacnt].points[nextidx2].x) / 2),
                    ((paths[pacnt].points[nextidx].y + paths[pacnt].points[nextidx2].y) / 2)
                )
            });

        }// End of pathpoints loop

    }// End of paths loop

    return ins;
}// End of interNodes()

function testRightAngle(path, idx1, idx2, idx3, idx4, idx5) {
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
}// End of testRightAngle()

// 5. tracePath() : recursively trying to fit straight and quadratic spline segments on the 8 direction internode path

// 5.1. Find sequences of points with only 2 segment types
// 5.2. Fit a straight line on the sequence
// 5.3. If the straight line fails (distance error > ltres), find the point with the biggest error
// 5.4. Fit a quadratic spline through errorpoint (project this to get controlpoint), then measure errors on every point in the sequence
// 5.5. If the spline fails (distance error > qtres), find the point with the biggest error, set splitpoint = fitting point
// 5.6. Split sequence and recursively apply 5.2. - 5.6. to startpoint-splitpoint and splitpoint-endpoint sequences

function getDirection(x1, y1, x2, y2) {
    let val = 8;
    if (x1 < x2) {
        if (y1 < y2) {
            val = 1;
        }// SouthEast
        else if (y1 > y2) {
            val = 7;
        }// NE
        else {
            val = 0;
        }// E
    } else if (x1 > x2) {
        if (y1 < y2) {
            val = 3;
        }// SW
        else if (y1 > y2) {
            val = 5;
        }// NW
        else {
            val = 4;
        }// W
    } else {
        if (y1 < y2) {
            val = 2;
        }// S
        else if (y1 > y2) {
            val = 6;
        }// N
        else {
            val = 8;
        }// center, this should not happen
    }
    return val;
}// End of getDirection()

// 5.2. - 5.6. recursively fitting a straight or quadratic line segment on this sequence of path nodes,

function tracePath(path, ltres, qtres) {
    let pcnt = 0, segtype1, segtype2, seqend;

    const smp = {
        segments: [],
        boundingbox: path.boundingbox,
        holechildren: path.holechildren,
        isholepath: path.isholepath
    }

    while (pcnt < path.points.length) {
        // 5.1. Find sequences of points with only 2 segment types
        segtype1 = path.points[pcnt].linesegment;
        segtype2 = -1;
        seqend = pcnt + 1;
        while (
            ((path.points[seqend].linesegment === segtype1) || (path.points[seqend].linesegment === segtype2) || (segtype2 === -1))
            && (seqend < path.points.length - 1)) {

            if ((path.points[seqend].linesegment !== segtype1) && (segtype2 === -1)) {
                segtype2 = path.points[seqend].linesegment;
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

    }// End of pcnt loop

    return smp;
}

// called from tracePath()
function fitSeq(path, ltres, qtres, seqstart, seqend) {
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
function batchTracePaths(internodepaths, ltres, qtres) {
    let btracedpaths = [];
    for (let k in internodepaths) {
        if (!internodepaths.hasOwnProperty(k)) {
            continue;
        }
        btracedpaths.push(tracePath(internodepaths[k], ltres, qtres));
    }
    return btracedpaths;
}

// Rounding to given decimals https://stackoverflow.com/questions/11832914/round-to-at-most-2-decimal-places-in-javascript
function roundToDec(val: number, places: number = 0) {
    return +val.toFixed(places)
}

// Getting SVG path element string from a traced path
function svgPathString(tracedata: TraceData, lnum: number, pathnum: number, options: Options): string {

    let layer = tracedata.layers[lnum], smp = layer[pathnum], str = '', pcnt

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
    for (let hcnt = 0; hcnt < smp.holechildren.length; hcnt++) {
        let hsmp = layer[smp.holechildren[hcnt]];
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
        for (let hcnt = 0; hcnt < smp.holechildren.length; hcnt++) {
            let hsmp = layer[smp.holechildren[hcnt]];
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

/**
 * Converts the passed in `traceData` with the desired `options` into an SVG `string`
 */
function getSvgString(traceData: TraceData, options: Options): string {

    options = checkOptions(options)

    let svgString = `<svg width="${traceData.width}" height="${traceData.height}" xmlns="http://www.w3.org/2000/svg" >`

    // Drawing: Layers and Paths loops
    for (let lcnt = 0; lcnt < traceData.layers.length; lcnt++) {
        for (let pcnt = 0; pcnt < traceData.layers[lcnt].length; pcnt++) {

            // Adding SVG <path> string
            if (!traceData.layers[lcnt][pcnt].isholepath) {
                svgString += svgPathString(traceData, lcnt, pcnt, options);
            }

        }// End of paths loop
    }// End of layers loop

    // SVG End
    svgString += '</svg>'

    return svgString;

}

export class ImageData {
    public height: number
    public width: number
    public data: Buffer
    public totalPixels: number

    constructor(imageData: { height: number, width: number, data: Buffer }) {
        this.height = imageData.height
        this.width = imageData.width
        this.data = imageData.data
        this.totalPixels = this.width * this.height
    }

    ensureRGBA(): ImageData {
        if (this.data.length < this.totalPixels * 4) {
            const newImgData = Buffer.alloc(this.totalPixels * 4)
            from(0).to(this.totalPixels).forEach((pxIndex: number) => {
                newImgData[pxIndex * 4] = this.data[pxIndex * 3] // r
                newImgData[pxIndex * 4 + 1] = this.data[pxIndex * 3 + 1] // g
                newImgData[pxIndex * 4 + 2] = this.data[pxIndex * 3 + 2] // b
                newImgData[pxIndex * 4 + 3] = 255; // a
            })
            this.data = newImgData
        }
        return this
    }

    static fromPixels(pixels: Array<Color>): ImageData {
        const buffer = Buffer.alloc(pixels.length * 4)
        pixels.forEach((color: Color, index: number) => {
            buffer[index] = color.r
            buffer[index + 1] = color.g
            buffer[index + 2] = color.b
            buffer[index + 3] = color.a
        })
        return new ImageData({
            data: buffer,
            width: pixels.length,
            height: 1
        })
    }

    pixels(): Array<Color> {
        this.ensureRGBA()
        const result: Array<Color> = []
        let pxIndex = 0
        for (let dataIndex = 0; dataIndex < this.data.length; dataIndex += 4, pxIndex++) {
            result[pxIndex] = new Color({
                r: this.data[dataIndex],
                g: this.data[dataIndex + 1],
                b: this.data[dataIndex + 2],
                a: this.data[dataIndex + 3]
            })
        }
        return result
    }
}

export class TraceData {
    public layers: Array<any>
    public palette: Palette
    public width: number
    public height: number

    constructor(traceData: {
        layers: Array<any>,
        palette: Palette,
        width: number,
        height: number
    }) {
        this.layers = traceData.layers
        this.palette = traceData.palette
        this.width = traceData.width
        this.height = traceData.height
    }
}

export class Color {

    public r: number
    public g: number
    public b: number
    public a: number

    constructor(color: { r: number, g: number, b: number, a: number }) {
        this.r = color.r
        this.g = color.g
        this.b = color.b
        this.a = color.a
    }

    private static hex(channelValue: number): string {
        let hex = Number(channelValue).toString(16)
        if (hex.length < 2) hex = "0" + hex
        return hex
    }

    toRGB(): string {
        return `rgb(${this.r},${this.g},${this.b})`
    }

    toRGBA(): string {
        return `rgba(${this.r},${this.g},${this.b},${this.a})`
    }

    toHex(ignoreAlpha: boolean = false): string {
        return `${Color.hex(this.r)}${Color.hex(this.g)}${Color.hex(this.b)}${ignoreAlpha ? Color.hex(this.r) : ""}`
    }

    toSVGString(): string {
        return `fill="${this.toRGB()}" stroke="${this.toRGB()}" stroke-width="1" opacity="${this.a / 255.0}"`
    }
}


export type Palette = Array<Color>

export type IndexedImage = {
    array: NumberArray2D,
    palette: Palette
}

export type NumberArray2D = Array<Array<number>>
export type NumberArray3D = Array<Array<Array<number>>>