/**
 * Arena.K3DController class.
 * 
 * Arena impl of a K3D controller. One per sprite.
 */
(function()
{
   /**
    * Arena.Controller constructor
    * 
    * @param canvas {Object}  The canvas to render the object list into.
    */
   Arena.Controller = function()
   {
      Arena.Controller.superclass.constructor.call(this);
   };
   
   extend(Arena.Controller, K3D.BaseController,
   {
      /**
       * Render tick - should be called from appropriate sprite renderer
       */
      render: function(ctx)
      {
         // execute super class method to process render pipelines
         this.processFrame(ctx);
      }
   });
})();


/**
 * K3DActor class.
 * 
 * An actor that can be rendered by K3D. The code implements a K3D controller.
 * Call renderK3D() each frame.
 * 
 * @namespace Arena
 * @class Arena.K3DActor
 */
(function()
{
   Arena.K3DActor = function(p, v)
   {
      Arena.K3DActor.superclass.constructor.call(this, p, v);
      this.k3dController = new Arena.Controller();
      return this;
   };
   
   extend(Arena.K3DActor, Game.Actor,
   {
      k3dController: null,
      k3dObject: null,
      
      /**
       * Render K3D graphic.
       */
      renderK3D: function renderK3D(ctx)
      {
         this.k3dController.render(ctx);
      },
      
      setK3DObject: function setK3DObject(obj)
      {
         this.k3dObject = obj;
         this.k3dController.addK3DObject(obj);
      }
   });
})();


/**
 * Arena.K3DObject class
 * 
 * Arena specific functionality for K3D renderable objects.
 */
(function()
{
   /**
    * Arena.K3DObject Constructor
    */
   Arena.K3DObject = function()
   {
      Arena.K3DObject.superclass.constructor.call(this);
      return this;
   };
   
   /**
    * Arena.K3DObject prototype
    */
   extend(Arena.K3DObject, K3D.K3DObject,
   {
      /**
       * Routine to calculate and perform all transformations including sorting of object
       * ready for rendering a frame render.
       * 
       * @method executePipeline
       */
      executePipeline: function()
      {
         // inc angles
         this.ogamma += (this.addgamma);  // * GameHandler.frameMultipler - not for prerender...
         this.otheta += (this.addtheta);
         this.ophi   += (this.addphi);
         
         // call the transformation routines
         this.calcMatrix();
         this.transformToWorld();
         this.transformToScreen();
         
         // sort object by distance using the appropriate renderer
         this.controller.getRenderer(this.drawmode).sortByDistance(this);
      }
   });
})();
