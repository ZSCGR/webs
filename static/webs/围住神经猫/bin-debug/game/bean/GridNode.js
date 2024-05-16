var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
var GridNodeStatus;
(function (GridNodeStatus) {
    GridNodeStatus[GridNodeStatus["AVAILABLE"] = 0] = "AVAILABLE";
    GridNodeStatus[GridNodeStatus["UNAVAILABLE"] = 1] = "UNAVAILABLE";
    GridNodeStatus[GridNodeStatus["CAT"] = 2] = "CAT"; // 有猫，不可以走
})(GridNodeStatus || (GridNodeStatus = {}));
/**
 * 格子节点
 */
var GridNode = /** @class */ (function (_super) {
    __extends(GridNode, _super);
    function GridNode(index, pos, size, playListener) {
        var _this = _super.call(this) || this;
        _this.gridBg = {
            white: GameUtil.createBitmapByName('grid_white'),
            yellow: GameUtil.createBitmapByName('grid_yellow')
        };
        /**
         * 格子的背景
         */
        _this.bg = new egret.Bitmap();
        _this.index = index;
        _this.size = size;
        _this.bg.width = size;
        _this.bg.height = size;
        _this.pos = pos;
        _this.playListener = playListener;
        _this.addEventListener(egret.Event.ADDED_TO_STAGE, _this.onAddToStage, _this);
        return _this;
    }
    GridNode.prototype.onAddToStage = function (event) {
        this.init();
    };
    GridNode.prototype.init = function () {
        this.touchEnabled = true;
        this.addEventListener(egret.TouchEvent.TOUCH_TAP, this.touch, this);
        this.addChild(this.bg);
        this.x = this.pos.x;
        this.y = this.pos.y;
    };
    GridNode.prototype.setStatus = function (status) {
        this.status = status;
        this.changeBg();
    };
    GridNode.prototype.getStatus = function () {
        return this.status;
    };
    GridNode.prototype.touch = function () {
        // 没有监听事件
        if (!this.playListener) {
            return;
        }
        // 猫还在思考中，还不能点击
        if (!this.playListener.canRun()) {
            return;
        }
        // 该格子不能点击
        if (this.status !== GridNodeStatus.AVAILABLE) {
            return;
        }
        this.setStatus(GridNodeStatus.UNAVAILABLE);
        this.playListener.playerRun(this.index);
    };
    GridNode.prototype.changeBg = function () {
        switch (this.status) {
            case GridNodeStatus.AVAILABLE: // 空格子，可以走，白色背景
                this.bg.texture = this.gridBg.white.texture;
                break;
            case GridNodeStatus.UNAVAILABLE: // 有障碍物，不可以走，黄色背景
                this.bg.texture = this.gridBg.yellow.texture;
                break;
            case GridNodeStatus.CAT: // 有猫，不可以走，白色背景
                this.bg.texture = this.gridBg.white.texture;
                break;
        }
    };
    return GridNode;
}(egret.Sprite));
