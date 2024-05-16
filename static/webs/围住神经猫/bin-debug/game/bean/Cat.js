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
var CatStatus;
(function (CatStatus) {
    CatStatus[CatStatus["AVAILABLE"] = 0] = "AVAILABLE";
    CatStatus[CatStatus["UNAVAILABLE"] = 1] = "UNAVAILABLE"; // 无路可走
})(CatStatus || (CatStatus = {}));
var RunPath = /** @class */ (function (_super) {
    __extends(RunPath, _super);
    function RunPath() {
        var _this = _super !== null && _super.apply(this, arguments) || this;
        _this.step = 0;
        return _this;
    }
    RunPath.prototype.copy = function () {
        var n = new RunPath(this.x, this.y);
        n.step = this.step;
        n.firstStep = this.firstStep.copy();
        return n;
    };
    return RunPath;
}(Point));
var SearchResult = /** @class */ (function () {
    function SearchResult() {
        this.hasPath = true; // 是否可以走出去
    }
    return SearchResult;
}());
/**
 * 猫
 */
var Cat = /** @class */ (function (_super) {
    __extends(Cat, _super);
    function Cat(playListener) {
        var _this = _super.call(this) || this;
        _this.catMovieClip = {
            normal: GameUtil.createMovieClipByName('cat_normal'),
            loser: GameUtil.createMovieClipByName('cat_loser')
        };
        _this.playListener = playListener;
        _this.addEventListener(egret.Event.ADDED_TO_STAGE, _this.onAddToStage, _this);
        return _this;
    }
    Cat.prototype.onAddToStage = function (event) {
        this.init();
    };
    Cat.prototype.init = function () {
        this.bg = new egret.MovieClip();
        this.addChild(this.bg);
        this.setStatus(CatStatus.AVAILABLE);
    };
    Cat.prototype.setStatus = function (status) {
        if (this.status === status) {
            return;
        }
        this.status = status;
        this.changeBg();
    };
    Cat.prototype.getStatus = function () {
        return this.status;
    };
    Cat.prototype.getIndex = function () {
        return this.index;
    };
    Cat.prototype.changeBg = function () {
        switch (this.status) {
            case CatStatus.AVAILABLE:
                this.bg.movieClipData = this.catMovieClip.normal.movieClipData;
                this.bg.play(-1);
                break;
            case CatStatus.UNAVAILABLE:
                this.bg.movieClipData = this.catMovieClip.loser.movieClipData;
                this.bg.play(-1);
                break;
        }
    };
    Cat.prototype.move = function (nextStep) {
        if (nextStep === void 0) { nextStep = this.index; }
        if (!nextStep.equal(this.index)) {
            if (this.gridNode) {
                this.gridNode.setStatus(GridNodeStatus.AVAILABLE);
            }
            this.gridNode = n.GameData.gridNodeList[nextStep.x][nextStep.y];
            this.gridNode.setStatus(GridNodeStatus.CAT);
            this.index = nextStep;
            this.x = this.gridNode.x + (this.gridNode.width - this.bg.width) / 2;
            this.y = this.gridNode.y - this.bg.height + this.gridNode.height / 2;
        }
    };
    Cat.prototype.run = function () {
        this.playListener && this.playListener.catRun(this.search());
    };
    Cat.prototype.search = function () {
        // 记录每个格子走到的最小步数
        var temp = new Array(n.GameData.row);
        // 初始化每个格子的步数记录为最大数值
        for (var i = 0; i < n.GameData.row; ++i) {
            temp[i] = new Array(n.GameData.col);
            for (var j = 0; j < n.GameData.col; ++j) {
                temp[i][j] = Number.MAX_VALUE;
            }
        }
        // 获取第一步可走的位置
        var firstStepList = this.getFirstStep();
        var list = new Array();
        // 存放到路径列表中
        firstStepList.forEach(function (item) {
            temp[item.x][item.y] = 1;
            list.push(item.copy());
        });
        // 记录最少步数，初始化为最大数值
        var minStep = Number.MAX_VALUE;
        // 存放路径集合
        var result = new Array();
        while (list.length) {
            var current = list.shift();
            // 猫到达边界
            if (current.x === 0 || current.y === 0 || current.x === n.GameData.row - 1 || current.y === n.GameData.col - 1) {
                if (current.step < minStep) { // 如果当前步数少于最少步数，那么把之前记录的路径集合清掉，保存当前记录
                    result = new Array();
                    result.push(current.firstStep.copy());
                    minStep = current.step;
                }
                else if (current.step === minStep) { // 如果相等，那么添加进路径集合
                    result.push(current.firstStep.copy());
                }
                continue;
            }
            // 获取当前位置的可走方向（因为单双行缩进不一样导致数组下标不一样，所以需要根据行数获取可走方向）
            var dir = this.getDir(current.x);
            for (var i = 0; i < dir.length; ++i) {
                var t = new RunPath(current.x, current.y);
                t.x += dir[i][0];
                t.y += dir[i][1];
                t.step = current.step + 1;
                // 越界
                if (t.x < 0 || t.y < 0 || t.x === n.GameData.row || t.y === n.GameData.col) {
                    continue;
                }
                // 有猫或有障碍物
                if (n.GameData.gridNodeList[t.x][t.y].getStatus() !== GridNodeStatus.AVAILABLE) {
                    continue;
                }
                if (temp[t.x][t.y] > t.step) {
                    temp[t.x][t.y] = t.step;
                    t.firstStep = current.firstStep.copy();
                    list.push(t);
                }
            }
        }
        var nextResult = new SearchResult();
        if (minStep === Number.MAX_VALUE) {
            // 无路可走，切换状态
            this.setStatus(CatStatus.UNAVAILABLE);
            nextResult.hasPath = false;
        }
        if (result.length === 0) {
            // 没有路可以走出去，那就向四周随机走一格
            firstStepList.forEach(function (item) {
                result.push(item.firstStep);
            });
        }
        if (result.length > 0) {
            var list_1 = this.sortList(result);
            // 从所有结果中随机选一格，避免出现走固定路线
            var index = Math.floor(Math.random() * list_1.length);
            nextResult.nextStep = list_1[index];
        }
        else {
            // 没有路可走，那就走当前坐标（外部判断为当前坐标就知道猫走不了输了）
            nextResult.nextStep = this.index;
        }
        return nextResult;
    };
    // 排序找出可走路径最多的格子
    Cat.prototype.sortList = function (list) {
        var sort = new Array();
        list.forEach(function (item) {
            // key就是下一步要走的坐标
            var key = item.x + '-' + item.y;
            var index = -1;
            for (var i = 0; i < sort.length; ++i) {
                if (sort[i].key === key) {
                    index = i;
                    break;
                }
            }
            if (index > -1) {
                // 计数
                sort[index].count++;
            }
            else {
                sort.push({
                    key: key,
                    value: item,
                    count: 1
                });
            }
        });
        // 从多到少排序，数量多的就是走这一步之后有更多的路径方向可以走
        sort.sort(function (a, b) {
            return b.count - a.count;
        });
        var result = new Array();
        sort.forEach(function (item) {
            if (item.count === sort[0].count) {
                result.push(new Point(item.value.x, item.value.y));
            }
        });
        return result;
    };
    Cat.prototype.getFirstStep = function () {
        var firstStepList = new Array();
        var dir = this.getDir(this.index.x);
        for (var i = 0; i < dir.length; ++i) {
            var x = this.index.x + dir[i][0];
            var y = this.index.y + dir[i][1];
            // 越界
            if (x < 0 || y < 0 || x >= n.GameData.row || y >= n.GameData.col) {
                continue;
            }
            // 不可走
            if (n.GameData.gridNodeList[x][y].getStatus() !== GridNodeStatus.AVAILABLE) {
                continue;
            }
            var runPath = new RunPath(x, y);
            runPath.step = 1;
            runPath.firstStep = new Point(x, y);
            firstStepList.push(runPath);
        }
        return firstStepList;
    };
    Cat.prototype.getDir = function (col) {
        var t = col % 2;
        var dir = [
            [0, -1], // left
            [0, 1], // right
            [-1, t - 1], // top-left
            [-1, t * 1], // top-right
            [1, t - 1], // bottom-left
            [1, t * 1], // bottom-right
        ];
        return dir;
    };
    return Cat;
}(egret.Sprite));
