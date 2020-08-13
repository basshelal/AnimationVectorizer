import {from} from "../Utils";

export type Grid<T> = Array<Array<T>>
export type Palette = Array<Color>

export class Point {
    x: number
    y: number

    constructor({x, y}: { x: number, y: number }) {
        this.x = x
        this.y = y
    }

    isInPolygon(polygon: Array<Point>): boolean {
        let isIn = false

        // 2 pointer for loop r being 1 greater than l, and l being max when r == 0
        for (let r = 0, l = polygon.length - 1; r < polygon.length; l = r++) {
            isIn =
                (((polygon[r].y > this.y) !== (polygon[l].y > this.y)) &&
                    (this.x <
                        ((polygon[l].x - polygon[r].x) * (this.y - polygon[r].y) / (polygon[l].y - polygon[r].y) + polygon[r].x)
                    )) ? !isIn : isIn
        }

        return isIn
    }
}

export class SegmentPoint extends Point {
    lineSegment: Direction

    constructor({x, y, lineSegment}: { x: number, y: number, lineSegment: Direction }) {
        super({x, y})
        this.lineSegment = lineSegment
    }
}

export class Path {
    boundingBox: BoundingBox
    holeChildren: Array<number> = []
    isHolePath: boolean = false

    constructor({boundingBox, holeChildren, isHolePath}: {
        boundingBox: BoundingBox,
        holeChildren: Array<number>,
        isHolePath: boolean
    }) {
        this.boundingBox = boundingBox;
        this.holeChildren = holeChildren;
        this.isHolePath = isHolePath;
    }
}

export class PointPath extends Path {
    points: Array<SegmentPoint> = []

    constructor({boundingBox, holeChildren, isHolePath, points}: {
        boundingBox: BoundingBox,
        holeChildren: Array<number>,
        isHolePath: boolean,
        points: Array<SegmentPoint>
    }) {
        super({boundingBox, holeChildren, isHolePath})
        this.points = points
    }

    static fromPath(path: Path, points: Array<SegmentPoint> = []): PointPath {
        return new PointPath({
            boundingBox: path.boundingBox,
            holeChildren: path.holeChildren,
            isHolePath: path.isHolePath,
            points: points
        })
    }
}

export class SegmentPath extends Path {
    segments: Array<Segment> = []

    constructor({boundingBox, holeChildren, isHolePath, segments}: {
        boundingBox: BoundingBox,
        holeChildren: Array<number>,
        isHolePath: boolean,
        segments: Array<Segment>
    }) {
        super({boundingBox, holeChildren, isHolePath})
        this.segments = segments
    }

    static fromPath(path: Path, segments: Array<Segment> = []): SegmentPath {
        return new SegmentPath({
            boundingBox: path.boundingBox,
            holeChildren: path.holeChildren,
            isHolePath: path.isHolePath,
            segments: segments
        })
    }
}

export type SVGPathCommand = "M" | "L" | "H" | "V" | "Z" | "C" | "S" | "Q" | "T" | "A"

export class Segment {
    type: SVGPathCommand
    x1: number
    y1: number
    x2: number
    y2: number
    x3: number | null
    y3: number | null

    constructor({type, x1, y1, x2, y2, x3, y3}: {
        type: SVGPathCommand, x1: number, y1: number, x2: number, y2: number, x3?: number | null, y3?: number | null
    }) {
        this.type = type
        this.x1 = x1
        this.y1 = y1
        this.x2 = x2
        this.y2 = y2
        this.x3 = x3 ? x3 : null
        this.y3 = y3 ? y3 : null
    }

    get has3(): boolean {
        return this.x3 !== null && this.y3 !== null
    }
}

export type Direction = "N" | "S" | "E" | "W" | "NE" | "NW" | "SE" | "SW" | null

// Edge node types ( ▓: this layer or 1; ░: not this layer or 0 )
// 12  ░░  ▓░  ░▓  ▓▓  ░░  ▓░  ░▓  ▓▓  ░░  ▓░  ░▓  ▓▓  ░░  ▓░  ░▓  ▓▓
// 48  ░░  ░░  ░░  ░░  ▓░  ▓░  ▓░  ▓░  ░▓  ░▓  ░▓  ░▓  ▓▓  ▓▓  ▓▓  ▓▓
//     0   1   2   3   4   5   6   7   8   9   10  11  12  13  14  15
// order is top left (1), top right (2), bottom left (4), bottom right (8)
const EdgeNodeTypeList = {
    0: [0, 0, 0, 0],
    1: [1, 0, 0, 0],
    2: [0, 2, 0, 0],
    3: [1, 2, 0, 0],
    4: [0, 0, 4, 0],
    5: [1, 0, 4, 0],
    6: [0, 2, 4, 0],
    7: [1, 2, 4, 0],
    8: [0, 0, 0, 8],
    9: [1, 0, 0, 8],
    10: [0, 2, 0, 8],
    11: [1, 2, 0, 8],
    12: [0, 0, 4, 8],
    13: [1, 0, 4, 8],
    14: [0, 2, 4, 8],
    15: [1, 2, 4, 8]
}

export class BoundingBox {
    x1: number
    y1: number
    x2: number
    y2: number

    constructor({x1, y1, x2, y2}: { x1: number, y1: number, x2: number, y2: number }) {
        this.x1 = x1
        this.y1 = y1
        this.x2 = x2
        this.y2 = y2
    }

    includes(other: BoundingBox): boolean {
        return this.x1 < other.x1 &&
            this.y1 < other.y1 &&
            this.x2 > other.x2 &&
            this.y2 > other.y2
    }
}

export class IndexedImage {
    array: Grid<number>
    palette: Palette

    constructor({array, palette}: { array: Grid<number>, palette: Palette }) {
        this.array = array
        this.palette = palette
    }

    get height(): number {
        return this.array.length
    }

    get width(): number {
        return this.array[0].length | 0
    }

    get total(): number {
        return this.height * this.width
    }
}

export class TraceData {
    public layers: Grid<SegmentPath>
    public palette: Palette
    public width: number
    public height: number

    constructor({layers, palette, width, height}: {
        layers: Grid<SegmentPath>,
        palette: Palette,
        width: number,
        height: number
    }) {
        this.layers = layers
        this.palette = palette
        this.width = width
        this.height = height
    }
}

// TODO Technically this is also a representation of Pixel, should we change its name to that?
export class Color {

    public r: number
    public g: number
    public b: number
    public a: number

    // TODO we should remove alpha at some point when we understand how everything works because we don't need it

    constructor(color?: { r: number, g: number, b: number, a?: number }) {
        if (color) {
            this.r = color.r
            this.g = color.g
            this.b = color.b
            if (color.a) this.a = color.a; else this.a = 255
        } else {
            this.r = 0
            this.g = 0
            this.b = 0
            this.a = 0
        }
    }

    get array(): Array<number> {
        return [this.r, this.g, this.b, this.r + this.g + this.b]
    }

    private static hex(channelValue: number): string {
        let hex = Number(channelValue).toString(16)
        if (hex.length < 2) hex = "0" + hex
        return hex
    }

    set data(color: { r: number, g: number, b: number, a: number }) {
        this.r = color.r
        this.g = color.g
        this.b = color.b
        this.a = color.a
    }

    get toRGB(): string {
        return `rgb(${this.r},${this.g},${this.b})`
    }

    get toRGBA(): string {
        return `rgba(${this.r},${this.g},${this.b},${this.a})`
    }

    get toSVG(): string {
        return `fill="${this.toHex()}" stroke="${this.toHex()}"`
    }

    toHex(ignoreAlpha: boolean = true): string {
        return `#${Color.hex(this.r)}${Color.hex(this.g)}${Color.hex(this.b)}${!ignoreAlpha ? Color.hex(this.a) : ""}`
    }

    get toCSS(): string {
        return `rgb(${this.r.floor()},${this.g.floor()},${this.b.floor()})`
    }

    clone(): Color {
        return new Color({r: this.r, g: this.g, b: this.b, a: this.a})
    }

    normalized(pixelCount: number): Color {
        return new Color({
            r: this.r / pixelCount,
            g: this.g / pixelCount,
            b: this.b / pixelCount
        })
    }

    add(color: Color) {
        this.r += color.r
        this.g += color.g
        this.b += color.b
    }

    round() {
        this.r = this.r.round()
        this.g = this.g.round()
        this.b = this.b.round()
        this.a = this.a.round()
    }
}

export class ImageData {
    public height: number
    public width: number
    public data: Buffer
    public totalPixels: number

    constructor({height, width, data}: { height: number, width: number, data: Buffer }) {
        this.height = height
        this.width = width
        this.data = data
        this.totalPixels = this.width * this.height
    }

    get isRGBA(): boolean {
        return this.data.length > this.totalPixels * 3
    }

    get isRGB(): boolean {
        return this.data.length < this.totalPixels * 4
    }

    get pixels(): Array<Color> {
        this.ensureRGBA()
        const result: Array<Color> = []
        let pxIndex = 0
        from(0).to(this.data.length).step(4).forEach(dataIndex => {
            result[pxIndex] = new Color({
                r: this.data[dataIndex],
                g: this.data[dataIndex + 1],
                b: this.data[dataIndex + 2],
                a: this.data[dataIndex + 3]
            })
            pxIndex++
        })
        return result
    }

    get uniqueColors(): Array<Color> {
        return Array.from(new Set(this.pixels))
    }

    static fromPixels(pixels: Array<Color>, width?: number, height?: number): ImageData {
        const buffer = Buffer.alloc(pixels.length * 4)
        pixels.forEach((color: Color, index: number) => {
            buffer[index * 4] = color.r
            buffer[index * 4 + 1] = color.g
            buffer[index * 4 + 2] = color.b
            buffer[index * 4 + 3] = color.a
        })
        return new ImageData({
            data: buffer,
            width: (width ? width : pixels.length.sqrt().ceil()),
            height: (height ? height : pixels.length.sqrt().ceil())
        })
    }

    ensureRGB(): ImageData {
        if (this.isRGBA) {
            const newImgData = Buffer.alloc(this.totalPixels * 3)
            from(0).to(this.totalPixels).forEach((pxIndex: number) => {
                newImgData[pxIndex * 3] = this.data[pxIndex * 4] // r
                newImgData[pxIndex * 3 + 1] = this.data[pxIndex * 4 + 1] // g
                newImgData[pxIndex * 3 + 2] = this.data[pxIndex * 4 + 2] // b
            })
            this.data = newImgData
        }
        return this
    }

    forEachPixel(func: (y: number, x: number, color: Color) => void): ImageData {
        from(0).to(this.height).forEach(y => {
            from(0).to(this.width).forEach(x => {
                const index = 4 * (y * this.width + x)
                func(y, x, new Color({
                    r: this.data[index],
                    g: this.data[index + 1],
                    b: this.data[index + 2],
                    a: this.data[index + 3],
                }))
            })
        })
        return this
    }

    ensureRGBA(): ImageData {
        if (this.isRGB) {
            const newImgData = Buffer.alloc(this.totalPixels * 4)
            from(0).to(this.totalPixels).forEach((pxIndex: number) => {
                newImgData[pxIndex * 4] = this.data[pxIndex * 3] // r
                newImgData[pxIndex * 4 + 1] = this.data[pxIndex * 3 + 1] // g
                newImgData[pxIndex * 4 + 2] = this.data[pxIndex * 3 + 2] // b
                newImgData[pxIndex * 4 + 3] = 255 // a
            })
            this.data = newImgData
        }
        return this
    }
}
