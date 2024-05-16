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
var EndScene = /** @class */ (function (_super) {
    __extends(EndScene, _super);
    function EndScene() {
        return _super !== null && _super.apply(this, arguments) || this;
    }
    EndScene.prototype.initView = function () {
        // 背景蒙层
        var shp = new egret.Shape();
        shp.graphics.beginFill(0x000000, 0.8);
        shp.graphics.drawRect(0, 0, GameUtil.getStageWidth(), GameUtil.getStageHeight());
        shp.graphics.endFill();
        shp.touchEnabled = true;
        this.addChild(shp);
        switch (n.GameData.overType) {
            case OverType.PLAYER:
                console.log('玩家赢');
                this.initPlayerWin();
                break;
            case OverType.CAT:
                console.log('猫赢');
                this.initCatWin();
                break;
        }
    };
    EndScene.prototype.initPlayerWin = function () {
        var bg = GameUtil.createBitmapByName('end_tip_success');
        this.addChild(bg);
        bg.x = (GameUtil.getStageWidth() - bg.width) / 2;
        bg.y = (GameUtil.getStageHeight() - bg.height) / 2;
        var info = new egret.TextField();
        info.bold = true;
        info.textColor = 0xffffff;
        info.strokeColor = 0x000000;
        info.stroke = 2;
        info.text = "\u60A8\u82B1\u4E86".concat(n.GameData.step, "\u6B65\u6293\u4F4F\u4E86\u795E\u7ECF\u732B");
        info.x = (bg.width - info.width) / 2 + bg.x;
        info.y = (bg.height - info.height) / 2 + bg.y + 50;
        this.addChild(info);
        var sound = RES.getRes('success_mp3');
        sound.play(0, 1);
        var nextBtn = GameUtil.createBitmapByName('btn_next');
        this.addChild(nextBtn);
        nextBtn.x = (GameUtil.getStageWidth() - nextBtn.width) / 2;
        nextBtn.y = bg.y + bg.height;
        GameUtil.bitmapToBtn(nextBtn, function () {
            console.log('下一关卡');
            n.GameData.level++;
            SceneController.showPlayScene();
        });
    };
    EndScene.prototype.initCatWin = function () {
        var bg = GameUtil.createBitmapByName('end_tip_fail');
        this.addChild(bg);
        bg.x = (GameUtil.getStageWidth() - bg.width) / 2;
        bg.y = (GameUtil.getStageHeight() - bg.height) / 2;
        var info = new egret.TextField();
        info.bold = true;
        info.textColor = 0xffffff;
        info.strokeColor = 0x000000;
        info.stroke = 2;
        info.lineSpacing = 10;
        info.text = "\u60A8\u575A\u6301\u4E86".concat(n.GameData.level, "\u5173\n\u8FD8\u662F\u8BA9\u795E\u7ECF\u732B\u9003\uFF01\u8DD1\uFF01\u4E86\uFF01");
        info.x = (bg.width - info.width) / 2 + bg.x;
        info.y = (bg.height - info.height) / 2 + bg.y + 50;
        this.addChild(info);
        var sound = RES.getRes('fail_mp3');
        sound.play(0, 1);
        var backBtn = GameUtil.createBitmapByName('btn_back');
        this.addChild(backBtn);
        backBtn.x = (GameUtil.getStageWidth() - backBtn.width) / 2 - backBtn.width / 2;
        backBtn.y = bg.y + bg.height;
        GameUtil.bitmapToBtn(backBtn, function () {
            console.log('返回首页');
            n.GameData.level = 0;
            SceneController.initGame();
        });
        var replayBtn = GameUtil.createBitmapByName('btn_replay');
        this.addChild(replayBtn);
        replayBtn.x = (GameUtil.getStageWidth() - replayBtn.width) / 2 + replayBtn.width / 2;
        replayBtn.y = bg.y + bg.height;
        GameUtil.bitmapToBtn(replayBtn, function () {
            console.log('重新开始');
            n.GameData.level = 0;
            SceneController.showPlayScene();
        });
    };
    return EndScene;
}(BaseScene));
