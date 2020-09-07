import {abs, ceil, floor, pow, round, sqrt} from "./Utils"
import {comma} from "number-magic"
import {assert} from "./Log"

declare global {
    interface Array<T> {
        contains(element: T): boolean

        notContains(element: T): boolean

        lastIndex(): number

        last(): T | undefined

        first(): T | undefined

        remove(element: T): void

        removeAll(items: Iterable<T>): Array<T>

        isEmpty(): boolean

        isNotEmpty(): boolean

        pushAll(items: Iterable<T>): Array<T>

        flatten<R>(): Array<R>

        distinct(): Array<T>

        countMap(): Map<T, number>

        plus(element: T): Array<T>

        onEach(callback: (value: T, index: number, array: T[]) => void, thisArg?: any): Array<T>

        sorted(): Array<number>

        copy(): Array<T>

        shiftRight(fromIndex: number, byAmount: number): Array<T>

        addAt(index: number, element: T): Array<T>
    }

    interface ArrayConstructor {
        init<T>(length: number, initializer: ((index: number) => T)): Array<T>
    }

    interface Map<K, V> {
        entriesArray(): Array<{ k: K, v: V }>

        keysArray(): Array<K>

        valuesArray(): Array<V>
    }

    interface Set<T> {
        valuesArray(): Array<T>

        addAll(values: Iterable<T>): Set<T>
    }

    interface Object {

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

function objExtension(object: any, extensionName: string, extension: Function) {
    if (!object[extensionName]) object[extensionName] = extension
}

function protoExtension(object: any, extensionName: string, extension: Function) {
    if (object.prototype) objExtension(object.prototype, extensionName, extension)
}

function _array() {
    protoExtension(Array, "contains",
        function <T>(this: Array<T>, element: T): boolean {
            return this.indexOf(element) >= 0
        })
    protoExtension(Array, "notContains",
        function <T>(this: Array<T>, element: T): boolean {
            return !this.contains(element)
        })
    protoExtension(Array, "lastIndex",
        function (this: Array<any>): number {
            return this.length - 1
        })
    protoExtension(Array, "last",
        function <T>(this: Array<T>): T | undefined {
            return this[this.length - 1]
        })
    protoExtension(Array, "first",
        function <T>(this: Array<T>): T | undefined {
            return this[0]
        })
    protoExtension(Array, "remove",
        function <T>(this: Array<T>, element: T) {
            const index = this.indexOf(element)
            if (index >= 0) this.splice(index)
        })
    protoExtension(Array, "removeAll", function <T>(this: Array<T>, items: Iterable<T>): Array<T> {
        for (let item of items) this.remove(item)
        return this
    })
    protoExtension(Array, "isEmpty",
        function (this: Array<any>) {
            return this.length === 0
        })
    protoExtension(Array,
        "isNotEmpty", function (this: Array<any>) {
            return this.length !== 0
        })
    protoExtension(Array, "pushAll",
        function <T>(this: Array<T>, items: Iterable<T>): Array<T> {
            for (let item of items) this.push(item)
            return this
        })
    objExtension(Array, "init",
        function <T>(length: number, initializer: (index: number) => T): Array<T> {
            return Array.from({length: length}, (_, i) => initializer(i))
        })
    protoExtension(Array, "flatten", function <R>(this: Array<any>): Array<R> {
        const result: Array<R> = []
        this.forEach(it => {
            if (it instanceof Array) it.flatten<R>().forEach(i => result.push(i))
            else result.push(it)
        })
        return result
    })
    protoExtension(Array, "distinct", function <T>(this: Array<T>): Array<T> {
        const result: Array<T> = []
        const set = new Set<T>(this)
        for (let entry of set) result.push(entry)
        return result
    })
    protoExtension(Array, "countMap", function <T>(this: Array<T>): Map<T, number> {
        const result: Map<T, number> = new Map<T, number>()
        this.forEach(element => {
            const found: number | undefined = result.get(element)
            if (found === undefined) result.set(element, 1)
            else result.set(element, found + 1)
        })
        return result
    })
    protoExtension(Array, "plus", function <T>(this: Array<T>, element: T): Array<T> {
        this.push(element)
        return this
    })
    protoExtension(Array, "onEach", function <T>(this: Array<T>, callback: (value: T, index: number) => void): Array<T> {
        this.forEach(callback)
        return this
    })
    protoExtension(Array, "sorted", function (this: Array<number>): Array<number> {
        if (this.isNotEmpty() && typeof this[0] === "number")
            return this.sort((a, b) => a - b)
        else return this
    })
    protoExtension(Array, "copy", function <T>(this: Array<T>): Array<T> {
        return Array.from(this)
    })
    protoExtension(Array, "shiftRight", function <T>(this: Array<T>, index: number, amount: number = 1): Array<T> {
        // TODO check this properly
        assert(index <= this.lastIndex() && index >= 0,
            `Index to move must be within inclusive bounds 0 - ${this.lastIndex()}, passed in ${index}`,
            arguments, this.shiftRight)
        const toMove: Array<T> = this.slice(index, this.length)
        for (let i = index + amount, toMoveIndex = 0;
             i < this.length + amount; i++, toMoveIndex++) {
            this[i] = toMove[toMoveIndex]
        }
        return this
    })
    protoExtension(Array, "addAt", function <T>(this: Array<T>, index: number, element: T): Array<T> {
        this.shiftRight(index, 1)
        this[index] = element
        return this
    })
}

function _map() {
    protoExtension(Map, "entriesArray",
        function <K, V>(this: Map<K, V>): Array<{ k: K, v: V }> {
            const result: Array<{ k: K, v: V }> = []
            for (let entry of this.entries()) result.push({k: entry[0], v: entry[1]})
            return result
        })
    protoExtension(Map, "keysArray",
        function <K>(this: Map<K, any>): Array<K> {
            const result: Array<K> = []
            for (let key of this.keys()) result.push(key)
            return result
        })
    protoExtension(Map, "valuesArray",
        function <V>(this: Map<any, V>): Array<V> {
            const result: Array<V> = []
            for (let value of this.values()) result.push(value)
            return result
        })
}

function _set() {
    protoExtension(Set, "valuesArray", function <T>(this: Set<T>): Array<T> {
        const result: Array<T> = []
        for (let value of this.values()) result.push(value)
        return result
    })
    protoExtension(Set, "addAll", function <T>(this: Set<T>, values: Iterable<T>): Set<T> {
        for (let value of values) this.add(value)
        return this
    })
}

function _object() {
    protoExtension(Object, "toJson",
        function (this: Object, space: number = 0): string {
            return JSON.stringify(this, null, space)
        })
    protoExtension(Object, "properties",
        function (this: Object): Array<{ key: string, value: any, type: any }> {
            if (this)
                return Object.keys(this).map((key, index) => {
                    // @ts-ignore
                    return {key: key, value: this[key], type: typeof this[key]}
                })
            else return []
        })
    protoExtension(Object, "also",
        function (this: Object, block: (it: Object) => void): Object {
            if (this) block(this)
            return this
        })
}

function _number() {
    protoExtension(Number, "abs",
        function (this: number): number {
            return abs(this)
        })
    protoExtension(Number, "floor",
        function (this: number): number {
            return floor(this)
        })
    protoExtension(Number, "ceil",
        function (this: number): number {
            return ceil(this)
        })
    protoExtension(Number, "sqrt",
        function (this: number): number {
            return sqrt(this)
        })
    protoExtension(Number, "round",
        function (this: number): number {
            return round(this)
        })
    protoExtension(Number, "pow",
        function (this: number, exponent: number): number {
            return pow(this, exponent)
        })
    protoExtension(Number, "roundToDec",
        function (this: number, places: number = 0): number {
            return +this.toFixed(places)
        })
    protoExtension(Number, "comma",
        function (this: number): string {
            return comma(this)
        })
}

export default function () {
    _array()
    _map()
    _set()
    _object()
    _number()
}