import {abs, ceil, floor, pow, round, sqrt} from "./Utils";
import {comma} from "number-magic";

declare global {
    interface Array<T> {
        contains(element: T): boolean

        notContains(element: T): boolean

        lastIndex(): number

        last(): T

        remove(element: T): void

        isEmpty(): boolean

        isNotEmpty(): boolean

        pushAll(items: Iterable<T>): Array<T>

        flatten<R>(): Array<R>

        distinct(): Array<T>
    }

    interface ArrayConstructor {
        init<T>(length: number, initializer: ((index: number) => T)): Array<T>
    }

    interface Map<K, V> {
        entriesArray(): Array<{ k: K, v: V }>

        keysArray(): Array<K>

        valuesArray(): Array<V>
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
        function <T>(this: Array<T>): T {
            return this[this.length - 1]
        })
    protoExtension(Array, "remove",
        function <T>(this: Array<T>, element: T) {
            const index = this.indexOf(element)
            if (index >= 0) this.splice(index)
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
    _object()
    _number()
}