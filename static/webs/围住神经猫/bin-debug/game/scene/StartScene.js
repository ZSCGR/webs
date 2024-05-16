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
var StartScene = /** @class */ (function (_super) {
    __extends(StartScene, _super);
    function StartScene() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    StartScene.prototype.initView = function () {
        var cat = GameUtil.createBitmapByName('cat_start_bg');
        this.addChild(cat);
        cat.x = (GameUtil.getStageWidth() - cat.width) / 2;
        cat.y = (GameUtil.getStageHeight() - cat.height) / 2 + 100;
        var startBtn = GameUtil.createBitmapByName('btn_start');
        this.addChild(startBtn);
        startBtn.x = (GameUtil.getStageWidth() - startBtn.width) / 2;
        startBtn.y = cat.y + cat.height;
        GameUtil.bitmapToBtn(startBtn, function () {
            console.log('开始游戏');
            n.GameData.level = 0;
            SceneController.showPlayScene();
        });
    };
    return StartScene;
}(BaseScene));
