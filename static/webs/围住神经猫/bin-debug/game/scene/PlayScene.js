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
var OverType;
(function (OverType) {
    OverType[OverType["NULL"] = -1] = "NULL";
    OverType[OverType["PLAYER"] = 0] = "PLAYER";
    OverType[OverType["CAT"] = 1] = "CAT"; // 猫赢
})(OverType || (OverType = {}));
var PlayScene = /** @class */ (function (_super) {
    __extends(PlayScene, _super);
    function PlayScene() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    PlayScene.prototype.initView = function () {
        this.sound = RES.getRes('go_mp3');
        this.catRunning = false;
        this.createGridNode();
        this.createBarrier(n.GameData.barrierNumber);
        this.createCat();
        this.x = (GameUtil.getStageWidth() - this.width) / 2;
        this.y = GameUtil.getStageHeight() / 2.5;
        SceneController.showLevelTip();
    };
    PlayScene.prototype.createGridNode = function () {
        n.GameData.gridNodeList = new Array(n.GameData.row);
        // 根据屏幕宽度和定义的列数和格子边距计算格子的代销
        var gridNodeSize = GameUtil.getStageWidth() / (n.GameData.row + 1) - n.GameData.gridMargin;
        for (var i = 0; i < n.GameData.row; ++i) {
            n.GameData.gridNodeList[i] = new Array(n.GameData.col);
            var indent = (i % 2) * (gridNodeSize / 2); // 偶数行缩进
            for (var j = 0; j < n.GameData.col; ++j) {
                // i，j在数组中的下标，x，y为在舞台上的坐标
                var x = indent + j * (gridNodeSize + n.GameData.gridMargin);
                var y = i * gridNodeSize;
                n.GameData.gridNodeList[i][j] = new GridNode(new Point(i, j), new Point(x, y), gridNodeSize, this);
                // 都初始化为有效状态
                n.GameData.gridNodeList[i][j].setStatus(GridNodeStatus.AVAILABLE);
                // 添加到游戏场景中
                this.addChild(n.GameData.gridNodeList[i][j]);
            }
        }
    };
    PlayScene.prototype.createBarrier = function (num) {
        while (num) {
            var i = Math.floor(Math.random() * 100 % n.GameData.row);
            var j = Math.floor(Math.random() * 100 % n.GameData.col);
            var gridNode = n.GameData.gridNodeList[i][j];
            if (i !== Math.floor(n.GameData.row / 2) && j !== Math.floor(n.GameData.col / 2) && gridNode.getStatus() === GridNodeStatus.AVAILABLE) {
                gridNode.setStatus(GridNodeStatus.UNAVAILABLE);
                num--;
            }
        }
    };
    PlayScene.prototype.createCat = function () {
        var i = Math.floor(n.GameData.row / 2);
        var j = Math.floor(n.GameData.col / 2);
        this.cat = new Cat(this);
        this.addChild(this.cat);
        this.cat.move(new Point(i, j));
    };
    PlayScene.prototype.playerRun = function (index) {
        this.sound.play(0, 1);
        n.GameData.step++;
        this.catRunning = true;
        this.cat.run();
    };
    PlayScene.prototype.catRun = function (searchResult) {
        if (!searchResult.hasPath) {
            // 被包围了，切换状态
            this.cat.setStatus(CatStatus.UNAVAILABLE);
        }
        var nextStep = searchResult.nextStep;
        // 下一步和当前所在位置一样，说明无路可走，玩家赢
        if (nextStep.equal(this.cat.getIndex())) {
            this.gameOver(OverType.PLAYER);
            return;
        }
        this.cat.move(nextStep);
        // 猫到达边界，猫赢
        if (nextStep.x * nextStep.y === 0 || nextStep.x === n.GameData.row - 1 || nextStep.y === n.GameData.col - 1) {
            this.gameOver(OverType.CAT);
            return;
        }
        this.catRunning = false;
    };
    PlayScene.prototype.canRun = function () {
        return !this.catRunning;
    };
    PlayScene.prototype.gameOver = function (type) {
        n.GameData.overType = type;
        SceneController.showEndScene();
    };
    return PlayScene;
}(BaseScene));
