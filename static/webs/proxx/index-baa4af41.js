define("./index-baa4af41.js",["exports","./chunk-539de822","./chunk-740044b8","./chunk-fd633ad1","./chunk-ca728567","./chunk-a647c4b1","./chunk-2fc5265f","./chunk-9e0cea02"],function(t,e,i,s,r,a,n,o){"use strict";var c=function(){function t(){this._grid=[],this._lastFocus=[-1,-1]}return Object.defineProperty(t.prototype,"numTiles",{get:function(){return this._numTilesX*this._numTilesY},enumerable:!0,configurable:!0}),t.prototype.createCanvas=function(){if(this._canvas=n.getCanvas("2d"),this._ctx=this._canvas.getContext("2d"),!this._ctx)throw Error("Could not instantiate 2D renderer");return this._canvas},t.prototype.init=function(t,e){this._numTilesX=t,this._numTilesY=e,this._updateTileSize(),this._initGrid(),this.onResize()},t.prototype.updateFirstRect=function(t){this._firstCellRect=t,this._rerender()},t.prototype.stop=function(){},t.prototype.onResize=function(){this._canvas&&(this._updateTileSize(),this._canvasRect=this._canvas.getBoundingClientRect(),this._canvas.width=this._canvasRect.width*i.staticDevicePixelRatio,this._canvas.height=this._canvasRect.height*i.staticDevicePixelRatio,this._prepareGradients(),this._rerender())},t.prototype.beforeUpdate=function(){},t.prototype.afterUpdate=function(){this._rerender()},t.prototype.beforeCell=function(t,e,i,s,r){var a=this._grid[e*this._numTilesX+t];a.animationList=s.slice(),a.cell=i},t.prototype.afterCell=function(t,e,i,s,r){this._maybeRenderFocusRing(t,e)},t.prototype.render=function(t,e,i,s,r){},t.prototype.setFocus=function(t,e){this._lastFocus=[t,e],this._rerender()},t.prototype._renderCell=function(t,e,i,s,r){this._isTileInView(t,e)&&(this._ctx.save(),this._setupContextForTile(t,e),this[s.name](t,e,i,s,r),this._ctx.restore())},t.prototype._updateTileSize=function(){var t=r.getCellSizes(),e=t.cellPadding,i=t.cellSize;this._tileSize=i+2*e},t.prototype._initGrid=function(){var t=o.getTime();this._grid=new Array(this.numTiles);for(var e=0;e<this._numTilesY;e++)for(var i=0;i<this._numTilesX;i++)this._grid[e*this._numTilesX+i]={animationList:[{name:0,start:t}],x:i,y:e}},t.prototype._setupContextForTile=function(t,e){this._ctx.scale(i.staticDevicePixelRatio,i.staticDevicePixelRatio),this._ctx.translate(this._firstCellRect.left,this._firstCellRect.top),this._ctx.translate(t*this._tileSize,e*this._tileSize)},t.prototype._isTileInView=function(t,e){if(!this._firstCellRect)return!1;var i=this._firstCellRect,s=i.left,r=i.top,a=i.width,n=i.height,o=t*a+s,c=e*n+r;return!(o+a<0||c+n<0||o>this._canvasRect.width||c>this._canvasRect.height)},t.prototype[0]=function(t,e,i,s,n){var o=a.idleAnimationLength,c=(n-s.start)/o%1,h=Math.floor(c*a.idleAnimationNumFrames),l=(n-(s.fadeStart||0))/a.fadeInAnimationLength;l>1&&(l=1),this._ctx.save(),this._ctx.globalAlpha=a.remap(0,1,1,a.fadedLinesAlpha,a.easeOutQuad(l)),r.idleAnimationTextureDrawer(h,this._ctx,this._tileSize),this._ctx.globalAlpha=1,r.staticTextureDrawer(0,this._ctx,this._tileSize),r.staticTextureDrawer(12,this._ctx,this._tileSize),this._ctx.restore()},t.prototype[6]=function(t,e,i,s,n){var o=a.idleAnimationLength,c=(n-s.start)/o%1,h=Math.floor(c*a.idleAnimationNumFrames),l=(n-(s.fadeStart||0))/a.fadeOutAnimationLength;l>1&&(l=1),this._ctx.save(),this._ctx.globalAlpha=a.remap(0,1,a.fadedLinesAlpha,1,a.easeOutQuad(l)),r.idleAnimationTextureDrawer(h,this._ctx,this._tileSize),this._ctx.globalAlpha=1,r.staticTextureDrawer(0,this._ctx,this._tileSize),r.staticTextureDrawer(12,this._ctx,this._tileSize),r.staticTextureDrawer(13,this._ctx,this._tileSize),this._ctx.restore()},t.prototype[5]=function(t,e,i,s,n){this._ctx.save(),i.touchingMines>0?r.staticTextureDrawer(i.touchingMines,this._ctx,this._tileSize):(this._ctx.globalAlpha=a.revealedAlpha,r.staticTextureDrawer(0,this._ctx,this._tileSize)),this._ctx.restore()},t.prototype[7]=function(t,e,i,s,a){s.start>a||r.staticTextureDrawer(10,this._ctx,this._tileSize)},t.prototype[3]=function(t,e,i,s,n){var o=(n-(s.fadeStart||s.start))/a.fadeInAnimationLength;o<0&&(o=0),o>1&&(r.processDoneCallback(s),o=1),this._ctx.save(),this._ctx.globalCompositeOperation="source-atop",this._ctx.globalAlpha=a.easeOutQuad(o),this._ctx.fillStyle=a.turquoise,this._ctx.fillRect(0,0,this._firstCellRect.width,this._firstCellRect.height),this._ctx.restore()},t.prototype[4]=function(t,e,i,s,n){var o=(n-(s.fadeStart||s.start))/a.fadeOutAnimationLength;o<0&&(o=0),o>1&&(r.processDoneCallback(s),o=1),this._ctx.save(),this._ctx.globalCompositeOperation="source-atop",this._ctx.globalAlpha=1-a.easeOutQuad(o),this._ctx.fillStyle=a.turquoise,this._ctx.fillRect(0,0,this._firstCellRect.width,this._firstCellRect.height),this._ctx.restore()},t.prototype[1]=function(t,e,i,s,n){var o=a.flashInAnimationLength,c=(n-s.start)/o;c<0||(c>1&&(r.processDoneCallback(s),c=1),this._ctx.save(),this._ctx.globalAlpha=a.easeOutQuad(c),r.staticTextureDrawer(9,this._ctx,this._tileSize),this._ctx.restore())},t.prototype[2]=function(t,e,i,s,n){var o=a.flashOutAnimationLength,c=(n-s.start)/o;c<0||(c>1&&(r.processDoneCallback(s),c=1),this._ctx.save(),this._ctx.globalAlpha=1-a.easeInOutCubic(c),r.staticTextureDrawer(9,this._ctx,this._tileSize),this._ctx.restore())},t.prototype._rerender=function(){var t,i;this._ctx.clearRect(0,0,this._canvas.width,this._canvas.height);for(var s=0;s<this._numTilesY;s++)for(var r=0;r<this._numTilesX;r++){var a=this._grid[s*this._numTilesX+r],n=a.cell,c=a.animationList,h=o.getTime();try{for(var l=(t=void 0,e.__values(c)),_=l.next();!_.done;_=l.next()){var u=_.value;this._renderCell(r,s,n,u,h)}}catch(e){t={error:e}}finally{try{_&&!_.done&&(i=l.return)&&i.call(l)}finally{if(t)throw t.error}}this._maybeRenderFocusRing(r,s)}this._drawFadeOut()},t.prototype._drawFadeOut=function(){var t,s,r=this._ctx;r.save(),r.scale(i.staticDevicePixelRatio,i.staticDevicePixelRatio),r.globalCompositeOperation="destination-out";try{for(var a=e.__values(this._gradients),n=a.next();!n.done;n=a.next()){var o=n.value,c=o.gradient,h=o.rect;r.fillStyle=c,this._ctx.fillRect(h.x,h.y,h.width,h.height)}}catch(e){t={error:e}}finally{try{n&&!n.done&&(s=a.return)&&s.call(a)}finally{if(t)throw t.error}}r.restore()},t.prototype._prepareGradients=function(){var t=this._ctx;t.save(),t.scale(i.staticDevicePixelRatio,i.staticDevicePixelRatio);var e=r.getBarHeights(),s=e.topBarHeight,n=e.bottomBarHeight,o=this._canvasRect,c=o.width,h=o.height,l=[{start:[0,s],end:[0,1.3*s],rect:new DOMRect(0,0,c,1.3*s)},{start:[c,h-n],end:[c,h-1.3*n],rect:new DOMRect(0,h-1.3*n,c,1.3*n)}];this._gradients=l.map(function(e){for(var i=e.start,s=e.end,r=e.rect,n=t.createLinearGradient(i[0],i[1],s[0],s[1]),o=0;o<10;o++){var c=o/9;n.addColorStop(c,"rgba(255, 255, 255, "+(1-a.easeInOutCubic(c))+")")}return{gradient:n,rect:r}}),t.restore()},t.prototype._rerenderCell=function(t,i,s){var r,a,n=(void 0===s?{}:s).clear;void 0!==n&&n&&(this._ctx.save(),this._setupContextForTile(t,i),this._ctx.clearRect(0,0,this._tileSize,this._tileSize),this._ctx.restore());var c=this._grid[i*this._numTilesX+t],h=c.cell,l=c.animationList,_=o.getTime();try{for(var u=e.__values(l),p=u.next();!p.done;p=u.next()){var d=p.value;this._renderCell(t,i,h,d,_)}}catch(t){r={error:t}}finally{try{p&&!p.done&&(a=u.return)&&a.call(u)}finally{if(r)throw r.error}}this._maybeRenderFocusRing(t,i)},t.prototype._maybeRenderFocusRing=function(t,e){this._lastFocus[0]===t&&this._lastFocus[1]===e&&(this._ctx.save(),this._setupContextForTile(t,e),r.staticTextureDrawer(11,this._ctx,this._tileSize),this._ctx.restore())},t}();t.default=c});
//# sourceMappingURL=index-baa4af41.js.map