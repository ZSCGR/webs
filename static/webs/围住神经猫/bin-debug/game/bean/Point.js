var Point = /** @class */ (function () {
    function Point(x, y) {
        this.x = 0;
        this.y = 0;
        this.x = x;
        this.y = y;
    }
    /**
     * 判断两个点是否相等
     */
    Point.prototype.equal = function (point) {
        return point && point.x === this.x && point.y === this.y;
    };
    Point.prototype.copy = function () {
        return new Point(this.x, this.y);
    };
    return Point;
}());
