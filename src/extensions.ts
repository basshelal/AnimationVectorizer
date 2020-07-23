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
}