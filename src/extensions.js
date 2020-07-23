"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function default_1() {
    if (!Array.prototype.contains)
        Array.prototype.contains = function (element) {
            return this.indexOf(element) >= 0;
        };
    if (!Array.prototype.notContains)
        Array.prototype.notContains = function (element) {
            return !this.contains(element);
        };
    if (!Array.prototype.lastIndex)
        Array.prototype.lastIndex = function () {
            return this.length - 1;
        };
    if (!Array.prototype.remove)
        Array.prototype.remove = function (element) {
            var index = this.indexOf(element);
            if (index >= 0)
                this.splice(index);
        };
    if (!Array.prototype.isEmpty)
        Array.prototype.isEmpty = function () {
            return this.length === 0;
        };
    if (!Object.prototype.in)
        Object.prototype.in = function (array) {
            return array.contains(this);
        };
    if (!Object.prototype.notIn)
        Object.prototype.notIn = function (array) {
            return array.notContains(this);
        };
}
exports.default = default_1;
