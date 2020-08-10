// Octree Color Quantization from this excellent article https://observablehq.com/@tmcw/octree-color-quantization

import {Color, Grid, Palette} from "./Types";

const MAX_DEPTH = 8

export class ColorQuantizer {
    levels: Grid<Node>
    root: Node

    constructor(colors?: Array<Color>) {
        this.levels = Array.from({length: MAX_DEPTH}, () => [])
        this.root = new Node(0, this)
        if (colors) colors.forEach(c => this.addColor(c))
    }

    get leafNodes(): Array<Node> {
        return this.root.leafNodes
    }

    addColor(color: Color) {
        this.root.addColor(color, 0, this)
    }

    makePalette(colorCount: number): Palette {
        let leafCount: number = this.leafNodes.length
        for (let level = MAX_DEPTH - 1; level > -1; level--) {
            if (this.levels[level]) {
                for (let node of this.levels[level]) {
                    leafCount -= node.removeLeaves()
                    if (leafCount <= colorCount) break
                }
                if (leafCount <= colorCount) break
                this.levels[level] = []
            }
        }
        let palette: Palette = []
        let paletteIndex = 0
        for (let node of this.leafNodes) {
            if (paletteIndex >= colorCount) break
            if (node.isLeaf) palette.push(node.color)
            node.paletteIndex = paletteIndex
            paletteIndex++
        }
        for (let color of palette) color.round()
        return palette
    }

    addLevelNode(level: number, node: Node) {
        this.levels[level].push(node)
    }

    getPaletteIndex(color: Color): number {
        return this.root.getPaletteIndex(color, 0)
    }
}

export class Node {
    pixelCount: number
    paletteIndex: number
    children: Array<Node>

    constructor(level: number, parent: ColorQuantizer) {
        this._color = new Color({r: 0, g: 0, b: 0})
        this.pixelCount = 0
        this.paletteIndex = 0
        this.children = []
        if (level < MAX_DEPTH - 1) parent.addLevelNode(level, this)
    }

    _color: Color

    get color(): Color {
        return this._color.normalized(this.pixelCount)
    }

    get isLeaf(): boolean {
        return this.pixelCount > 0;
    }

    get leafNodes(): Array<Node> {
        let leafNodes = []
        for (let node of this.children) {
            if (!node) continue
            if (node.isLeaf) {
                leafNodes.push(node)
            } else {
                leafNodes.push(...node.leafNodes)
            }
        }
        return leafNodes
    }

    addColor(color: Color, level: number, parent: ColorQuantizer) {
        if (level >= MAX_DEPTH) {
            this._color.add(color)
            this.pixelCount++
            return
        }
        const index = getColorIndex(color, level)
        if (!this.children[index]) {
            this.children[index] = new Node(level, parent)
        }
        this.children[index].addColor(color, level + 1, parent)
    }

    getPaletteIndex(color: Color, level: number): number {
        if (this.isLeaf) {
            return this.paletteIndex
        }
        let index = getColorIndex(color, level)
        if (this.children[index]) {
            return this.children[index].getPaletteIndex(color, level + 1)
        } else {
            return this.children[0].getPaletteIndex(color, level + 1)
        }
    }

    removeLeaves(): number {
        let result = 0
        for (let node of this.children) {
            if (!node) continue
            this._color.add(node._color)
            this.pixelCount += node.pixelCount
            result++
        }
        this.children = []
        return result - 1
    }
}

// level is from 0 to 7 inclusive for 8 max levels
function getColorIndex(color: Color, level: number): number {
    let index = 0
    // 128 right shifted by level digits
    const mask: number = 0b10000000 >> level
    if ((color.r & mask) !== 0) index |= 0b1000
    if ((color.g & mask) !== 0) index |= 0b0100
    if ((color.b & mask) !== 0) index |= 0b0010
    return index
}