import {abs, ceil, floor, pow, round, sqrt} from "./Utils";
import {comma} from "number-magic";

declare global {
    interface Array<T> {
        contains(element: T): boolean

        notContains(element: T): boolean

        lastIndex(): number

        remove(element: T): void

        isEmpty(): boolean

        pushAll(items: Iterable<T>): Array<T>
    }

    interface ArrayConstructor {
        init<T>(length: number, initializer: ((index: number) => T)): Array<T>
    }

    interface Object {
        in(array: Array<any>): boolean

        notIn(array: Array<any>): boolean

        toJson(space: number): string

        properties(): Array<{ key: string, value: any, type: any }>

        also(block: (it: this) => any): Object
    }

    interface Number {
        abs(): number

        floor(): number

        ceil(): number

        sqrt(): number

        round(): number

        pow(exponent: number): number

        roundToDec(places?: number): number

        comma(): string
    }
}

function _array() {
    if (!Array.prototype.contains)
        Array.prototype.contains = function <T>(this: Array<T>, element: T): boolean {
            return this.indexOf(element) >= 0
        }

    if (!Array.prototype.notContains)
        Array.prototype.notContains = function <T>(this: Array<T>, element: T): boolean {
            return !this.contains(element)
        }

    if (!Array.prototype.lastIndex)
        Array.prototype.lastIndex = function (this: Array<any>): number {
            return this.length - 1
        }

    if (!Array.prototype.remove)
        Array.prototype.remove = function <T>(this: Array<T>, element: T) {
            const index = this.indexOf(element)
            if (index >= 0) this.splice(index)
        }

    if (!Array.prototype.isEmpty)
        Array.prototype.isEmpty = function (this: Array<any>) {
            return this.length === 0
        }

    if (!Array.prototype.pushAll)
        Array.prototype.pushAll = function <T>(this: Array<T>, items: Iterable<T>): Array<T> {
            for (let item of items) this.push(item)
            return this
        }

    if (!Array.init)
        Array.init = function <T>(length: number, initializer: (index: number) => T): Array<T> {
            return Array.from({length: length}, (_, i) => initializer(i))
        }
}

function _object() {
    if (!Object.prototype.in)
        Object.prototype.in = function (this: Object, array: Array<any>): boolean {
            return array.contains(this)
        }

    if (!Object.prototype.notIn)
        Object.prototype.notIn = function (this: Object, array: Array<any>): boolean {
            return array.notContains(this)
        }

    if (!Object.prototype.toJson)
        Object.prototype.toJson = function (this: Object, space: number = 0): string {
            return JSON.stringify(this, null, space)
        }

    if (!Object.prototype.properties)
        Object.prototype.properties = function (this: Object): Array<{ key: string, value: any, type: any }> {
            return Object.keys(this).map((key, index) => {
                // @ts-ignore
                return {key: key, value: this[key], type: typeof this[key]}
            })
        }

    if (!Object.prototype.also)
        Object.prototype.also = function (this: Object, block: (it: Object) => void): Object {
            block(this)
            return this
        }
}

function _number() {
    if (!Number.prototype.abs)
        Number.prototype.abs = function (this: number): number {
            return abs(this)
        }

    if (!Number.prototype.floor)
        Number.prototype.floor = function (this: number): number {
            return floor(this)
        }

    if (!Number.prototype.ceil)
        Number.prototype.ceil = function (this: number): number {
            return ceil(this)
        }

    if (!Number.prototype.sqrt)
        Number.prototype.sqrt = function (this: number): number {
            return sqrt(this)
        }

    if (!Number.prototype.round)
        Number.prototype.round = function (this: number): number {
            return round(this)
        }

    if (!Number.prototype.pow)
        Number.prototype.pow = function (this: number, exponent: number): number {
            return pow(this, exponent)
        }

    if (!Number.prototype.roundToDec)
        Number.prototype.roundToDec = function (this: number, places: number = 0): number {
            return +this.toFixed(places)
        }

    if (!Number.prototype.comma)
        Number.prototype.comma = function (this: number): string {
            return comma(this)
        }
}

export default function () {
    _array()
    _object()
    _number()
}