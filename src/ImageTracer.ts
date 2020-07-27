import {optionPresets, Options} from "./Options";

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

// Gaussian kernels for blur
const gaussianKernels: NumberArray2D = [
    [0.27901, 0.44198, 0.27901],
    [0.135336, 0.228569, 0.272192, 0.228569, 0.135336],
    [0.086776, 0.136394, 0.178908, 0.195843, 0.178908, 0.136394, 0.086776],
    [0.063327, 0.093095, 0.122589, 0.144599, 0.152781, 0.144599, 0.122589, 0.093095, 0.063327],
    [0.049692, 0.069304, 0.089767, 0.107988, 0.120651, 0.125194, 0.120651, 0.107988, 0.089767, 0.069304, 0.049692]
]

// Special palette to use with drawlayers()
const specialPalette: Palette = [
    {r: 0, g: 0, b: 0, a: 255},
    {r: 128, g: 128, b: 128, a: 255},
    {r: 0, g: 0, b: 128, a: 255},
    {r: 64, g: 64, b: 128, a: 255},
    {r: 192, g: 192, b: 192, a: 255},
    {r: 255, g: 255, b: 255, a: 255},
    {r: 128, g: 128, b: 192, a: 255},
    {r: 0, g: 0, b: 192, a: 255},
    {r: 128, g: 0, b: 0, a: 255},
    {r: 128, g: 64, b: 64, a: 255},
    {r: 128, g: 0, b: 128, a: 255},
    {r: 168, g: 168, b: 168, a: 255},
    {r: 192, g: 128, b: 128, a: 255},
    {r: 192, g: 0, b: 0, a: 255},
    {r: 255, g: 255, b: 255, a: 255},
    {r: 0, g: 128, b: 0, a: 255}
]

// Tracing imagedata, then returning the scaled svg string
export function imageDataToSVG(imageData: ImageData, options: Options): string {
    options = checkOptions(options)
    // tracing imagedata
    const traceData: TraceData = imageDataToTraceData(imageData, options)
    // returning SVG string
    return getSvgString(traceData, options)
}

////////////////////////////////////////////////////////////
//
//  Vectorizing functions
//
////////////////////////////////////////////////////////////

// 1. Color quantization

// Tracing imagedata, then returning tracedata (layers with paths, palette, image size)
function imageDataToTraceData(imageData: ImageData, options: Options): TraceData {
    options = checkOptions(options);

    // 1. Color quantization
    const indexedImage: IndexedImage = colorQuantization(imageData, options)

    let traceData: TraceData

    if (options.layering === 0) {// Sequential layering

        // create tracedata object
        traceData = {
            layers: [],
            palette: indexedImage.palette,
            width: indexedImage.array[0].length - 2,
            height: indexedImage.array.length - 2
        };

        // Loop to trace each color layer
        for (var colornum = 0; colornum < indexedImage.palette.length; colornum++) {

            // layeringStep -> pathscan -> internodes -> batchtracepaths
            var tracedlayer =
                batchtracepaths(
                    internodes(
                        pathscan(
                            layeringStep(indexedImage, colornum),
                            options.pathomit
                        ),

                        options
                    ),

                    options.ltres,
                    options.qtres
                );

            // adding traced layer
            traceData.layers.push(tracedlayer);

        }// End of color loop

    } else {// Parallel layering
        // 2. Layer separation and edge detection
        var ls = layering(indexedImage);

        // Optional edge node visualization
        if (options.layercontainerid) {
            drawLayers(ls, specialPalette, options.scale, options.layercontainerid);
        }

        // 3. Batch pathscan
        var bps = batchpathscan(ls, options.pathomit);

        // 4. Batch interpollation
        var bis = batchinternodes(bps, options);

        // 5. Batch tracing and creating tracedata object
        traceData = {
            layers: batchtracelayers(bis, options.ltres, options.qtres),
            palette: indexedImage.palette,
            width: imageData.width,
            height: imageData.height
        };

    }// End of parallel layering

    return traceData;

}

// creating options object, setting defaults for missing values
function checkOptions(options: Options): Options {
    options = options || {};
    // Option preset
    if (typeof options === 'string') {
        options = options.toLowerCase();
        if (optionPresets[options]) {
            options = optionPresets[options];
        } else {
            options = {};
        }
    }
    // Defaults
    var ok = Object.keys(optionPresets['default']);
    for (var k = 0; k < ok.length; k++) {
        if (!options.hasOwnProperty(ok[k])) {
            options[ok[k]] = optionPresets['default'][ok[k]];
        }
    }
    // options.pal is not defined here, the custom palette should be added externally: options.pal = [ { 'r':0, 'g':0, 'b':0, 'a':255 }, {...}, ... ];
    // options.layercontainerid is not defined here, can be added externally: options.layercontainerid = 'mydiv'; ... <div id="mydiv"></div>
    return options;
}

// Using a form of k-means clustering repeatead options.colorquantcycles times. http://en.wikipedia.org/wiki/Color_quantization
function colorQuantization(imgd: ImageData, options: Options): IndexedImage {
    var arr = [], idx = 0, cd, cdl, ci, paletteacc = [], pixelnum = imgd.width * imgd.height, i, j, k, cnt,
        palette;

    // imgd.data must be RGBA, not just RGB
    if (imgd.data.length < pixelnum * 4) {
        var newimgddata = Buffer.alloc(pixelnum * 4);
        for (var pxcnt = 0; pxcnt < pixelnum; pxcnt++) {
            newimgddata[pxcnt * 4] = imgd.data[pxcnt * 3];
            newimgddata[pxcnt * 4 + 1] = imgd.data[pxcnt * 3 + 1];
            newimgddata[pxcnt * 4 + 2] = imgd.data[pxcnt * 3 + 2];
            newimgddata[pxcnt * 4 + 3] = 255;
        }
        imgd.data = newimgddata;
    }// End of RGBA imgd.data check

    // Filling arr (color index array) with -1
    for (j = 0; j < imgd.height + 2; j++) {
        arr[j] = [];
        for (i = 0; i < imgd.width + 2; i++) {
            arr[j][i] = -1;
        }
    }

    // Use custom palette if pal is defined or sample / generate custom length palette
    if (options.pal) {
        palette = options.pal;
    } else if (options.colorsampling === 0) {
        palette = generatePalette(options.numberofcolors);
    } else if (options.colorsampling === 1) {
        palette = samplePalette(options.numberofcolors, imgd);
    } else {
        palette = samplePalette2(options.numberofcolors, imgd);
    }

    // Selective Gaussian blur preprocessing
    if (options.blurradius > 0) {
        imgd = blur(imgd, options.blurradius, options.blurdelta);
    }

    // Repeat clustering step options.colorquantcycles times
    for (cnt = 0; cnt < options.colorquantcycles; cnt++) {

        // Average colors from the second iteration
        if (cnt > 0) {
            // averaging paletteacc for palette
            for (k = 0; k < palette.length; k++) {

                // averaging
                if (paletteacc[k].n > 0) {
                    palette[k] = {
                        r: Math.floor(paletteacc[k].r / paletteacc[k].n),
                        g: Math.floor(paletteacc[k].g / paletteacc[k].n),
                        b: Math.floor(paletteacc[k].b / paletteacc[k].n),
                        a: Math.floor(paletteacc[k].a / paletteacc[k].n)
                    };
                }

                // Randomizing a color, if there are too few pixels and there will be a new cycle
                if ((paletteacc[k].n / pixelnum < options.mincolorratio) && (cnt < options.colorquantcycles - 1)) {
                    palette[k] = {
                        r: Math.floor(Math.random() * 255),
                        g: Math.floor(Math.random() * 255),
                        b: Math.floor(Math.random() * 255),
                        a: Math.floor(Math.random() * 255)
                    };
                }

            }// End of palette loop
        }// End of Average colors from the second iteration

        // Reseting palette accumulator for averaging
        for (i = 0; i < palette.length; i++) {
            paletteacc[i] = {r: 0, g: 0, b: 0, a: 0, n: 0};
        }

        // loop through all pixels
        for (j = 0; j < imgd.height; j++) {
            for (i = 0; i < imgd.width; i++) {

                // pixel index
                idx = (j * imgd.width + i) * 4;

                // find closest color from palette by measuring (rectilinear) color distance between this pixel and all palette colors
                ci = 0;
                cdl = 1024; // 4 * 256 is the maximum RGBA distance
                for (k = 0; k < palette.length; k++) {

                    // In my experience, https://en.wikipedia.org/wiki/Rectilinear_distance works better than https://en.wikipedia.org/wiki/Euclidean_distance
                    cd = Math.abs(palette[k].r - imgd.data[idx]) + Math.abs(palette[k].g - imgd.data[idx + 1]) + Math.abs(palette[k].b - imgd.data[idx + 2]) + Math.abs(palette[k].a - imgd.data[idx + 3]);

                    // Remember this color if this is the closest yet
                    if (cd < cdl) {
                        cdl = cd;
                        ci = k;
                    }

                }// End of palette loop

                // add to palettacc
                paletteacc[ci].r += imgd.data[idx];
                paletteacc[ci].g += imgd.data[idx + 1];
                paletteacc[ci].b += imgd.data[idx + 2];
                paletteacc[ci].a += imgd.data[idx + 3];
                paletteacc[ci].n++;

                // update the indexed color array
                arr[j + 1][i + 1] = ci;

            }// End of i loop
        }// End of j loop

    }// End of Repeat clustering step options.colorquantcycles times

    return {array: arr, palette: palette};

}

// 2. Layer separation and edge detection
// Edge node types ( ▓: this layer or 1; ░: not this layer or 0 )
// 12  ░░  ▓░  ░▓  ▓▓  ░░  ▓░  ░▓  ▓▓  ░░  ▓░  ░▓  ▓▓  ░░  ▓░  ░▓  ▓▓
// 48  ░░  ░░  ░░  ░░  ░▓  ░▓  ░▓  ░▓  ▓░  ▓░  ▓░  ▓░  ▓▓  ▓▓  ▓▓  ▓▓

// Sampling a palette from imagedata
function samplePalette(numberofcolors, imgd) {
    var idx, palette = [];
    for (var i = 0; i < numberofcolors; i++) {
        idx = Math.floor(Math.random() * imgd.data.length / 4) * 4;
        palette.push({
            r: imgd.data[idx],
            g: imgd.data[idx + 1],
            b: imgd.data[idx + 2],
            a: imgd.data[idx + 3]
        });
    }
    return palette;
}

// 2. Layer separation and edge detection
// Edge node types ( ▓: this layer or 1; ░: not this layer or 0 )
// 12  ░░  ▓░  ░▓  ▓▓  ░░  ▓░  ░▓  ▓▓  ░░  ▓░  ░▓  ▓▓  ░░  ▓░  ░▓  ▓▓
// 48  ░░  ░░  ░░  ░░  ░▓  ░▓  ░▓  ░▓  ▓░  ▓░  ▓░  ▓░  ▓▓  ▓▓  ▓▓  ▓▓

// Deterministic sampling a palette from imagedata: rectangular grid
function samplePalette2(numberofcolors, imgd) {
    var idx, palette = [], ni = Math.ceil(Math.sqrt(numberofcolors)), nj = Math.ceil(numberofcolors / ni),
        vx = imgd.width / (ni + 1), vy = imgd.height / (nj + 1);
    for (var j = 0; j < nj; j++) {
        for (var i = 0; i < ni; i++) {
            if (palette.length === numberofcolors) {
                break;
            } else {
                idx = Math.floor(((j + 1) * vy) * imgd.width + ((i + 1) * vx)) * 4;
                palette.push({
                    r: imgd.data[idx],
                    g: imgd.data[idx + 1],
                    b: imgd.data[idx + 2],
                    a: imgd.data[idx + 3]
                });
            }
        }
    }
    return palette;
}

// Generating a palette with numberofcolors
function generatePalette(numberofcolors: number): Palette {
    var palette = [], rcnt, gcnt, bcnt;
    if (numberofcolors < 8) {

        // Grayscale
        var graystep = Math.floor(255 / (numberofcolors - 1));
        for (var i = 0; i < numberofcolors; i++) {
            palette.push({r: i * graystep, g: i * graystep, b: i * graystep, a: 255});
        }

    } else {

        // RGB color cube
        var colorqnum = Math.floor(Math.pow(numberofcolors, 1 / 3)), // Number of points on each edge on the RGB color cube
            colorstep = Math.floor(255 / (colorqnum - 1)), // distance between points
            rndnum = numberofcolors - colorqnum * colorqnum * colorqnum; // number of random colors

        for (rcnt = 0; rcnt < colorqnum; rcnt++) {
            for (gcnt = 0; gcnt < colorqnum; gcnt++) {
                for (bcnt = 0; bcnt < colorqnum; bcnt++) {
                    palette.push({r: rcnt * colorstep, g: gcnt * colorstep, b: bcnt * colorstep, a: 255});
                }// End of blue loop
            }// End of green loop
        }// End of red loop

        // Rest is random
        for (rcnt = 0; rcnt < rndnum; rcnt++) {
            palette.push({
                r: Math.floor(Math.random() * 255),
                g: Math.floor(Math.random() * 255),
                b: Math.floor(Math.random() * 255),
                a: Math.floor(Math.random() * 255)
            });
        }

    }// End of numberofcolors check

    return palette;
}

// Lookup tables for pathscan

//     0   1   2   3   4   5   6   7   8   9   10  11  12  13  14  15
function layering(ii: IndexedImage): NumberArray3D {
    // Creating layers for each indexed color in arr
    var layers = [], val = 0, ah = ii.array.length, aw = ii.array[0].length, n1, n2, n3, n4, n5, n6, n7, n8,
        i, j, k;

    // Create layers
    for (k = 0; k < ii.palette.length; k++) {
        layers[k] = [];
        for (j = 0; j < ah; j++) {
            layers[k][j] = [];
            for (i = 0; i < aw; i++) {
                layers[k][j][i] = 0;
            }
        }
    }

    // Looping through all pixels and calculating edge node type
    for (j = 1; j < ah - 1; j++) {
        for (i = 1; i < aw - 1; i++) {

            // This pixel's indexed color
            val = ii.array[j][i];

            // Are neighbor pixel colors the same?
            n1 = ii.array[j - 1][i - 1] === val ? 1 : 0;
            n2 = ii.array[j - 1][i] === val ? 1 : 0;
            n3 = ii.array[j - 1][i + 1] === val ? 1 : 0;
            n4 = ii.array[j][i - 1] === val ? 1 : 0;
            n5 = ii.array[j][i + 1] === val ? 1 : 0;
            n6 = ii.array[j + 1][i - 1] === val ? 1 : 0;
            n7 = ii.array[j + 1][i] === val ? 1 : 0;
            n8 = ii.array[j + 1][i + 1] === val ? 1 : 0;

            // this pixel's type and looking back on previous pixels
            layers[val][j + 1][i + 1] = 1 + n5 * 2 + n8 * 4 + n7 * 8;
            if (!n4) {
                layers[val][j + 1][i] = 0 + 2 + n7 * 4 + n6 * 8;
            }
            if (!n2) {
                layers[val][j][i + 1] = 0 + n3 * 2 + n5 * 4 + 8;
            }
            if (!n1) {
                layers[val][j][i] = 0 + n2 * 2 + 4 + n4 * 8;
            }

        }// End of i loop
    }// End of j loop

    return layers;
}

// 3. Walking through an edge node array, discarding edge node types 0 and 15 and creating paths from the rest.

//     0   1   2   3   4   5   6   7   8   9   10  11  12  13  14  15
function layeringStep(ii, cnum) {
    // Creating layers for each indexed color in arr
    var layer = [], val = 0, ah = ii.array.length, aw = ii.array[0].length, n1, n2, n3, n4, n5, n6, n7, n8,
        i, j, k;

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
                (ii.array[j - 1][i - 1] === cnum ? 1 : 0) +
                (ii.array[j - 1][i] === cnum ? 2 : 0) +
                (ii.array[j][i - 1] === cnum ? 8 : 0) +
                (ii.array[j][i] === cnum ? 4 : 0)
            ;
        }// End of i loop
    }// End of j loop

    return layer;
}

// Point in polygon test
function isPointInPolygon(p, pa): boolean {
    var isin = false;

    for (var i = 0, j = pa.length - 1; i < pa.length; j = i++) {
        isin =
            (((pa[i].y > p.y) !== (pa[j].y > p.y)) && (p.x < (pa[j].x - pa[i].x) * (p.y - pa[i].y) / (pa[j].y - pa[i].y) + pa[i].x))
                ? !isin : isin;
    }

    return isin;
}

// Walk directions (dir): 0 > ; 1 ^ ; 2 < ; 3 v
function pathscan(arr, pathomit) {
    var paths = [], pacnt = 0, pcnt = 0, px = 0, py = 0, w = arr[0].length, h = arr.length,
        dir = 0, pathfinished = true, holepath = false, lookuprow;

    for (var j = 0; j < h; j++) {
        for (var i = 0; i < w; i++) {
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

                            paths[pacnt].isholepath = holepath ? true : false;

                            // Finding the parent shape for this hole
                            if (holepath) {

                                var parentidx = 0, parentbbox = [-1, -1, w + 1, h + 1];
                                for (var parentcnt = 0; parentcnt < pacnt; parentcnt++) {
                                    if ((!paths[parentcnt].isholepath) &&
                                        boundingboxincludes(paths[parentcnt].boundingbox, paths[pacnt].boundingbox) &&
                                        boundingboxincludes(parentbbox, paths[parentcnt].boundingbox) &&
                                        isPointInPolygon(paths[pacnt].points[0], paths[parentcnt].points)
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
}// End of pathscan()

function boundingboxincludes(parentbbox, childbbox) {
    return ((parentbbox[0] < childbbox[0]) && (parentbbox[1] < childbbox[1]) && (parentbbox[2] > childbbox[2]) && (parentbbox[3] > childbbox[3]));
}// End of boundingboxincludes()

// 3. Batch pathscan
function batchpathscan(layers, pathomit) {
    var bpaths = [];
    for (var k in layers) {
        if (!layers.hasOwnProperty(k)) {
            continue;
        }
        bpaths[k] = pathscan(layers[k], pathomit);
    }
    return bpaths;
}

// 4. interpollating between path points for nodes with 8 directions ( East, SouthEast, S, SW, W, NW, N, NE )
function internodes(paths, options) {
    var ins = [], palen = 0, nextidx = 0, nextidx2 = 0, previdx = 0, previdx2 = 0, pacnt, pcnt;

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
            if (options.rightangleenhance && testrightangle(paths[pacnt], previdx2, previdx, pcnt, nextidx, nextidx2)) {

                // Fix previous direction
                if (ins[pacnt].points.length > 0) {
                    ins[pacnt].points[ins[pacnt].points.length - 1].linesegment = getdirection(
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
                    linesegment: getdirection(
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
                linesegment: getdirection(
                    ((paths[pacnt].points[pcnt].x + paths[pacnt].points[nextidx].x) / 2),
                    ((paths[pacnt].points[pcnt].y + paths[pacnt].points[nextidx].y) / 2),
                    ((paths[pacnt].points[nextidx].x + paths[pacnt].points[nextidx2].x) / 2),
                    ((paths[pacnt].points[nextidx].y + paths[pacnt].points[nextidx2].y) / 2)
                )
            });

        }// End of pathpoints loop

    }// End of paths loop

    return ins;
}// End of internodes()

function testrightangle(path, idx1, idx2, idx3, idx4, idx5) {
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
}// End of testrightangle()

// 5. tracepath() : recursively trying to fit straight and quadratic spline segments on the 8 direction internode path

// 5.1. Find sequences of points with only 2 segment types
// 5.2. Fit a straight line on the sequence
// 5.3. If the straight line fails (distance error > ltres), find the point with the biggest error
// 5.4. Fit a quadratic spline through errorpoint (project this to get controlpoint), then measure errors on every point in the sequence
// 5.5. If the spline fails (distance error > qtres), find the point with the biggest error, set splitpoint = fitting point
// 5.6. Split sequence and recursively apply 5.2. - 5.6. to startpoint-splitpoint and splitpoint-endpoint sequences

function getdirection(x1, y1, x2, y2) {
    var val = 8;
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
}// End of getdirection()

// 5.2. - 5.6. recursively fitting a straight or quadratic line segment on this sequence of path nodes,

// 4. Batch interpollation
function batchinternodes(bpaths, options) {
    var binternodes = [];
    for (var k in bpaths) {
        if (!bpaths.hasOwnProperty(k)) {
            continue;
        }
        binternodes[k] = internodes(bpaths[k], options);
    }
    return binternodes;
}

function tracepath(path, ltres, qtres) {
    var pcnt = 0, segtype1, segtype2, seqend, smp = {};
    smp.segments = [];
    smp.boundingbox = path.boundingbox;
    smp.holechildren = path.holechildren;
    smp.isholepath = path.isholepath;

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
        smp.segments = smp.segments.concat(fitseq(path, ltres, qtres, pcnt, seqend));

        // forward pcnt;
        if (seqend > 0) {
            pcnt = seqend;
        } else {
            pcnt = path.points.length;
        }

    }// End of pcnt loop

    return smp;
}

// called from tracepath()
function fitseq(path, ltres, qtres, seqstart, seqend) {
    // return if invalid seqend
    if ((seqend > path.points.length) || (seqend < 0)) {
        return [];
    }
    // variables
    var errorpoint = seqstart, errorval = 0, curvepass = true, px, py, dist2;
    var tl = (seqend - seqstart);
    if (tl < 0) {
        tl += path.points.length;
    }
    var vx = (path.points[seqend].x - path.points[seqstart].x) / tl,
        vy = (path.points[seqend].y - path.points[seqstart].y) / tl;

    // 5.2. Fit a straight line on the sequence
    var pcnt = (seqstart + 1) % path.points.length, pl;
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
    var fitpoint = errorpoint;
    curvepass = true;
    errorval = 0;

    // 5.4. Fit a quadratic spline through this point, measure errors on every point in the sequence
    // helpers and projecting to get control point
    var t = (fitpoint - seqstart) / tl, t1 = (1 - t) * (1 - t), t2 = 2 * (1 - t) * t, t3 = t * t;
    var cpx = (t1 * path.points[seqstart].x + t3 * path.points[seqend].x - path.points[fitpoint].x) / -t2,
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
    var splitpoint = fitpoint; // Earlier: Math.floor((fitpoint + errorpoint)/2);

    // 5.6. Split sequence and recursively apply 5.2. - 5.6. to startpoint-splitpoint and splitpoint-endpoint sequences
    return fitseq(path, ltres, qtres, seqstart, splitpoint).concat(
        fitseq(path, ltres, qtres, splitpoint, seqend));

}

////////////////////////////////////////////////////////////
//
//  SVG Drawing functions
//
////////////////////////////////////////////////////////////

// 5. Batch tracing paths
function batchtracepaths(internodepaths, ltres, qtres) {
    var btracedpaths = [];
    for (var k in internodepaths) {
        if (!internodepaths.hasOwnProperty(k)) {
            continue;
        }
        btracedpaths.push(tracepath(internodepaths[k], ltres, qtres));
    }
    return btracedpaths;
}

// 5. Batch tracing layers
function batchtracelayers(binternodes, ltres, qtres) {
    var btbis = [];
    for (var k in binternodes) {
        if (!binternodes.hasOwnProperty(k)) {
            continue;
        }
        btbis[k] = batchtracepaths(binternodes[k], ltres, qtres);
    }
    return btbis;
}

// Rounding to given decimals https://stackoverflow.com/questions/11832914/round-to-at-most-2-decimal-places-in-javascript
function roundtodec(val, places) {
    return +val.toFixed(places);
}

// Getting SVG path element string from a traced path
function svgpathstring(tracedata, lnum, pathnum, options) {

    var layer = tracedata.layers[lnum], smp = layer[pathnum], str = '', pcnt;

    // Line filter
    if (options.linefilter && (smp.segments.length < 3)) {
        return str;
    }

    // Starting path element, desc contains layer and path number
    str = '<path ' +
        (options.desc ? ('desc="l ' + lnum + ' p ' + pathnum + '" ') : '') +
        tosvgcolorstr(tracedata.palette[lnum], options) +
        'd="';

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
        str += 'M ' + roundtodec(smp.segments[0].x1 * options.scale, options.roundcoords) + ' ' + roundtodec(smp.segments[0].y1 * options.scale, options.roundcoords) + ' ';
        for (pcnt = 0; pcnt < smp.segments.length; pcnt++) {
            str += smp.segments[pcnt].type + ' ' + roundtodec(smp.segments[pcnt].x2 * options.scale, options.roundcoords) + ' ' + roundtodec(smp.segments[pcnt].y2 * options.scale, options.roundcoords) + ' ';
            if (smp.segments[pcnt].hasOwnProperty('x3')) {
                str += roundtodec(smp.segments[pcnt].x3 * options.scale, options.roundcoords) + ' ' + roundtodec(smp.segments[pcnt].y3 * options.scale, options.roundcoords) + ' ';
            }
        }
        str += 'Z ';
    }// End of creating non-hole path string

    // Hole children
    for (var hcnt = 0; hcnt < smp.holechildren.length; hcnt++) {
        var hsmp = layer[smp.holechildren[hcnt]];
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
                str += 'M ' + roundtodec(hsmp.segments[hsmp.segments.length - 1].x3 * options.scale) + ' ' + roundtodec(hsmp.segments[hsmp.segments.length - 1].y3 * options.scale) + ' ';
            } else {
                str += 'M ' + roundtodec(hsmp.segments[hsmp.segments.length - 1].x2 * options.scale) + ' ' + roundtodec(hsmp.segments[hsmp.segments.length - 1].y2 * options.scale) + ' ';
            }

            for (pcnt = hsmp.segments.length - 1; pcnt >= 0; pcnt--) {
                str += hsmp.segments[pcnt].type + ' ';
                if (hsmp.segments[pcnt].hasOwnProperty('x3')) {
                    str += roundtodec(hsmp.segments[pcnt].x2 * options.scale) + ' ' + roundtodec(hsmp.segments[pcnt].y2 * options.scale) + ' ';
                }
                str += roundtodec(hsmp.segments[pcnt].x1 * options.scale) + ' ' + roundtodec(hsmp.segments[pcnt].y1 * options.scale) + ' ';
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
        for (var hcnt = 0; hcnt < smp.holechildren.length; hcnt++) {
            var hsmp = layer[smp.holechildren[hcnt]];
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

// Converting tracedata to an SVG string
function getSvgString(traceData: TraceData, options): string {

    options = checkOptions(options);

    var w = traceData.width * options.scale, h = traceData.height * options.scale;

    // SVG start
    var svgstr = '<svg ' + (options.viewbox ? ('viewBox="0 0 ' + w + ' ' + h + '" ') : ('width="' + w + '" height="' + h + '" ')) +
        'version="1.1" xmlns="http://www.w3.org/2000/svg" >';

    // Drawing: Layers and Paths loops
    for (var lcnt = 0; lcnt < traceData.layers.length; lcnt++) {
        for (var pcnt = 0; pcnt < traceData.layers[lcnt].length; pcnt++) {

            // Adding SVG <path> string
            if (!traceData.layers[lcnt][pcnt].isholepath) {
                svgstr += svgpathstring(traceData, lcnt, pcnt, options);
            }

        }// End of paths loop
    }// End of layers loop

    // SVG End
    svgstr += '</svg>';

    return svgstr;

}

// Comparator for numeric Array.sort
function compareNumbers(a, b) {
    return a - b;
}

// Convert color object to rgba stringfunction
function toRGBA(c): string {
    return 'rgba(' + c.r + ',' + c.g + ',' + c.b + ',' + c.a + ')';
}

////////////////////////////////////////////////////////////
//
//  Canvas functions
//
////////////////////////////////////////////////////////////

// Convert color object to SVG color string
function tosvgcolorstr(c, options) {
    return 'fill="rgb(' + c.r + ',' + c.g + ',' + c.b + ')" stroke="rgb(' + c.r + ',' + c.g + ',' + c.b + ')" stroke-width="' + options.strokewidth + '" opacity="' + c.a / 255.0 + '" ';
}

// Helper function: Appending an <svg> element to a container from an svgstring
function appendSVGString(svgstr, parentid) {
    var div;
    if (parentid) {
        div = document.getElementById(parentid);
        if (!div) {
            div = document.createElement('div');
            div.id = parentid;
            document.body.appendChild(div);
        }
    } else {
        div = document.createElement('div');
        document.body.appendChild(div);
    }
    div.innerHTML += svgstr;
}

// Selective Gaussian blur for preprocessing
function blur(imgd, radius, delta) {
    var i, j, k, d, idx, racc, gacc, bacc, aacc, wacc;

    // new ImageData
    var imgd2 = {width: imgd.width, height: imgd.height, data: []};

    // radius and delta limits, this kernel
    radius = Math.floor(radius);
    if (radius < 1) {
        return imgd;
    }
    if (radius > 5) {
        radius = 5;
    }
    delta = Math.abs(delta);
    if (delta > 1024) {
        delta = 1024;
    }
    var thisgk = gaussianKernels[radius - 1];

    // loop through all pixels, horizontal blur
    for (j = 0; j < imgd.height; j++) {
        for (i = 0; i < imgd.width; i++) {

            racc = 0;
            gacc = 0;
            bacc = 0;
            aacc = 0;
            wacc = 0;
            // gauss kernel loop
            for (k = -radius; k < radius + 1; k++) {
                // add weighted color values
                if ((i + k > 0) && (i + k < imgd.width)) {
                    idx = (j * imgd.width + i + k) * 4;
                    racc += imgd.data[idx] * thisgk[k + radius];
                    gacc += imgd.data[idx + 1] * thisgk[k + radius];
                    bacc += imgd.data[idx + 2] * thisgk[k + radius];
                    aacc += imgd.data[idx + 3] * thisgk[k + radius];
                    wacc += thisgk[k + radius];
                }
            }
            // The new pixel
            idx = (j * imgd.width + i) * 4;
            imgd2.data[idx] = Math.floor(racc / wacc);
            imgd2.data[idx + 1] = Math.floor(gacc / wacc);
            imgd2.data[idx + 2] = Math.floor(bacc / wacc);
            imgd2.data[idx + 3] = Math.floor(aacc / wacc);

        }// End of width loop
    }// End of horizontal blur

    // copying the half blurred imgd2
    var himgd = new Uint8ClampedArray(imgd2.data);

    // loop through all pixels, vertical blur
    for (j = 0; j < imgd.height; j++) {
        for (i = 0; i < imgd.width; i++) {

            racc = 0;
            gacc = 0;
            bacc = 0;
            aacc = 0;
            wacc = 0;
            // gauss kernel loop
            for (k = -radius; k < radius + 1; k++) {
                // add weighted color values
                if ((j + k > 0) && (j + k < imgd.height)) {
                    idx = ((j + k) * imgd.width + i) * 4;
                    racc += himgd[idx] * thisgk[k + radius];
                    gacc += himgd[idx + 1] * thisgk[k + radius];
                    bacc += himgd[idx + 2] * thisgk[k + radius];
                    aacc += himgd[idx + 3] * thisgk[k + radius];
                    wacc += thisgk[k + radius];
                }
            }
            // The new pixel
            idx = (j * imgd.width + i) * 4;
            imgd2.data[idx] = Math.floor(racc / wacc);
            imgd2.data[idx + 1] = Math.floor(gacc / wacc);
            imgd2.data[idx + 2] = Math.floor(bacc / wacc);
            imgd2.data[idx + 3] = Math.floor(aacc / wacc);

        }// End of width loop
    }// End of vertical blur

    // Selective blur: loop through all pixels
    for (j = 0; j < imgd.height; j++) {
        for (i = 0; i < imgd.width; i++) {

            idx = (j * imgd.width + i) * 4;
            // d is the difference between the blurred and the original pixel
            d = Math.abs(imgd2.data[idx] - imgd.data[idx]) + Math.abs(imgd2.data[idx + 1] - imgd.data[idx + 1]) +
                Math.abs(imgd2.data[idx + 2] - imgd.data[idx + 2]) + Math.abs(imgd2.data[idx + 3] - imgd.data[idx + 3]);
            // selective blur: if d>delta, put the original pixel back
            if (d > delta) {
                imgd2.data[idx] = imgd.data[idx];
                imgd2.data[idx + 1] = imgd.data[idx + 1];
                imgd2.data[idx + 2] = imgd.data[idx + 2];
                imgd2.data[idx + 3] = imgd.data[idx + 3];
            }
        }
    }// End of Selective blur

    return imgd2;

}

// Helper function: Drawing all edge node layers into a container
function drawLayers(layers, palette: Palette, scale, parentid) {
    scale = scale || 1;
    var w, h, i, j, k;

    // Preparing container
    var div;
    if (parentid) {
        div = document.getElementById(parentid);
        if (!div) {
            div = document.createElement('div');
            div.id = parentid;
            document.body.appendChild(div);
        }
    } else {
        div = document.createElement('div');
        document.body.appendChild(div);
    }

    // Layers loop
    for (k in layers) {
        if (!layers.hasOwnProperty(k)) {
            continue;
        }

        // width, height
        w = layers[k][0].length;
        h = layers[k].length;

        // Creating new canvas for every layer
        var canvas = document.createElement('canvas');
        canvas.width = w * scale;
        canvas.height = h * scale;
        var context = canvas.getContext('2d');

        // Drawing
        for (j = 0; j < h; j++) {
            for (i = 0; i < w; i++) {
                context.fillStyle = toRGBA(palette[layers[k][j][i] % palette.length]);
                context.fillRect(i * scale, j * scale, scale, scale);
            }
        }

        // Appending canvas to container
        div.appendChild(canvas);
    }// End of Layers loop
}

export type ImageData = {
    height: number
    width: number
    data: Buffer
}

export type TraceData = {
    layers: Array<any>,
    palette: any,
    width: number,
    height: number
}

export type Color = {
    r: number, g: number, b: number, a: number
}

export type Palette = Array<Color>

export type IndexedImage = {
    array: NumberArray2D,
    palette: Palette
}

export type NumberArray2D = Array<Array<number>>
export type NumberArray3D = Array<Array<Array<number>>>