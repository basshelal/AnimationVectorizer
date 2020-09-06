import {average, from, json, random} from "./Utils";
import {COLOR_BGRA2RGB, COLOR_GRAY2RGB, CV_8UC3, Mat} from "opencv4nodejs";
import {assert} from "./Log";

export type Grid<T> = Array<Array<T>>
export type Palette = Array<Pixel>

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

    shifted(direction: Direction, amount: number = 1): Point {
        const x = this.x
        const y = this.y
        const a = amount
        switch (direction) {
            case "N":
                return new Point({x: x, y: y - a})
            case "NE":
                return new Point({x: x + a, y: y - a})
            case "E":
                return new Point({x: x + a, y: y})
            case "SE":
                return new Point({x: x + a, y: y + a})
            case "S":
                return new Point({x: x, y: y + a})
            case "SW":
                return new Point({x: x - a, y: y + a})
            case "W":
                return new Point({x: x - a, y: y})
            case "NW":
                return new Point({x: x - a, y: y - a})
            default :
                throw new Error(`Could not shift for direction ${direction} by amount ${a} in point ${this}`)
        }
    }

    toString(): string {
        return `{x: ${this.x}, y: ${this.y}}`
    }
}

export type SVGPathCommand = "M" | "L" | "H" | "V" | "Z" | "C" | "S" | "Q" | "T" | "A"

export type Direction = "N" | "NE" | "E" | "SE" | "S" | "SW" | "W" | "NW" | null

export const AllDirections: Array<Direction> = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]

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
    grid: Grid<number>
    palette: Palette

    constructor({grid, palette}: { grid: Grid<number>, palette: Palette }) {
        this.grid = grid
        this.palette = palette
    }

    get height(): number {
        return this.grid.length
    }

    get width(): number {
        return this.grid[0].length | 0
    }

    get total(): number {
        return this.height * this.width
    }
}

export class Pixel {
    r: number
    g: number
    b: number
    a: number

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

    get toSVGEdge(): string {
        return `fill="#ffffff" stroke="#000000" stroke-width="0.25" stroke-opacity="0.5"`
    }

    toHex(ignoreAlpha: boolean = true): string {
        return `#${Pixel.hex(this.r)}${Pixel.hex(this.g)}${Pixel.hex(this.b)}${!ignoreAlpha ? Pixel.hex(this.a) : ""}`
    }

    get toCSS(): string {
        return `rgb(${this.r.floor()},${this.g.floor()},${this.b.floor()})`
    }

    get isZero(): boolean {
        return this.r === 0 && this.g === 0 && this.b === 0
    }

    get isNotZero(): boolean {
        return !this.isZero
    }

    normalized(pixelCount: number): Pixel {
        return new Pixel({
            r: this.r / pixelCount,
            g: this.g / pixelCount,
            b: this.b / pixelCount
        })
    }

    add(color: Pixel) {
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

    difference(otherColor: Pixel): { r: number, g: number, b: number, a: number, average: number } {
        const r = this.r - otherColor.r
        const g = this.g - otherColor.g
        const b = this.b - otherColor.b
        const a = this.a - otherColor.a
        return {r: r, g: g, b: b, a: a, average: average(r, g, b, a)}
    }

    closeTo(otherColor: Pixel, delta: number, includeAlpha: boolean = false): boolean {
        return ((this.r - otherColor.r).abs() <= delta &&
            (this.g - otherColor.g).abs() <= delta &&
            (this.b - otherColor.b).abs() <= delta &&
            (includeAlpha ? (this.a - otherColor.a).abs() <= delta : true)
        )
    }

    copy(): Pixel {
        return new Pixel(this)
    }

    // region static {...}

    static fromRGBAString(rgbaString: string): Pixel {
        const regexp = rgbaString.match(/[^\srgba,()]\d*\d*\d*/g)
        if (!regexp) throw Error()
        const r = regexp[0]
        const g = regexp[1]
        const b = regexp[2]
        const a = regexp[3]
        if (!r || !g || !b || !a) throw Error(`RGBA parsing failed, provided:\n${rgbaString}\nregexp:\n${json(regexp)}`)
        return new Pixel({
            r: parseInt(r),
            g: parseInt(g),
            b: parseInt(b),
            a: parseInt(a),
        })
    }

    static hex(channelValue: number): string {
        let hex = Number(channelValue).toString(16)
        if (hex.length < 2) hex = "0" + hex
        return hex
    }

    static random(includeAlpha: boolean = false): Pixel {
        return new Pixel({
            r: (random() * 255).roundToDec(0),
            g: (random() * 255).roundToDec(0),
            b: (random() * 255).roundToDec(0),
            a: includeAlpha ? (random() * 255).roundToDec(0) : 255
        })
    }

    static WHITE = new Pixel({r: 255, g: 255, b: 255, a: 255})
    static ZERO = new Pixel({r: 0, g: 0, b: 0, a: 0})
    static BLACK = new Pixel({r: 0, g: 0, b: 0, a: 255})
    static RED = new Pixel({r: 255, g: 0, b: 0, a: 255})
    static GREEN = new Pixel({r: 0, g: 255, b: 0, a: 255})
    static BLUE = new Pixel({r: 0, g: 0, b: 255, a: 255})
    static MAGENTA = new Pixel({r: 255, g: 0, b: 255, a: 255})

    // endregion static {...}

}

export class ImageData {
    height: number
    width: number
    data: Buffer
    totalPixels: number

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

    get pixels(): Array<Pixel> {
        this.ensureRGBA()
        const result: Array<Pixel> = []
        let pxIndex = 0
        from(0).to(this.data.length).step(4).forEach(dataIndex => {
            result[pxIndex] = new Pixel({
                r: this.data[dataIndex],
                g: this.data[dataIndex + 1],
                b: this.data[dataIndex + 2],
                a: this.data[dataIndex + 3]
            })
            pxIndex++
        })
        return result
    }

    get pixelsGrid(): Grid<Pixel> {
        const result: Grid<Pixel> = Array.init(this.height, () => Array.init(this.width, () => Pixel.ZERO))
        this.forEachPixel((y, x, color) => {
            result[y][x] = color
        })
        return result
    }

    get uniqueColors(): Array<Pixel> {
        return this.pixels.map(it => it.toRGBA).distinct().map(it => Pixel.fromRGBAString(it))
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

    forEachPixel(func: (y: number, x: number, pixel: Pixel) => void): ImageData {
        from(0).to(this.height).forEach(y => {
            from(0).to(this.width).forEach(x => {
                const index = 4 * (y * this.width + x)
                func(y, x, new Pixel({
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

    // region static {...}

    static fromPixels(pixels: Array<Pixel>, width?: number, height?: number): ImageData {
        const buffer = Buffer.alloc(pixels.length * 4)
        pixels.forEach((color: Pixel, index: number) => {
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

    static fromPixelsGrid(grid: Grid<Pixel>): ImageData {
        const height = grid.length
        const width = grid[0].length
        const buffer = Buffer.alloc(height * width * 4)
        grid.forEach((row, y) => {
            row.forEach((color, x) => {
                const index = (width * y) + x
                buffer[index * 4] = color.r
                buffer[index * 4 + 1] = color.g
                buffer[index * 4 + 2] = color.b
                buffer[index * 4 + 3] = color.a
            })
        })
        return new ImageData({
            data: buffer,
            width: width,
            height: height
        })
    }

    static fromIndexedImage(indexedImage: IndexedImage): ImageData {
        const flat: Array<number> = []
        indexedImage.grid.forEach(array => array.forEach(num => flat.push(num)))
        return ImageData.fromPixels(
            flat.map(number => number !== -1 ? indexedImage.palette[number] : new Pixel()),
            indexedImage.width, indexedImage.height
        )
    }

    // endregion static {...}
}

export class IndexedPixel extends Pixel {

    x: number
    y: number

    static NULL = new IndexedPixel({x: -1, y: -1, r: -1, g: -1, b: -1, a: -1})

    constructor({x, y, r, g, b, a}: { x: number, y: number, r: number, g: number, b: number, a?: number }) {
        super({r, g, b, a})
        this.x = x
        this.y = y
    }

    static fromPixel({x, y}: { x: number, y: number }, pixel: Pixel): IndexedPixel {
        return new IndexedPixel({
            x: x, y: y, r: pixel.r, g: pixel.g, b: pixel.b, a: pixel.a
        })
    }

    get point(): Point {
        return new Point({x: this.x, y: this.y})
    }

    copy(): Pixel {
        return new IndexedPixel(this)
    }
}

export type ID = number // cuz readability
export const NO_ID = -1

export class PathPixel extends IndexedPixel {

    static NULL = new PathPixel({pathId: NO_ID, x: -1, y: -1, r: -1, g: -1, b: -1, a: -1})
    pathId: ID = NO_ID

    constructor({pathId, x, y, r, g, b, a}: {
        pathId: number, x: number, y: number,
        r: number, g: number, b: number, a?: number
    }) {
        super({x, y, r, g, b, a})
        this.pathId = pathId
    }

    get hasPath(): boolean {
        return this.pathId !== NO_ID
    }

    get isNull(): boolean {
        return this === PathPixel.NULL
    }

    get isNotNull(): boolean {
        return this !== PathPixel.NULL
    }

    toString(): string {
        return JSON.stringify(this)
    }

    copy(): Pixel {
        return new PathPixel(this)
    }

    // region static {...}

    static fromPixel({pathId = NO_ID, x, y}: { pathId?: number, x: number, y: number }, pixel: Pixel): PathPixel {
        return new PathPixel({
            pathId: pathId, x: x, y: y, r: pixel.r, g: pixel.g, b: pixel.b, a: pixel.a
        })
    }

    static fromIndexedPixel(pathId: number, indexedPixel: IndexedPixel): PathPixel {
        return PathPixel.fromPixel({pathId: pathId, x: indexedPixel.x, y: indexedPixel.y}, indexedPixel)
    }

    // endregion static {...}
}

export class Path {

    static NULL = new Path({id: NO_ID, points: []})
    id: ID = NO_ID
    points: Array<PathPixel> = []
    formsPolygon: boolean = false

    constructor({id = NO_ID, points = []}: { id?: number, points?: Array<PathPixel> }) {
        this.id = id
        this.points = points
    }

    get isEmpty(): boolean {
        return this.points.isEmpty()
    }

    contains(pathColor: PathPixel): boolean {
        return this.points.contains(pathColor)
    }

    pointAt({x, y}: { x: number, y: number }): PathPixel | null {
        const result: PathPixel | undefined =
            this.points.find(pathColor => pathColor.x === x && pathColor.y === y)
        return result ? result : null
    }

    add(pathColor: PathPixel) {
        if (!this.contains(pathColor)) {
            this.points.push(pathColor)
            pathColor.pathId = this.id
        }
    }

    addAll(pathColors: Array<PathPixel>) {
        pathColors.forEach(pathColor => this.add(pathColor))
    }

    remove(pathColor: PathPixel) {
        if (this.contains(pathColor)) {
            this.points.remove(pathColor)
            pathColor.pathId = NO_ID
        }
    }

    removeAll(pathColors: Array<PathPixel> = this.points) {
        pathColors.forEach(pathColor => this.remove(pathColor))
    }
}

export class RegionPixel extends IndexedPixel {

    static NULL = new RegionPixel({regionId: NO_ID, x: -1, y: -1, r: -1, g: -1, b: -1, a: -1})
    regionId: ID = NO_ID

    constructor({regionId, x, y, r, g, b, a}: {
        regionId: number, x: number, y: number,
        r: number, g: number, b: number, a?: number
    }) {
        super({x, y, r, g, b, a})
        this.regionId = regionId
    }

    get hasRegion(): boolean {
        return this.regionId !== NO_ID
    }

    get isNull(): boolean {
        return this === RegionPixel.NULL
    }

    get isNotNull(): boolean {
        return this !== RegionPixel.NULL
    }

    toString(): string {
        return JSON.stringify(this)
    }

    copy(): Pixel {
        return new RegionPixel(this)
    }

    // region static {...}

    static fromPixel({regionId = NO_ID, x, y}: { regionId?: number, x: number, y: number }, pixel: Pixel): RegionPixel {
        return new RegionPixel({
            regionId: regionId, x: x, y: y, r: pixel.r, g: pixel.g, b: pixel.b, a: pixel.a
        })
    }

    static fromIndexedPixel(regionId: number, indexedPixel: IndexedPixel): RegionPixel {
        return RegionPixel.fromPixel({regionId: regionId, x: indexedPixel.x, y: indexedPixel.y}, indexedPixel)
    }

    // endregion static {...}
}

export class ColorRegion {

    static NULL = new ColorRegion({id: NO_ID, points: []})
    id: ID = NO_ID
    pixels: Array<RegionPixel> = []
    averageColor: Pixel = new Pixel()

    constructor({id = NO_ID, points = []}: { id?: number, points?: Array<RegionPixel> }) {
        this.id = id
        this.addAll(points)
    }

    get isEmpty(): boolean {
        return this.pixels.isEmpty()
    }

    get totalPixels(): number {
        return this.pixels.length
    }

    contains(regionPixel: RegionPixel): boolean {
        return this.pixels.contains(regionPixel)
    }

    pointAt({x, y}: { x: number, y: number }): RegionPixel | null {
        const result: RegionPixel | undefined =
            this.pixels.find(pathColor => pathColor.x === x && pathColor.y === y)
        return result ? result : null
    }

    add(regionPixel: RegionPixel, recalculate: boolean = true) {
        if (!this.contains(regionPixel)) {
            this.pixels.push(regionPixel)
            regionPixel.regionId = this.id
        }
        if (recalculate) this.calculateAndSetAverageColor()
    }

    addAll(regionPixels: Array<RegionPixel>) {
        regionPixels.forEach(pixel => this.add(pixel, false))
        this.calculateAndSetAverageColor()
    }

    takeAllColorsFrom(other: ColorRegion) {
        this.addAll(other.pixels)
        other.removeAll()
    }

    remove(pathColor: RegionPixel, recalculate: boolean = true) {
        if (this.contains(pathColor)) {
            this.pixels.remove(pathColor)
            pathColor.regionId = NO_ID
        }
        if (recalculate) this.calculateAndSetAverageColor()
    }

    removeAll(regionPixels: Array<RegionPixel> = this.pixels) {
        regionPixels.forEach(pixel => this.remove(pixel, false))
        this.calculateAndSetAverageColor()
    }

    calculateAndSetAverageColor(): ColorRegion {
        if (this.pixels.length !== 0) {
            const total = this.pixels.length
            let r: number = 0
            let g: number = 0
            let b: number = 0
            let a: number = 0
            this.pixels.forEach(pixel => {
                r += pixel.r
                g += pixel.g
                b += pixel.b
                a += pixel.a
            })
            this.averageColor.data = {
                r: (r / total).floor(),
                g: (g / total).floor(),
                b: (b / total).floor(),
                a: (a / total).floor(),
            }
        }
        return this
    }

    copy(): ColorRegion {
        return new ColorRegion(this)
    }
}

export function matToColorGrid(mat: Mat): Grid<Pixel> {
    const height: number = mat.rows
    const width: number = mat.cols
    const result: Grid<Pixel> = Array.init(height, () => Array.init(width, () => new Pixel()))
    let converted: Mat
    if (mat.channels === 1) {
        converted = mat.cvtColor(COLOR_GRAY2RGB).convertTo(CV_8UC3)
    } else if (mat.channels === 3) {
        converted = mat.convertTo(CV_8UC3)
    } else if (mat.channels === 4) {
        converted = mat.cvtColor(COLOR_BGRA2RGB).convertTo(CV_8UC3)
    } else throw Error(`None of the conversions worked on mat:\n${json(mat)}`)
    const data = converted.getDataAsArray() as unknown as number [][][]
    data.forEach((column, y) => {
        column.forEach((value, x) => {
            result[y][x] = new Pixel({r: value[0], g: value[1], b: value[2]})
        })
    })
    assert(result.length === height && result[0].length === width,
        `Converted Grid has incorrect dimensions! Expecting ${width}x${height},` +
        ` found ${result[0].length}x${result.length}`, arguments, matToColorGrid)
    return result
}

export function matDataTo2DArray(mat: Mat): number[][] {
    assert(mat.channels === 1, `Mat has more than 1 channel`, arguments, matDataTo2DArray)
    const height: number = mat.rows
    const width: number = mat.cols
    const flatArray = new Uint8Array(mat.getData())

    const result: number[][] = []
    for (let y = 0; y < height; y++) {
        result.push([])
        for (let x = 0; x < width; x++) {
            result[y].push(flatArray[(width * y) + x])
        }
    }
    assert(result.length === height && result[0].length === width,
        `Converted Array has incorrect dimensions! Expecting ${width}x${height},` +
        ` found ${result[0].length}x${result.length}`, arguments, matDataTo2DArray)
    return result
}