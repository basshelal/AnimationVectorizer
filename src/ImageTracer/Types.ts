import {from} from "../Utils";

export type Grid<T> = Array<Array<T>>
export type Palette = Array<Color>

export class Point {
    x: number
    y: number
    linesegment: number

    constructor({x, y, linesegment}: { x: number, y: number, linesegment: any }) {
        this.x = x
        this.y = y
        this.linesegment = linesegment
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

export class Path {
    points: Array<Point> = []
    boundingBox: Array<any> = []
    holeChildren: Array<any> = []
    isHolePath: boolean = false
}

// TODO don't know what this is yet
//  likely a Path Segment or Segments of paths something like that
export type SMP = {
    segments: Array<any>,
    boundingBox: any,
    holeChildren: any,
    isHolePath: any
}

export class IndexedImage {
    array: Grid<number>
    palette: Palette

    constructor({array, palette}: { array: Grid<number>, palette: Palette }) {
        this.array = array
        this.palette = palette
    }
}

export class TraceData {
    public layers: Array<Array<any>>
    public palette: Palette
    public width: number
    public height: number

    constructor({layers, palette, width, height}: {
        layers: Array<any>,
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

    toCSSString(): string {
        return `rgb(${[this.r, this.g, this.b, this.a]
            .map(n => Math.floor(n))
            .join(",")})`
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
        for (let dataIndex = 0, pxIndex = 0; dataIndex < this.data.length; dataIndex += 4, pxIndex++) {
            result[pxIndex] = new Color({
                r: this.data[dataIndex],
                g: this.data[dataIndex + 1],
                b: this.data[dataIndex + 2],
                a: this.data[dataIndex + 3]
            })
        }
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

    ensureRGBA(): ImageData {
        if (this.isRGB) {
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
}
