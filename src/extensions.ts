declare global {
    interface Array<T> {
        contains(element: T): boolean

        notContains(element: T): boolean

        lastIndex(): number

        remove(element: T)

        isEmpty(): boolean
    }

    interface Object {
        in(array: Array<any>): boolean

        notIn(array: Array<any>): boolean

        toJson(space: number): string

        properties(): Array<{ key: string, value: any, type: any }>
    }
}
export default function () {
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
                return {key: key, value: this[key], type: typeof this[key]}
            })
        }
}