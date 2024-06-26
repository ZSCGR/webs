/**
 * 工具类
 */
var GameUtil = /** @class */ (function () {
    function GameUtil() {
    }
    /**
     * 获取舞台高度
     */
    GameUtil.getStageHeight = function () {
        return egret.MainContext.instance.stage.stageHeight;
    };
    /*
     * 获取舞台宽度
     */
    GameUtil.getStageWidth = function () {
        return egret.MainContext.instance.stage.stageWidth;
    };
    /**
     * 根据name关键字创建一个Bitmap对象。name属性请参考resources/resource.json配置文件的内容。
     */
    GameUtil.createBitmapByName = function (name, type) {
        if (type === void 0) { type = 'png'; }
        var result = new egret.Bitmap();
        var texture = RES.getRes(name + '_' + type);
        result.texture = texture;
        return result;
    };
    /**
     * 根据name关键字创建一个MovieClip对象。name属性请参考resources/resource.json配置文件的内容。
     */
    GameUtil.createMovieClipByName = function (name) {
        var data_stay = RES.getRes(name + "_json");
        console.log(data_stay);
        var texture_stay = RES.getRes(name + "_png");
        var mcFactory_stay = new egret.MovieClipDataFactory(data_stay, texture_stay);
        return new egret.MovieClip(mcFactory_stay.generateMovieClipData(name));
    };
    GameUtil.bitmapToBtn = function (bitmap, callback) {
        bitmap.touchEnabled = true;
        // 记录当前位置
        var source = new Point(bitmap.x, bitmap.y);
        // 记录原来的锚点
        var sourceAnchor = new Point(bitmap.anchorOffsetX, bitmap.anchorOffsetY);
        // 监听触摸事件
        bitmap.addEventListener(egret.TouchEvent.TOUCH_BEGIN, function () {
            // 改变按钮的锚点
            bitmap.anchorOffsetX = bitmap.width / 2;
            bitmap.anchorOffsetY = bitmap.height / 2;
            // 如果改变后的锚点和原来的不一样，那就需要改变按钮位置
            if (!new Point(bitmap.anchorOffsetX, bitmap.anchorOffsetY).equal(sourceAnchor)) {
                bitmap.x = source.x + bitmap.anchorOffsetX;
                bitmap.y = source.y + bitmap.anchorOffsetY;
            }
            // 缩放
            bitmap.scaleX = 0.95;
            bitmap.scaleY = 0.95;
        }, this);
        bitmap.addEventListener(egret.TouchEvent.TOUCH_TAP, function () {
            reset();
            // 这个事件发生才算是点击按钮
            callback && callback();
        }, this);
        bitmap.addEventListener(egret.TouchEvent.TOUCH_CANCEL, reset, this);
        bitmap.addEventListener(egret.TouchEvent.TOUCH_END, reset, this);
        bitmap.addEventListener(egret.TouchEvent.TOUCH_RELEASE_OUTSIDE, reset, this);
        function reset() {
            bitmap.anchorOffsetX = sourceAnchor.x;
            bitmap.anchorOffsetY = sourceAnchor.y;
            bitmap.x = source.x;
            bitmap.y = source.y;
            bitmap.scaleX = 1;
            bitmap.scaleY = 1;
        }
    };
    return GameUtil;
}());
