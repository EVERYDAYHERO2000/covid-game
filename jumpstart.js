/*
 * By Zerratar, Karl Johansson
 *  2017-10-09
 *  How to use:
 *   1. Link to this pen and use it as javascript
 *   2. add <canvas class="myCanvas"></canvas> to html
 *   3. add the following js
 *     
 *      const draw = () => { 
 *        // ctx.fillRect(...)
 *      };
 *      
 *      const update = () => { 
 *        // logic here, called just before draw is called
 *      };
 *      
 *      const resize = () => {
 *         canvas.width = window.innerWidth-1;
 *         canvas.height = window.innerHeight-4;
 *      };
 *      
 *      setup(".myCanvas", draw, update, resize);
 *      
 *      Presto! Its all done! Now you have access to a quick way of drawing on the canvas
 *      Pssst: You can even use stuff as: Time.time, Time.deltaTime, Time.deltaTimeUnscaled, Time.timeScale, Time.frameCount, mouse.x, mouse.y
 *                Time.time:              gets the total time elapsed in seconds since first frame
 *                Time.deltaTime:         gets the time elapsed since last frame, this is multiplied by Time.timeScale
 *                Time.deltaTimeUnscaled: gets the time elapsed since last frame, uneffected by the Time.timeScale
 *                Time.timeScale:         gets the timescale, 1 is default and is the normal speed
 *
 *      There are alot of other hidden gems in this script, not covered by the tiny documentation above.
 */

var EPSILON = 0.000001;
let canvas  = undefined;
let ctx     = undefined;
let gl      = undefined;
let isWebGl = false;
var gravity_multiplier = 0.5;
var gravity_base = -0.00982;
var gravity = gravity_base * gravity_multiplier;
var mouse = { x: 0, y: 0, leftButton: false, rightButton: false, middleButton: false };
var Time = { timeScale: 1, deltaTime: 0, deltaTimeUnscaled: 0, time: 0, frameCount: 0 };
var onDraw   = undefined;
var onUpdate = undefined;
let ctxScaleY = 1.0;
let ctxScaleX = 1.0;

function setGravityMultiplier(val) {
  gravity_multiplier = val;
  gravity = gravity_base * gravity_multiplier;
}

function setup3d(canvasSelector, onDrawCallback, onUpdateCallback, onResizeCallback, onInitCallback) {  
  isWebGl  = true;
  canvas   = document.querySelector(canvasSelector);  
  ctx      = canvas.getContext("experimental-webgl");
  gl       = ctx;  // alias
  onDraw   = onDrawCallback;
  onUpdate = onUpdateCallback;
  window.addEventListener("resize", onResizeCallback, false);
  canvas.addEventListener("mousemove", mouseMove, false);
  canvas.addEventListener("touchmove", touchMove, false);
  canvas.addEventListener("touchstart", e => {
    e.preventDefault();
    mouse.leftButton = true;
  }, false);
  
  canvas.addEventListener("touchend", e => {
    e.preventDefault();
    mouse.leftButton = false;
  }, false);
  
  canvas.addEventListener("mousedown", mouseDown, false);
  canvas.addEventListener("mouseup", mouseUp, false);
  if(onResizeCallback) onResizeCallback();  
  if (onInitCallback) onInitCallback();
  run(0);
}

function setup(canvasSelector, onDrawCallback, onUpdateCallback, onResizeCallback) {  
  canvas = document.querySelector(canvasSelector);
  ctx    = canvas.getContext("2d");
  onDraw = onDrawCallback;
  onUpdate = onUpdateCallback;
  window.addEventListener("resize", onResizeCallback, false);
  canvas.addEventListener("mousemove", mouseMove, false);
  canvas.addEventListener("touchmove", touchMove, false);
  canvas.addEventListener("touchstart", e => {
    e.preventDefault();
    mouse.leftButton = true;
  }, false);
  
  canvas.addEventListener("touchend", e => {
    e.preventDefault();
    mouse.leftButton = false;
  }, false);
  
  canvas.addEventListener("mousedown", mouseDown, false);
  canvas.addEventListener("mouseup", mouseUp, false);
  if(onResizeCallback) onResizeCallback();
  run(0);
}

function drawEllipse(cx, cy, w, h){  
  ctx.beginPath();
  let lx = cx - w/2,
      rx = cx + w/2,
      ty = cy - h/2,
      by = cy + h/2;
  // let kappa = 4 * ((Math.sqrt(2) - 1)/3)
  let kappa = 0.551784;  
  var xkappa = kappa*w/2;
  var ykappa = h*kappa/2;
  ctx.moveTo(cx,ty);
  ctx.bezierCurveTo(cx+xkappa,ty,rx,cy-ykappa,rx,cy);
  ctx.bezierCurveTo(rx,cy+ykappa,cx+xkappa,by,cx,by);
  ctx.bezierCurveTo(cx-xkappa,by,lx,cy+ykappa,lx,cy);
  ctx.bezierCurveTo(lx,cy-ykappa,cx-xkappa,ty,cx,ty);
  ctx.stroke();
  ctx.fill();
}

function drawCircle(x, y, fillStyle, radius) {  
  radius = radius || 5;
  ctx.beginPath();  
  ctx.fillStyle=fillStyle||"green";  
  ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
  ctx.stroke();
  ctx.fill();
}

function resetScale() {
  ctxScaleX = 1;
  ctxScaleY = 1;
}

Array.prototype.remove = function(from, to) {
  var rest = this.slice((to || from) + 1 || this.length);
  this.length = from < 0 ? this.length + from : from;
  return this.push.apply(this, rest);
};

function rgb(r, g, b) {
  return new Color(r, g, b);
}

function rgba(r, g, b, a) {
  return new Color(r,g,b,a);
}

class Color {
  constructor(r,g,b,a) {
    this.r=r;
    this.g=g;
    this.b=b;
    if (a === undefined && a !== 0) a = 1.0;
    this.a=a;
  }    
  static getWhite() {
    return new Color(255,255,255,1);
  }  
  static getBlack() {
    return new Color(0,0,0,1);
  }  
  darker(amount) {    
    return this.shade(-amount);
  }  
  lighter(amount) {    
    return this.shade(amount);
  }
  lerp(to, amount) {
    const lerpNum = (start, end, a) => parseInt(start + ((end-start) * a));
    return new Color(
      lerpNum(this.r, to.r, amount),
      lerpNum(this.g, to.g, amount),
      lerpNum(this.b, to.b, amount),
      this.a
    );
  }  
  shade(percent) {
    let r = parseInt(this.r * (100 + percent) / 100);
    let g = parseInt(this.g * (100 + percent) / 100);
    let b = parseInt(this.b * (100 + percent) / 100);
    let c = new Color((r<255)?r:255, (g<255)?g:255,(b<255)?b:255,this.a);    
    return c;
  }  
  rgba(alpha) {
    alpha = alpha || this.a;
    return `rgba(${this.r},${this.g},${this.b},${alpha})`;
  }
  rgb() {    
    return `rgb(${this.r},${this.g},${this.b})`;
  }  
}

class PixelUtilities {
  static resizeNearestNeighbor(pixels, oldWidth, oldHeight, newWidth, newHeight) {
    let tmp = new Array(newWidth * newHeight);
    let xRatio = ((oldWidth<<16)/newWidth)+1;
    let yRatio = ((oldHeight<<16)/newHeight)+1;
    let x2, y2;
    for (let y = 0; y < newHeight; ++y) {
      for (let x = 0; x < newWidth; ++x) {
        y2 = (y*yRatio)>>16;
        x2 = (x*xRatio)>>16;
        tmp[y*newWidth+x] = pixels[y2*oldWidth+x2];
      }
    }
    return tmp;
  }
}

class Shape {
  constructor(points) {
    this.points = points;
  }  
}

class Polygon extends Shape {
  constructor(points) {    
    super(points);
  } 
  
  static create(x, y, radius, npoints) { 
    let TWO_PI = Math.PI * 2;
    let angle = TWO_PI / npoints;
    let pts = [];
    let startPoint = undefined;
    for (let a = 0; a < TWO_PI; a += angle) {      
      let sx = x + Math.cos(a) * radius;
      let sy = y + Math.sin(a) * radius;
      let pt = new Point(sx, sy);
      if (startPoint == undefined)
        startPoint = pt.copy();
      pts.push(pt);
    }    
    pts.push(startPoint);
    return new Polygon(pts);
  }
  
  isPointInside(p) {
    let isInside = false;
    let polygon = this.points;
    let minX = polygon[0].x, maxX = polygon[0].x;
    let minY = polygon[0].y, maxY = polygon[0].y;
    for (let n = 1; n < polygon.length; n++) {
      var q = polygon[n];
      minX = Math.min(q.x, minX);
      maxX = Math.max(q.x, maxX);
      minY = Math.min(q.y, minY);
      maxY = Math.max(q.y, maxY);
    }

    if (p.x < minX || p.x > maxX || p.y < minY || p.y > maxY) {
      return false;
    }

    var i = 0, j = polygon.length - 1;
    for (i, j; i < polygon.length; j = i++) {
      if ( (polygon[i].y > p.y) != (polygon[j].y > p.y) &&
          p.x < (polygon[j].x - polygon[i].x) * (p.y - polygon[i].y) / (polygon[j].y - polygon[i].y) + polygon[i].x ) {
        isInside = !isInside;
      }
    }

    return isInside;
  }  
  
  draw(strokeStyle, fillStyle) {
    ctx.save();
    ctx.beginPath();
    ctx.strokeStyle = strokeStyle || "red";
    ctx.moveTo(this.points[0].x, this.points[0].y);
    for (let i = 1; i < this.points.length; ++i) {
      ctx.lineTo(this.points[i].x, this.points[i].y);
    }
    ctx.stroke();
    if (fillStyle !== undefined) {
      ctx.fillStyle = fillStyle;
      ctx.fill();
    }
    ctx.closePath();
    ctx.restore();
  }
  
  offset(xoffset, yoffset) {
    for(let i = 0; i < this.points.length; i++) {
      this.points[i] = new Point(this.points[i].x + xoffset, this.points[i].y + yoffset);
    }
    return this;
  }
  scale(scale) {
    for(let i = 0; i < this.points.length; i++) {
      this.points[i] = new Point(this.points[i].x * scale, this.points[i].y * scale);
    }
  }
  moveTo(x, y, origin) {
    // get bounds
    // then move all points so the bounds LEFT,TOP is touching the x, y pos
    origin = origin || new Point(0, 0);
    let bb = this.getBoundingBox();
    let dx = x - bb.min.x;    
    let dy = y - bb.min.y;    
    if (origin.x > 0) dx -= (bb.max.x - bb.min.x) * origin.x;              
    if (origin.y > 0) dy -= (bb.max.y - bb.min.y) * origin.y;        
    return this.offset(dx, dy);    
  }
  
  getBoundingBox() {
    let xMin = 999999, xMax = 0;
    let yMin = 999999, yMax = 0;
    for (let i = 0; i < this.points.length; ++i) {
      xMin = Math.min(xMin, this.points[i].x);
      yMin = Math.min(yMin, this.points[i].y);
      xMax = Math.max(xMax, this.points[i].x);
      yMax = Math.max(yMax, this.points[i].y);      
    }
    let min = {x:xMin,y:yMin};
    let max = {x:xMax,y:yMax};
    return new BoundingBox(min, max);
  }
  
  getLines() {
    let pts = [];
    let lines=[];
    let idx = 0;
    this.points.forEach(x=>pts.push(x));
    for(let i = 1; i < pts.length; i++) {
      let line = new Line(pts[i-1], pts[i]);
      line.index = idx++;
      lines.push(line);
    }
    return lines;    
  }
}

class Rectangle {
  constructor() {
    this.left=0;
    this.right=0;
    this.top=0;
    this.bottom=0;
  }
}

class Line extends Shape {
  constructor(p1, p2) {
    super([p1, p2]);
    this.start = p1;
    this.stop  = p2;   
  }
  get normal() {
    let dx = this.stop.x - this.start.x;
    let dy = this.stop.y - this.start.y;
    return new Line(new Point(-dy, dx), new Point(dy, -dx));
  }
  draw(strokeStyle, linedash, linewidth) {    
    this.drawLine(this, strokeStyle, linedash, linewidth); 
  }  
  drawNormal(strokeStyle) {
    let bb = this.getBoundingBox();
    let n  = this.normal;
    
    let posx = bb.min.x ;
    let posy = bb.min.y ;
        
    let x1 = posx + n.start.x;
    let x2 = posx + n.stop.x;
    let y1 = posy + n.start.y;
    let y2 = posy + n.stop.y;
        
    this.drawLine(
      new Line(
        new Point(x1, y1),
        new Point(x2, y2)
      ), 
      strokeStyle);
  }
  drawLine(line, strokeStyle, linedash, linewidth) {
    ctx.save();
    ctx.beginPath();
    if (linedash) ctx.setLineDash(linedash);
    if (linewidth) ctx.lineWidth = linewidth;
    ctx.strokeStyle = strokeStyle || "yellow";
    ctx.moveTo(line.start.x, line.start.y);
    ctx.lineTo(line.stop.x, line.stop.y);
    ctx.stroke();
    ctx.restore();    
  }
  
  getBoundingBox() {
    return new BoundingBox(
      new Point(Math.min(this.start.x, this.stop.x), Math.min(this.start.y, this.stop.y)),
      new Point(Math.max(this.start.x, this.stop.x), Math.max(this.start.y, this.stop.y))      
    );    
  }
  getMidPoint() {    
    return new Point((this.start.x + this.stop.x) / 2,(this.start.y + this.stop.y)/2);
  }
}

class Point {
  constructor(x,y,index,intersectionPoint) {
    this.x = x;
    this.y = y;
    this.intersectionPoint = intersectionPoint||false;
    this.index = index||-1;
  }
  mul(scale) {
    this.x *= scale;
    this.y *= scale;
    return this;
  }
  copy() {
    return new Point(this.x, this.y, this.index, false);
  }
}

class Vector3 {
  constructor(x, y, z) {
    this.x = x||0; 
    this.y = y||0;
    this.z = z||0;
  }  
}

class Vector2 {
  constructor(x, y) {
    this.x = x||0; 
    this.y = y||0;
  }
  get length() {
    return Math.sqrt(this.x * this.x + this.y * this.y);
  }
  get sqrLength() {
    return this.x * this.x + this.y * this.y;
  }
  lerp(v2, a) {    
    return new Vector2(      
      this.x + (v2.x - this.x) * a,
      this.y + (v2.y - this.y) * a,      
    );
  }
  moveTowards(v2, a) {
    if (a > 1.0) a = 1.0;
    if (a < 0.0) a = 0.0;
    return this.lerp(v2, a);
  }
  dot(v2) {
    let m = this.mul(v2);
    return m.x + m.y;
  }
  cross(v2) {
    return this.x * v2.y - v2.x * this.y;
  }
  angleBetween(v2) {
    let sin = this.x * v2.y - v2.x * this.y;
    let cos = this.x * v2.y + v2.x * this.y;
    return Math.atan2(sin, cos) * (180 / Math.PI);
  }
  normalize() {        
    let len = this.length;
    return new Vector2(this.x / len, this.y / len);
  }
  direction(v2) {
    let heading   = v2.sub(this);
    var distance  = heading.length;
    return heading.div(distance);
  }
  distance(v2) {
    let diff = v2.sub(this);
    return Math.sqrt(diff.x * diff.x + diff.y * diff.y);
  }
  add(v2) {
    if (v2 instanceof Vector2) return new Vector2(this.x + v2.x, this.y + v2.y);
    else return new Vector2(this.x + v2, this.y + v2);
  }
  sub(v2) {
    if (v2 instanceof Vector2) return new Vector2(this.x - v2.x, this.y - v2.y);
    else return new Vector2(this.x - v2, this.y - v2);
  }    
  mul(v2) {    
    if (v2 instanceof Vector2) return new Vector2(this.x * v2.x, this.y * v2.y);
    else return new Vector2(this.x * v2, this.y * v2);
  }  
  div(v2) {
    if (v2 instanceof Vector2) return new Vector2(this.x / v2.x, this.y / v2.y);
    else return new Vector2(this.x / v2, this.y / v2);
  }
}

class Intersection {
  /**
     * Calculate the cross product of two points.
     * @param a first point
     * @param b second point
     * @return the value of the cross product
     */  
  static crossProduct(a, b) {
    return a.x * b.y - b.x * a.y;
  }
  
  static doBoundingBoxesIntersect(a, b) {    
    return a.min.x <= b.max.x && a.max.x >= b.min.x && a.min.y <= b.max.y && a.max.y >= b.min.y;
  }
  
  /**
     * Checks if a Point is on a line
     * @param a line (interpreted as line, although given as line
     *                segment)
     * @param b point
     * @return <code>true</code> if point is on line, otherwise
     *         <code>false</code>
     */
  static isPointOnLine(a, b) {
    // Move the image, so that a.first is on (0|0)
    let aTmp = new Line(new Point(0, 0), new Point(a.stop.x - a.start.x, a.stop.y - a.start.y));
    let bTmp = new Point(b.x - a.start.x, b.y - a.start.y);
    let r = this.crossProduct(aTmp.stop, bTmp);
    return Math.abs(r) < EPSILON;    
  }
    
  /**
     * Checks if a point is right of a line. If the point is on the
     * line, it is not right of the line.
     * @param a line segment interpreted as a line
     * @param b the point
     * @return <code>true</code> if the point is right of the line,
     *         <code>false</code> otherwise
     */  
  static isPointRightOfLine(a, b) {
    // Move the image, so that a.first is on (0|0)
    let aTmp = new Line(new Point(0, 0), new Point(
      a.stop.x - a.start.x, a.stop.y - a.start.y));
    let bTmp = new Point(b.x - a.start.x, b.y - a.start.y);
    return this.crossProduct(aTmp.stop, bTmp) < 0;    
  }
  
  /**
     * Check if line segment first touches or crosses the line that is
     * defined by line segment second.
     *
     * @param first line segment interpreted as line
     * @param second line segment
     * @return <code>true</code> if line segment first touches or
     *                           crosses line second,
     *         <code>false</code> otherwise.
     */  
  static lineSegmentTouchesOrCrossesLine(a, b) {
    return this.isPointOnLine(a, b.start)
    || this.isPointOnLine(a, b.stop)
    || (this.isPointRightOfLine(a, b.start) ^ this.isPointRightOfLine(a, b.stop));    
  }
  
  /**
     * Check if line segments intersect
     * @param a first line segment
     * @param b second line segment
     * @return <code>true</code> if lines do intersect,
     *         <code>false</code> otherwise
     */  
  static doLinesIntersect(a, b) {
    let box1 = a.getBoundingBox();
    let box2 = b.getBoundingBox();
      return this.doBoundingBoxesIntersect(box1, box2)
        && this.lineSegmentTouchesOrCrossesLine(a, b)
        && this.lineSegmentTouchesOrCrossesLine(b, a);    
  }
  
  static getIntersection(a, b) {
      /* the intersection [(x1,y1), (x2, y2)]
         it might be a line or a single point. If it is a line,
         then x1 = x2 and y1 = y2.  */
      var x1, y1, x2, y2;

     if (a.start.x == a.stop.x) {
          // Case (A)
          // As a is a perfect vertical line, it cannot be represented
          // nicely in a mathematical way. But we directly know that
          //
          x1 = a.start.x;
          x2 = x1;
          if (b.start.x == b.stop.x) {
              // Case (AA): all x are the same!
              // Normalize
              if(a.start.y > a.stop.y) {
                  a = {start: a.stop, stop: a.start};
              }
              if(b.start.y > b.stop.y) {
                  b = {start: b.stop, stop: b.start};
              }
              if(a.start.y > b.start.y) {
                  var tmp = a;
                  a = b;
                  b = tmp;
              }

              // Now we know that the y-value of a.start is the 
              // lowest of all 4 y values
              // this means, we are either in case (AAA):
              //   a: x--------------x
              //   b:    x---------------x
              // or in case (AAB)
              //   a: x--------------x
              //   b:    x-------x
              // in both cases:
              // get the relavant y intervall
              y1 = b.start.y;
              y2 = Math.min(a.stop.y, b.stop.y);
          } else {
              // Case (AB)
              // we can mathematically represent line b as
              //     y = m*x + t <=> t = y - m*x
              // m = (y1-y2)/(x1-x2)
              var m, t;
              m = (b.start.y - b.stop.y)/
                  (b.start.x - b.stop.x);
              t = b.start.y - m*b.start.x;
              y1 = m*x1 + t;
              y2 = y1
          }
      } else if (b.start.x == b.stop.x) {
          // Case (B)
          // essentially the same as Case (AB), but with
          // a and b switched
          x1 = b.start.x;
          x2 = x1;

          var tmp = a;
          a = b;
          b = tmp;

          var m, t;
          m = (b.start.y - b.stop.y)/
              (b.start.x - b.stop.x);
          t = b.start.y - m*b.start.x;
          y1 = m*x1 + t;
          y2 = y1
      } else {
          // Case (C)
          // Both lines can be represented mathematically
          var ma, mb, ta, tb;
          ma = (a.start.y - a.stop.y)/
               (a.start.x - a.stop.x);
          mb = (b.start.y - b.stop.y)/
               (b.start.x - b.stop.x);
          ta = a.start.y - ma*a.start.x;
          tb = b.start.y - mb*b.start.x;
          if (ma == mb) {
              // Case (CA)
              // both lines are in parallel. As we know that they 
              // intersect, the intersection could be a line
              // when we rotated this, it would be the same situation 
              // as in case (AA)

              // Normalize
              if(a.start.x > a.stop.x) {
                  a = {start: a.stop, stop: a.start};
              }
              if(b.start.x > b.stop.x) {
                  b = {start: b.stop, stop: b.start};
              }
              if(a.start.x > b.start.x) {
                  var tmp = a;
                  a = b;
                  b = tmp;
              }

              // get the relavant x intervall
              x1 = b.start.x;
              x2 = Math.min(a.stop.x, b.stop.x);
              y1 = ma*x1+ta;
              y2 = ma*x2+ta;
          } else {
              // Case (CB): only a point as intersection:
              // y = ma*x+ta
              // y = mb*x+tb
              // ma*x + ta = mb*x + tb
              // (ma-mb)*x = tb - ta
              // x = (tb - ta)/(ma-mb)
              x1 = (tb-ta)/(ma-mb);
              y1 = ma*x1+ta;
              x2 = x1;
              y2 = y1;
          }
      }
      // return {start: {"x":x1, "y":y1}, stop: {"x":x2, "y":y2}};
      let intersectionPoint = new Point(x1, y1);
      intersectionPoint.intersectionPoint = true;
      return intersectionPoint;
  } 

  static anyLineStartsWith(pt, polyLines) {    
    return polyLines.filter(x => x.start.x === pt.x && x.start.y === pt.y).length > 0;
  }
  
  /**
     * Slice a polygon by the provided intersection points
     * @param poly the polygon to slice
     * @param intersections the intersection points used for the slicing
     * @return an array of polygons that is the result of the slice
     */    
  static slice(poly, intersections) {
    // if (intersections.length <= 1) return [poly];
    if (intersections.length == 2) return this.sliceSimplePolygonIntersection( poly, intersections);
    if (intersections.length  > 2) return this.sliceComplexPolygonIntersection(poly, intersections);
    return [poly];
  }  
  
  
  static sliceSimplePolygonIntersection(poly, intersections) {
    let polyLines = poly.getLines();    
    let breakIndex = 0;
    let polyPointsA = [];
    let polyPointsB = [];
    let polys = [];  
    let polyA = undefined;
    let polyB = undefined;    
    let polyPoints = []; 

    // 1. insert cut points
    // 2. then iterate all points to build new lines

    let lidx = 0;
    let ll = -1;
    for(let x = 0; x < poly.points.length;++x) {                                 
      polyPoints.push(poly.points[x]);        
      if (x!==0&&this.anyLineStartsWith(poly.points[x], polyLines)) lidx++;    
      for (let int of intersections) {
        if (int.index === lidx && lidx !== ll) {        
          polyPoints.push(int);
          ll = lidx;
        }
      }               
    }

    // rotate points until we start on an intersection  
    while(!polyPoints[0].intersectionPoint) {    
      let item = polyPoints.shift();
      polyPoints.push(item);    
    }

    let intersectionIndex = 0;
    // iterate each poly point so we can build our points for polyA (top-piece)
    // logic:
    //    start at first intersectionPoint, iterate until next intersectionPoint
    //    then add the start(first intersectionPoint) again. Presto, polygon done!     
    for (let x = 0; x < polyPoints.length; x++) {
      if (polyPoints[x].intersectionPoint === true) {
        if (intersectionIndex === 0) {
          // our starting point! Add it and continue.
          polyPointsA.push(polyPoints[x].copy());
        } else {
          // alright! We're at our second intersection. Add this point
          polyPointsA.push(polyPoints[x].copy());
          // and add the first point so we can close the polygon
          polyPointsA.push(polyPointsA[0].copy());
          // presto! Create the poly and be happy
          polyA = new Polygon(polyPointsA);
          polys.push(polyA);
          break;
        }
        ++intersectionIndex;
      }
      // while we still havnt found our second intersection, keep pushing those points
      else if (intersectionIndex === 1) {
        polyPointsA.push(polyPoints[x].copy());
      }
      if (polyA !== undefined) break; // we're done, so jump out!
    } 

    // time to create the bottom-piece polygon
    // logic:
    //    start at first intersectionPoint
    //    then skip all points until we find our next intersectionPoint, when we do. We take
    //    the rest of the points until we're at the starting point again. (basically, take the rest)  
    intersectionIndex = 0;
    for (let x = 0; x < polyPoints.length; x++) {
      if (polyPoints[x].intersectionPoint === true) {
        if (intersectionIndex === 0) {
          // our starting point! Add it and continue.
          polyPointsB.push(polyPoints[x].copy());
        } else {
          // alright! We're at our second intersection. Add this point
          polyPointsB.push(polyPoints[x].copy());
          // this means that we can now add polys again :)
        }
        ++intersectionIndex;
      }
      // after adding both intersection points, we are now ready to grab the rest of points!
      else if (intersectionIndex === 2) {      
        polyPointsB.push(polyPoints[x].copy());
      }
    }
    // finally, all points have been added to our bottom-piece.
    // all we have to do now is close the poly by adding starting point
    // and then lets create our polygon :)
    polyPointsB.push(polyPointsB[0].copy());  
    polyB = new Polygon(polyPointsB);
    polys.push(polyB);  
    return polys; // return the new set of polygons    
  }
  
  static sliceComplexPolygonIntersection(poly, intersections) {
    return [poly]; // not implemented, better just return same than breaking the shape.
    // to solve this one we still want to add the intersection points into the polygon.
    // .... todo
    
    
    // possible solution for having more than 2 intersection points are to first do the slice on the first two points
    // then do another slice between 2 and 3rd point.   
    // although its a bit slower than wanted. it is at least simple to follow
  }
  
  static check(a, b) {    
    let linesA = [];
    let linesB = [];
    let intersections = [];
    if (a instanceof Polygon) linesA = this.getPolygonLines(a);    
    if (a instanceof Rectangle) linesA = this.getRectangleLines(a);        
    if (a instanceof Line) linesA = [a];
    if (b instanceof Polygon) linesB = this.getPolygonLines(b);    
    if (b instanceof Rectangle) linesB = this.getRectangleLines(b);
    if (b instanceof Line) linesB = [b];    
    for (let i = 0; i < linesA.length; i++) {
      for (let j = 0; j < linesB.length; j++) {
        if (this.doLinesIntersect(linesA[i], linesB[j])) {
          let result = this.getIntersection(linesA[i], linesB[j]);         
          if (result !== undefined) {
            result.index = linesA[i].index;
            intersections.push(result);
          }
        }
      }
    }
    return intersections;
  }  
  
  static getPolygonLines(poly) {
    return poly.getLines();
  }
  
  static getRectangleLines(rect) {
    return [
      new Line(new Point(rect.left, rect.top), new Point(rect.right, rect.top)), 
      new Line(new Point(rect.right, rect.top), new Point(rect.right, rect.bottom)),
      new Line(new Point(rect.right, rect.bottom), new Point(rect.left, rect.bottom)),
      new Line(new Point(rect.left, rect.bottom), new Point(rect.left, rect.top)),
    ];    
  }
}

class Physics {
    static register(object) {
        if (!this.objects) this.objects = [];        
        this.objects.push(object);
    }
  
    static unregister(object) {
        // note: this would have been super bad if we had multiple threads..
        if (!this.objects) this.objects = [];        
        var index = this.objects.indexOf(object);       
        if (index === -1) return;
        this.objects.remove(index);        
    }
  
    static update() {
      if (!this.objects) this.objects = [];  
      for (let index = 0; index < this.objects.length; ++index) {
        let obj = this.objects[index];
        if (obj.rigidBody) this.updateRigidBody(obj.rigidBody);        
        else if (obj.collider) this.updateCollider(obj.collider);       
      }
    }

    static updateRigidBody(rigidBody) {
        let isGrounded = false;
        let velX = rigidBody.velocity.x * Time.deltaTime;
        let velY = rigidBody.velocity.y * Time.deltaTime;
        if (!isNaN(velX) && !rigidBody.constraints.freezePositionX) rigidBody.gameObject.position.x += velX;
        if (!isNaN(velY) && !rigidBody.constraints.freezePositionY) rigidBody.gameObject.position.y += velY;
        // let height = rigidBody.gameObject.collider.bounds.max.y;
        let screenHeight = window.innerHeight / ctxScaleY;
        for (let i = 0; i < this.objects.length; ++i) {
            if (this.objects[i].rigidBody !== rigidBody) {
                let obj = this.objects[i];
                if (obj.collider && obj.collider.isTouching(rigidBody.gameObject.collider)) {
                    if (obj.isTrigger === true) {
                        rigidBody.gameObject.onTriggerEnter(obj.collider);
                    } else {
                        rigidBody.gameObject.onCollisionEnter(obj.collider);
                        if (rigidBody.ignoreCollisionPhysics) return;
                        // check which face of the boundingbox/collider that actually had a collision
                        // and then stop the velocity of that direction

                        // TODO: RayCast the sides to determine where the blockage is
                        //       and stop the velocity in that direction                      
                        
                        // NOTE: You can jump through objects that whould block your left or right if you jump towards it                      
                        if (obj.position.y + obj.offset.y >= (rigidBody.gameObject.position.y + rigidBody.gameObject.offset.y)) {
                            isGrounded = true;
                            rigidBody.velocity.y = 0;
                            rigidBody.gameObject.position.y = (obj.position.y - rigidBody.gameObject.collider.bounds.max.y) + 1;
                        } else if (obj.position.x + obj.offset.x >= rigidBody.gameObject.position.x) {
                          // collides to the right
                          // + rigidBody.gameObject.collider.bounds.max.x
                          rigidBody.gameObject.position.x -= velX;
                          rigidBody.velocity.x = 0;
                        }
                        else if (obj.position.x + obj.offset.x + obj.collider.bounds.max.x >= 
                                 rigidBody.gameObject.position.x) {
                          // collides to the right
                          // + rigidBody.gameObject.collider.bounds.max.x
                          rigidBody.gameObject.position.x -= velX;
                          rigidBody.velocity.x = 0;
                        }
                    }
                }
            }
        }
        if (!isGrounded) {
            let fall = gravity * Time.deltaTime;
            if (!isNaN(fall)) {
                rigidBody.velocity.y -= fall;
            }
        }
        else {
            if (rigidBody.force.y != 0) {
                rigidBody.velocity.y = rigidBody.force.y;
                rigidBody.force.y = 0;
            }
        }

        rigidBody.isGrounded = isGrounded;
    }

    static updateCollider(collider) {
        // console.log("update collider");
    }
}

class GameComponent {
    constructor() {
      this.gameObject = null;
      this.isEnabled = true;
      this.tag = '';
      this.layer = '';
    }
    setGameObject(gameObject) {
        this.gameObject = gameObject;
    }
    update() { }
    draw() { }
}

class BoundingBox {
  constructor(min = { x: 0, y: 0 }, max = { x: 0, y: 0 }) {
      this.min = min;
      this.max = max;
    }
  get delta() {
    return {
      x: this.max.x - this.min.x,
      y: this.max.y - this.min.y
    };
  }
}

class Viewport {
  constructor() {
    this.x = 0;
    this.y = 0;
    this.width = window.innerWidth / ctxScaleX;
    this.height = window.innerWidth / ctxScaleY;    
  }
  move (xOffset, yOffset) {
    this.x += xOffset;
    this.y += yOffset;
  }
  reset() {
    this.x = 0;
    this.y = 0;
  }
}

class Camera {
  constructor() {    
    this.viewport = new Viewport();    
  }
  static getMainCamera() {
    if (!this.mainCamera) this.mainCamera = new Camera();
    return this.mainCamera;
  }
  setViewport(x, y, w, h) {
    this.viewport.x = x;
    this.viewport.y = y;
    if (w) this.viewport.width  = w;
    if (h) this.viewport.height = h;
  }
}

class FollowTarget extends GameComponent {
  constructor(target, xOffset, yOffset) {
    super();  
    this.target=target;
    this.xOffset=xOffset||0;
    this.yOffset=yOffset||0;
  }
  draw() {
    if (!this.isEnabled||!this.isVisible) return;
    super.draw();
  }
  update() {
    if (!this.isEnabled) return;
    super.update();
    if (this.target instanceof GameObject) {
      this.gameObject.position.x = this.target.position.x + this.xOffset;
      this.gameObject.position.y = this.target.position.y + this.yOffset;
    }
  }
}

class FadeOut extends GameComponent {
  constructor() {
    super();
    this.isRunning = false;
    this.value = 1.0;    
    this.duration = 5.0;
    this.timer = this.duration;    
    this.destroyObjectOnCompletion = false;
  }
  start() {    
    this.value = this.gameObject.opacity;
    this.timer = this.duration * this.gameObject.opacity;        
    this.isRunning = true;    
  }
  stop() {
    this.isRunning = false;
  }
  update() {
    if (!this.isEnabled || !this.isRunning) return;
    super.update();
    
    this.timer -= Time.deltaTime / 1000;
    this.value = 1-((this.duration - this.timer) / this.duration);
    this.gameObject.opacity = this.value;
    if (this.value <= 0.001 || this.timer <= 0) {
      if (this.onComplete) this.onComplete(this.gameObject);
      this.isRunning = false;
      this.timer = 0;
      this.gameObject.opacity = 0;
      if (this.destroyObjectOnCompletion) {
        this.gameObject.destroy();
      }        
    }    

  }
  draw() { 
    super.draw();
  }
}

class Mask extends GameComponent {
  constructor() {
    super();
    this.shape = undefined;    
    this.centerShape = false;
    this.drawShape = false;
    this.offset = {x:0,y:0};    
  }
  draw() {
    if (this.shape === undefined) return;
    if (this.isEnabled !== true) return;
    
    if (this.drawShape) {
      this.shape.draw();
    }
    
    let path = new Path2D();
    path.moveTo(this.shape.points[0].x, this.shape.points[0].y);
    for (let i = 1; i < this.shape.points.length; ++i) {
      path.lineTo(this.shape.points[i].x, this.shape.points[i].y);
    }    
    path.closePath();    
    ctx.clip(path, "nonzero");
  }
  update() {
    if (!this.isEnabled || !this.centerShape || !this.shape) return;
    // console.log(this.gameObject.image.src);    
    let goPos = this.gameObject.position;   
    // TODO: move path to center of sprite
    //let bb = this.shape.getBoundingBox();
    
    this.shape.moveTo(goPos.x + this.offset.x, goPos.y + this.offset.y, new Point(0, 0));
  }
}

class Collider extends GameComponent {
  constructor() {
    super();
    this.isTrigger = false;
    this.bounds = new BoundingBox();    
    this.layerMask = undefined;
  }
  isTouching(otherCollider) {
    return false;
  }
}

class PolygonCollider extends Collider {
    constructor(shape) {
      super();
      this.isTrigger = false;
      this.shape = shape;
      this.bounds = new BoundingBox();
      if (this.shape) {
        this.bounds = shape.getBoundingBox();
      }
    }
    isTouching(otherCollider) {
      if (!this.shape) return;

      if (this.gameObject && otherCollider && otherCollider.gameObject) {        
        if (this.layerMask && otherCollider.layer !== this.layerMask) {          
            return false;
        }        
        if (this.bounds.max.x == 0) this.bounds = this.shape.getBoundingBox();
        
        // first check if we are inside eachother's bounding box. otherwise theres no point of checking whether they touch
        let aSize = { width: this.bounds.max.x, height : this.bounds.max.y };
        let aPos  = { x: this.gameObject.position.x + this.gameObject.offset.x, y: this.gameObject.position.y + this.gameObject.offset.y};
        let bSize = { width: otherCollider.bounds.max.x, height: otherCollider.bounds.max.y };
        let bPos  = { x: otherCollider.gameObject.position.x + otherCollider.gameObject.offset.x, y: otherCollider.gameObject.position.y + otherCollider.gameObject.offset.y};          
        if(aPos.x + aSize.width >= bPos.x
          && aPos.x <= bPos.x + bSize.width
          && aPos.y + aSize.height >= bPos.y
          && aPos.y <= bPos.y + bSize.height) {          
          let pts = otherCollider.getPoints();                  
          for(let pt of pts) {
            if (this.shape.isPointInside(pt)) return true;
          }                        
        }
      }
      return false;
    }   
  getPoints() {
    return this.shape.points;
  }
}

class BoxCollider extends Collider {
    constructor() {
      super();
      this.isTrigger = false;
      this.bounds = new BoundingBox();
    }
    isTouching(otherCollider) {
      if (this.gameObject && otherCollider && otherCollider.gameObject) {
        if (this.layerMask && otherCollider.layer !== this.layerMask) {          
            return false;
        }
        
        let aSize = { width: this.bounds.max.x, height : this.bounds.max.y };
        let aPos  = { x: this.gameObject.position.x + this.gameObject.offset.x, y: this.gameObject.position.y + this.gameObject.offset.y};
        let bSize = { width: otherCollider.bounds.max.x, height: otherCollider.bounds.max.y };
        let bPos  = { x: otherCollider.gameObject.position.x + otherCollider.gameObject.offset.x, y: otherCollider.gameObject.position.y + otherCollider.gameObject.offset.y};          
        return aPos.x + aSize.width >= bPos.x
        && aPos.x <= bPos.x + bSize.width
        && aPos.y + aSize.height >= bPos.y
        && aPos.y <= bPos.y + bSize.height;          
      }
      return false;
    }
  getPoints() {
    return [      
      new Point(this.bounds.min.x, this.bounds.min.y), new Point(this.bounds.max.x, this.bounds.min.y), 
      new Point(this.bounds.max.x, this.bounds.min.y), new Point(this.bounds.max.x, this.bounds.max.y),
      new Point(this.bounds.max.x, this.bounds.max.y), new Point(this.bounds.min.x, this.bounds.max.y),
      new Point(this.bounds.min.x, this.bounds.max.y), new Point(this.bounds.min.x, this.bounds.min.y),            
    ];
  }
}

class BoxRenderer extends GameComponent {
    constructor() {
        super();
        this.size = { width: 0, height: 0 };
    }
    draw() { 
      if (this.isEnabled !== true) return;
      let camera = Camera.getMainCamera();
      ctx.save();
      ctx.beginPath();
      ctx.rect(
        camera.viewport.x + this.gameObject.position.x, 
        camera.viewport.y + this.gameObject.position.y, 
        this.size.width, 
        this.size.height);        
      ctx.strokeStyle = 'Red';
      ctx.stroke();
      ctx.closePath();
      ctx.restore();
    }
}

class RigidBody extends GameComponent {
    constructor() {
        super();
        this.velocity = { x: 0, y: 0 };
        this.force = { x: 0, y: 0 };  
        this.isStatic = false;        
        this.isGrounded = false;
        this.constraints = { freezePositionX: false, freezePositionY: false };
        this.ignoreCollisionPhysics = false;
    }
}

class GameObject {
    constructor() {
        this.position = { x: 0, y: 0 };
        this.rotation = 0;
        this.opacity = 1;
        this.isEnabled = true;
        this.isVisible = true;
        this.rigidBody = null;
        this.collider = null;
        this.renderer = null;
        this.parent   = null;
        this.isDestroyed = false;
        this.components = [];
        this.children   = [];
        this.name = '';
        this.tag = '';
        this.layer = '';
        this.offset = {x:0, y:0};        
        Physics.register(this);
    }  
  
    // get localPosition() {      
    getLocalPosition() {
      if (this.parent !== null) {
        return {
          x: this.position.x - this.parent.position.x,
          y: this.position.y - this.parent.position.y
        };
      }
      
      return {
        x: this.position.x,
        y: this.position.y
      };      
    }
  
    //set localPosition(value) {
    setLocalPosition(x, y) {
      if (this.parent !== null) {
        this.position = {
          x: this.parent.position.x + x,
          y: this.parent.position.y + y
        };
        return;
      }
      
      this.position = {
        x: value.x,
        y: value.y
      };      
    }
    
    destroy() {
  
      if (this.isDestroyed) return;
      this.isDestroyed = true;
      Physics.unregister(this);
      if (this.parent) {       
        this.parent.removeChild(this);
      }
    }    
    addComponent(component) {
      this.components.push(component);
      component.setGameObject(this);
      return component;
    }
    addChild(gameObject) {
      this.children.push(gameObject);
      gameObject.setParent(this);
      return gameObject;
    }
  
    removeChild(gameObject) {
      let index = this.children.indexOf(gameObject);
      gameObject.setParent(null);      
      this.children.remove(index);
    }
    getComponent(name) {
      for(let child of this.components) {
        if (child.constructor.name == name) {
          return child;
        }
      }
      return undefined;
    }
    setParent(gameObject) {
      this.parent = gameObject;
    }
    setRenderer(renderer) {
      if (this.renderer) {
        var index = this.components.indexOf(this.renderer);                   
        this.components.remove(index);
      }
      this.renderer = renderer;
      this.addComponent(this.renderer);
    }
    setRigidBody(rigidBody) {
      if (this.rigidBody) {
        var index = this.components.indexOf(this.rigidBody);                   
        this.components.remove(index);
      }
      this.rigidBody = rigidBody;
      this.addComponent(this.rigidBody);
    }
    setCollider(collider) {
      if (this.collider) {            
        var index = this.components.indexOf(this.collider);                   
        this.components.remove(index);          
      }
      this.collider = collider;
      this.addComponent(this.collider);
    }
    update() {   
      for(let i = 0; i < this.components.length; ++i) {
        this.components[i].update();
      }      
      for(let i = 0; i < this.children.length; ++i) {
        this.children[i].update();
      }
    }
    draw() {             
      for(let i = 0; i < this.components.length; ++i) {
        this.components[i].draw();
      }      
      for(let i = 0; i < this.children.length; ++i) {
        this.children[i].draw();
      }
    }
    onCollisionEnter(collider) { }
    onTriggerEnter(collider) { }
}

class ParticleSystem extends GameObject {
  constructor() {    
    super();
    this.isLooping = false;
    this.isEmitting = false;    
    this.startSize = 1;
    this.startDelay = 0;
    this.startSpeed = 5;
    this.startColor = "red";
    this.startLifetime = 1;
    this.startTime = 0;
    this.duration = 1.0;
    this.timer = this.duration;
    this.maxParticleCount = 10;
  }
  update() {
    if (!this.isEnabled) return;    
    super.update();
    // pass-1 update whether we should continue to emit particles
    if (this.isEmitting) {
      this.timer -= Time.deltaTime/1000;       
      if (this.timer <= 0) {
        this.timer = this.isLooping ? this.duration : 0;
        // if its still 0, then stop the emitting
        this.isEmitting = this.timer > 0;
      }
    }    
    // if we are still emitting, keep adding those particles!
    if (this.isEmitting) {
      this.addParticle();
      this.updateParticles();
    }
  }  
  addParticle() {
    if (this.children.length >= this.maxParticleCount) return;
    let velocity = new Point((Math.random()*0.5)-0.25, Math.random()*0.2); 
    let particle = new Particle(this.position.x, this.position.y, this.startLifetime, velocity, this.startColor, (Math.random() * 3)+1);
    this.addChild(particle);
  }  
  updateParticles() {
    let toRemove = this.children.filter(x => x.lifetime <= 0 || x.position.y >= canvas.height);    
    toRemove.forEach(x => x.destroy());
  }  
  destroyParticles() {
    let toRemove = [];    
    this.children.forEach(x => toRemove.push(particle));
    toRemove.forEach(x => x.destroy());
  }  
  draw() {
    if (!this.isEnabled) return;
    super.draw();
  }
  start() {
    this.destroyParticles();
    this.isEmitting = true;
    this.timer = this.duration;
    this.startTime = Time.time;
  }
  stop() {
    this.isEmitting = false;
  }  
  get particleCount() {
    return children.length;
  }
}

class Particle extends GameObject {
  constructor(startX, startY, life, velocity, color, size) {
    super();
    const rigidBody = new RigidBody();    
    rigidBody.velocity.x = velocity.x;
    rigidBody.velocity.y = velocity.y;
    this.size = size;
    this.color = color;
    this.lifetime = life;
    this.setRigidBody(rigidBody);        
    this.position.x = startX;
    this.position.y = startY;
  }
  update() {
    if (!this.isEnabled) return;
    super.update();
    this.lifetime -= Time.deltaTime/1000;
  }
  draw() {
    if (!this.isEnabled || !this.isVisible) return;
    super.draw();
    ctx.save();
    // console.log("draw particle at: " + this.position.x + "," + this.position.y);
    drawCircle(this.position.x, this.position.y, this.color, this.size);
    ctx.restore();    
  }
}

class Animation {
    constructor(name, interval = 150.0, animationFrames = [], playOnce = false, canInterrupt = true) {
        this.name = name;
        this.updateInterval = interval;
        this.playOnce = playOnce;
        this.interruptable = canInterrupt;
        this.isPlaying = false;
        this.updateTimer = 0.0;
        this.frameIndex = 0;
        this.frames = animationFrames;
    }

    update() {
        if (!this.isPlaying) return;
        if (this.frameIndex + 1 >= this.frames.length && this.playOnce) {
            this.isPlaying = false;
            this.frameIndex = 0;
            return;
        }
        this.updateTimer += Time.deltaTime;
        if (this.updateTimer >= this.updateInterval) {
            this.updateTimer = 0.0;
            let targetFrameIndex = (this.frameIndex + 1) % this.frames.length;
            let frame = this.getCurrentFrame();
            if (frame) {
                if (!frame.continueWhen) {
                    this.frameIndex = targetFrameIndex;
                    return;
                }
                if (frame.continueWhen() === true) {
                    this.frameIndex = targetFrameIndex;
                }
            }
        }
    }
  
    play() { this.isPlaying = true; }  
  
    stop() { this.isPlaying = false; }  
    
    addFrame(frame) { this.frames.push(frame); }
  
    addFrames(framesToAdd) {
        for (let i = 0; i < framesToAdd.length; ++i) {
            this.addFrame(framesToAdd[i]);
        }
    }      
  
    getCurrentFrame() {
        if (this.frames.length === 0) {
            return null;
        }
        return this.frames[this.frameIndex];
    }
    getFrameAt(index) {
        if (this.frames.length === 0 || index >= this.frames.length) {
            return null;
        }
        return this.frames[index];
    }
}

class AnimationFrame {
    constructor(x, y, width, height, continueWhen) {
      this.position = { x: x, y: y };
      this.size = { width: width, height: height };
      this.continueWhen = continueWhen;
    }
}

class Button extends GameObject {
  constructor() {
    super();
    this.states = [];
    this.states["default"] = {callbacks: []};    
    this.states["hover"]   = {callbacks: []};
    this.states["active"]  = {callbacks: []};  
    this.states["click"]  = {callbacks: []};      
    this.state = "default";
    this.borderOnInside = false;
    this.width = 150;
    this.height = 50;
    this.text = "Button 1";
    this.fontSize = 16;
    this.fontColor = Color.getWhite();
    this.font = "arial";
    this.background = new Color(255, 0, 0);
    this.border = new Color(0, 255, 0);
    this.borderWidth = 1;
    this.doubleBorder = false;
    this.doubleBorderDistance = 5;
    this.content = undefined; // appoint a gameobject and it will draw it as content :-)
    this.contentScale = 1.0;
    this.contentMargin = {top:0,left:0,right:0,bottom:0};
  }
  draw() {
    if (!this.isEnabled || !this.isVisible) return
    super.draw();
    
    this.drawButtonBase();    
    this.drawContent();
    this.drawText();    
  }
  
  drawButtonBase() {
    let fill   = this.background;
    let stroke = this.border;    
    switch (this.state) {
      case "hover":        
        fill   = fill.darker(22);
        stroke = stroke.darker(22);
        break;
      case "active":
        fill   = fill.darker(44);
        stroke = stroke.darker(44);
        break;
    }
    
    const bw =ctx.lineWidth;
    const fs =ctx.fillStyle;
    const ss =ctx.strokeStyle;
    
    ctx.save();    
    ctx.beginPath();
    ctx.lineWidth = this.borderWidth;
    ctx.fillStyle = fill.rgba();
    ctx.strokeStyle = stroke.rgba();
    ctx.rect(this.position.x, this.position.y, this.width, this.height);
    ctx.fill();
    
    if (this.borderOnInside === true) {
      ctx.beginPath();
      ctx.rect(this.position.x + this.borderWidth/2, 
               this.position.y + this.borderWidth/2, 
               this.width   - (this.borderWidth), 
               this.height  - (this.borderWidth));
    }
    ctx.stroke();
    
    if(this.doubleBorder === true) {
       const bd = this.doubleBorderDistance;
      ctx.beginPath();
    ctx.lineWidth = this.borderWidth;
    ctx.fillStyle = fill.rgba();
    ctx.strokeStyle = stroke.rgba();
    ctx.rect(this.position.x + bd, this.position.y + bd, this.width - bd*2, this.height - bd*2);
    ctx.fill();
    ctx.stroke();
  }
    
    
    ctx.restore();
    
    ctx.lineWidth = bw;
    ctx.fillStyle = fs;
    ctx.strokeStyle =ss;
  }
  
  drawContent() {
    if (!this.content) return;
    ctx.save();
        
    
    let x = this.position.x + this.contentMargin.left;
    let y = this.position.y + this.contentMargin.top;
    
    ctx.translate(x, y);
    ctx.scale(this.contentScale,this.contentScale);

    
    this.content.draw();
    ctx.restore();
  }
  
  drawText() {
    if (!this.text || this.text.length === 0) return;
    ctx.save();
    ctx.font = this.fontSize + "px " + this.font;    
    const size = ctx.measureText(this.text);    
    ctx.fillStyle = this.fontColor.rgba();
    ctx.fillText(this.text, this.position.x + (this.width / 2 - size.width/2), (this.position.y + this.fontSize) + (this.height/2 - this.fontSize/2));
    ctx.restore();
  }
  
  update() {
    if (!this.isEnabled) return;
    super.update();
    let oldState = this.state;
    let click = false;
    if (mouse.x >= this.position.x && mouse.x <= this.position.x + this.width &&
       mouse.y >= this.position.y && mouse.y <= this.position.y + this.height) {
      if (mouse.leftButton) {
        if (this.state !== "active") {
          this.state = "active";
        }
      } else {
        if (this.state !== "hover") {
          this.state = "hover";
          click = oldState === "active";
        }
      }
    } else if(this.state !== "default") {
      this.state = "default"
    }
    if (oldState !== this.state) {
      this.states[this.state].callbacks.forEach(x => x());      
      if (click) this.states["click"].callbacks.forEach(x => x());      
    }
  }
  
  on(state, callback) {
    this.states[state].callbacks.push(callback);
  }
}


class Sprite extends GameObject {
  constructor(img) {
    super();
    this.image = img;
    this.width= -1;
    this.height=-1;
    this.imageOffset = {x:0,y:0};
    this.scale = {x:1,y:1};    
    this.origin = {x:0,y:0};    
    this.isTiledRepeat = false;
  }
  static fromUrl(src) {
    const spriteImg = new Image();
    spriteImg.src = src;
    return new Sprite(spriteImg);
  }
  update() {
    if (!this.isEnabled) return;
    super.update();
  }  
  draw() {    
    if (!ctx || !this.isVisible || !this.isEnabled || !this.image) return;   
    
    ctx.save();
    super.draw();
    // ctx.restore();
    
    const w = this.image.width;
    const h = this.image.height;
    const cols = Math.floor(this.width / w) + 1;
    const rows = Math.floor(this.height / h) + 1;
    
    if (this.isTiledRepeat && !isNaN(cols) && !isNaN(rows) && cols > 0 && rows > 0 && cols < 1920 && rows < 1080) {  
      for(let x = 0; x < cols; x++) {
        for(let y = 0; y < rows; y++) {
          ctx.drawImage(this.image, x * w, y * h);
        }
      }
    } else {   
      let camera = Camera.getMainCamera();        
      if (this.width  <= 0) {
        this.width = this.image.width;
        this.height = this.image.height;
      }    

      const scaledWidth = this.width * this.scale.x;
      const scaledHeight = this.height * this.scale.y;    
      const bb = this.getBoundingBox();    
      const dx = this.origin.x > 0 ? -((bb.max.x - bb.min.x) * this.origin.x) : 0;
      const dy = this.origin.y > 0 ? -((bb.max.y - bb.min.y) * this.origin.y) : 0;     
      const renderX = camera.viewport.x + this.position.x + this.offset.x + this.imageOffset.x + dx;
      const renderY = camera.viewport.y + this.position.y + this.offset.y + this.imageOffset.y + dy;    

      // ctx.save();
      ctx.globalAlpha = this.opacity;

      if (this.rotation !== 0) {
        ctx.translate(renderX-dx, renderY-dy);
        ctx.rotate(this.rotation * Math.PI/180.0);
        ctx.drawImage(this.image, 0, 0, this.image.width, this.image.height, dx, dy, scaledWidth, scaledHeight);      
      } else {      

        ctx.drawImage(
          this.image,
          0,
          0,
          this.image.width,
          this.image.height,
          renderX,
          renderY,
          scaledWidth,
          scaledHeight);
      }    
    }
    
    ctx.restore(); // do restore again as we saved our context the first thing we did.
  } 
  getBoundingBox() {
    return new BoundingBox(
      new Point(this.position.x, this.position.y),
      new Point(this.position.x + (this.width * this.scale.x), this.position.y + (this.height * this.scale.y))
    ); 
  }
}

class AnimatedSprite extends GameObject {
    constructor(spritesheet) {
      super();
      this.spritesheet = spritesheet;
      this.animations = [];
      this.currentAnimation = null;
      this.flipHorizontal = false;
      this.flipVertical = false;
    }
    addAnimation(animation) {
      this.animations.push(animation);
    }
    playAnimation(key) {
      if (this.currentAnimation) {
        if (!this.currentAnimation.interruptable && this.currentAnimation.isPlaying) {
          return;
        }
        this.currentAnimation.stop();
      }
      let targetAnimation = this.animations.find(x => x.name == key);
      this.currentAnimation = targetAnimation;
      this.currentAnimation.play();
    }
    update() {
      if (!this.isEnabled) {
        return;
      }
      if (this.currentAnimation) {
        this.currentAnimation.update();
      }
      super.update();
    }
    draw() {
      if (!ctx || !this.isVisible || !this.isEnabled || !this.currentAnimation)
        return;      
      let frame = this.currentAnimation.getCurrentFrame();
      if (!frame) return;     
      ctx.save();     
      super.draw();  
      if (this.collider) this.offset.x = (this.collider.bounds.max.x/2);       
      let camera = Camera.getMainCamera();       
      if (this.flipHorizontal) {
        ctx.translate(camera.viewport.x + (this.position.x + this.offset.x + this.collider.bounds.max.x), this.position.y);
        ctx.scale(-1, 1);
      } else {          
        ctx.translate(this.position.x + ((-this.offset.x)+this.collider.bounds.max.x), this.position.y);
      }              
      ctx.globalAlpha = this.opacity;
      ctx.drawImage(
        this.spritesheet,
        frame.position.x,
        frame.position.y,
        frame.size.width,
        frame.size.height,
        this.flipHorizontal ? 0 : camera.viewport.x,
        camera.viewport.y,
        frame.size.width,
        frame.size.height);
      ctx.restore();
    }
}

class Scene extends GameObject {
  constructor() {
    super();
  }
  update() {
    super.update();
  }
  draw() {
    super.draw();
  }
}

function getMousePos(element, evt) {
  var rect = element.getBoundingClientRect();
  return {
    x: evt.clientX - rect.left,
    y: evt.clientY - rect.top
  };
}

function getTouchPos(canvas, evt) {
  var rect = element.getBoundingClientRect();
  return {
    x: evt.touches[0].clientX - rect.left,
    y: evt.touches[0].clientY - rect.top
  };  
}

function run(time) {  
  Time.deltaTime = (time - Time.time) * Time.timeScale;
  Time.deltaTimeUnscaled = time - Time.time;  
  Time.time = time;
  Physics.update();
  if(onUpdate) onUpdate();
  if(onDraw) onDraw();  
  Time.frameCount++;
  window.requestAnimationFrame(run);  
}

function clear(clearStyle) {
  if (isWebGl) {
    ctx.clearColor(0,0,0.8,1);
    ctx.clear(gl.COLOR_BUFFER_BIT);
    return;
  }   
  if (clearStyle) {
    ctx.fillStyle = clearStyle;  
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  } else {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  }
}

function mouseMove(evt) {
  let pos = getMousePos(canvas, evt);
  mouse.x = pos.x;
  mouse.y = pos.y;
}

function touchMove(evt) {
  evt.preventDefault();
  let pos = getTouchPos(canvas, evt);
  mouse.x = pos.x;
  mouse.y = pos.y;
}

function mouseDown(evt) {
  if (evt.button === 0) mouse.leftButton = true;  
  if (evt.button === 1) mouse.rightButton = true;  
  if (evt.button === 3) mouse.middleButton = true;
}

function mouseUp(evt) {
  if (evt.button === 0) mouse.leftButton = false;  
  if (evt.button === 1) mouse.rightButton = false;  
  if (evt.button === 3) mouse.middleButton = false;  
}
