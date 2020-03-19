setGravityMultiplier(0.025);
const score  = document.querySelector(".score");
const healthContainer = document.querySelector(".le-health");
const splitSpeed = 0.12;
const splatterSprite = Sprite.fromUrl(
      "./blood.png");

let isSlicing = true;

const zombieHeadImages = [
  "./virus_PNG4.png"
];

const humanHeadImages = [
  "./toilet_paper.png"
];

function createPolySprite(img, shape, x, y) {
    x = x || 0;
    y = y || 0;

    let bb = shape.getBoundingBox();

    const rigidBody = new RigidBody();
    rigidBody.ignoreCollisionPhysics = true; 

    let test = new Sprite(img);    
    test.setRigidBody(rigidBody);
    test.position.x = x;
    test.position.y = y;
    test.width = img.width;
    test.height = img.height;

    let mask = new Mask();
    mask.offset = { x: 0, y: 0 };
    mask.centerShape = true;
    mask.drawShape = false;
    mask.shape = shape;
    test.addComponent(mask);
    return test;
}

class GameBackground extends GameObject {
  constructor() {
    super();    
    this.bgSprite = Sprite.fromUrl("./13964_00380440_001.jpg");
    this.bgSprite.isTiledRepeat = true;    
  }
  addStain(x, y) {    


    const addCount = 4;
    for(let i = 0; i < addCount; ++i) {
      const fadeOutEffect = new FadeOut();
      fadeOutEffect.destroyObjectOnCompletion = true;      
      const px = x + (Math.random() * 100) - 50;
      const py = y + (Math.random() * 100) - 50;      
      const stain = new Sprite(splatterSprite.image);
      stain.position.x = px;
      stain.position.y = py;        
      stain.opacity = 0.5;
      stain.scale = {x:0.5,y:0.5};
      stain.origin = {x:0.5,y:0.5};
      stain.rotation =Math.random() * 90;                  
      stain.addComponent(fadeOutEffect);         
      fadeOutEffect.start();
      this.addChild(stain);
    }      
  }
  draw() {      
    this.bgSprite.draw();    
    super.draw();
  }
  update() {
    let img = this.bgSprite.image;
    let aspect = img.width / img.height;    
    this.bgSprite.width = canvas.width;
    this.bgSprite.height = canvas.height;
    if (this.bgSprite.width > this.bgSprite.height) {
      this.bgSprite.height = this.bgSprite.width * aspect;
    } else {
      this.bgSprite.width = this.bgSprite.height * aspect;
    }    
    super.update();
  }
}

class Game extends GameObject {
  constructor() {
    super();
    this.background = new GameBackground();   
    this.health = 3;
    this.score = 0;
  }
  draw() {    
    this.background.draw();
    super.draw();
  }
  update() {    
    this.background.update();    
    super.update();
    score.innerHTML = this.score;
    setGravityMultiplier(0.025);
  }
  addBloodStain(x, y) {        
    this.background.addStain(x, y);
  }
  addObject() {
    this.addChild(new ZombieHead());

    let n = randomInteger(1,5);

    if (n == 4) this.addChild(new HumanHead());

    function randomInteger(min, max) {
      
      let rand = min - 0.5 + Math.random() * (max - min + 1);
      return Math.round(rand);
    }

  }
  removeHealth() {
    this.health--;
        
    healthContainer.removeChild(healthContainer.childNodes[healthContainer.childNodes.length-1]);      
       
    if (this.health <= 0) {
      let toRemove = [];
      this.children.forEach(x=>toRemove.push(x));      
      this.resetHealth();
      this.resetScore();
      toRemove.forEach(x => x.destroy());
    }
  }
  resetScore() {
    this.score = 0;
  }
  resetHealth() {
    healthContainer.innerHTML = "<div class='health'></div><div class='health'></div><div class='health'></div>";
    this.health = 3;
  }
  addHealth() {
    healthContainer.innerHTML = healthContainer.innerHTML + "<div class='health'></div>";
    this.health += 1;
  }
}

class SliceableObject extends GameObject {
  constructor(sprite, shape) {
    super();    
    // we could scale stuff based on the device zoom
    // window.devicePixelRatio
    // todo for later: ^
    
    shape.scale(0.5);    
    const rb = new RigidBody(); 
    const pc = new PolygonCollider(); 
    pc.shape = shape;    
    rb.ignoreCollisionPhysics = true;
    rb.velocity.y -=0.5// + (game.score/5000);
    rb.velocity.x = (Math.random() * splitSpeed) - (splitSpeed/2);
    const mask = new Mask();
    mask.offset = { x: 0, y: 0 };    
    mask.centerShape = true;
    mask.drawShape = false;
    mask.shape = shape;
    
    // this.score = 0;         
    this.mask = mask;
    this.shape = shape;    
    this.sprite = sprite;
    this.sprite.addComponent(mask);    

    let n =  randomInteger(0, canvas.width/2)

    this.sprite.position.x = canvas.width/2-this.sprite.width/2 - n;
    this.sprite.position.y = canvas.height-this.sprite.height;
    this.sprite.setCollider(pc);
    this.sprite.setRigidBody(rb);
    this.sliced = false;

    function randomInteger(min, max) {
      let rand = min - 0.5 + Math.random() * (max - min + 1);
      return Math.round(rand);
    }

  }
  
  draw() {
    if (!this.isEnabled || !this.isVisible) return;
    super.draw();
    this.sprite.draw();    
    
  }
  update() {
    if (!this.isEnabled) return;
    super.update();
    this.sprite.update();
    // is the object out of view? destroy it! This should also reduce our life by one.
    if (this.sprite.position.y > canvas.height + this.sprite.height && 
      this.sprite.position.x > this.sprite.width &&
      this.sprite.position.x < canvas.width + this.sprite.width) {
      if (!this.sliced && this.name == 'virus') game.removeHealth();
      if (!this.sliced && this.name == 'toilet') {
        game.score += 100;
        game.addHealth();
      }  
      this.destroy();
    }
  }  
  slice(scene, line) {
    //if (this.sliced) return;
    this.sliced = true;
    const outputPolys = [];
    const toRemove = [];
    const toAdd = [];
    let leftSide = 0;
    let rightSide = 1;  
    let midPoint = {};
    let index = 0;
    
    let polygon = this.shape;
    let m = this.sprite;
    let local = m.getLocalPosition();
    let intersections = Intersection.check(polygon, line);
    if (intersections && intersections.length > 1) {
      // time for some magic code that will create new gameobjects out of the sliced polygons
      // and align the sprite images to their proper position
      let newPolys = Intersection.slice(polygon, intersections);  
      if (newPolys.length != 2)  // only allow when we got exactly 2 polygons. 
        return;                // Other cases are not handled right now

      // possible solution for having more than 2 intersection points are to first do the slice on the first two points
      // then do another slice between 2 and 3rd point.            
      
      let pix = 0;
      newPolys.forEach(x => outputPolys.push(x));
      let pa = newPolys[0];
      let pb = newPolys[1];
      let pabb = pa.getBoundingBox();
      let pbbb = pb.getBoundingBox();

      if (pabb.max.x > pbbb.max.x) {
        leftSide = 1;
        rightSide = 0;
      }
      let side = 0;
      newPolys.forEach(x => {
        let bb = x.getBoundingBox();
        let sprite = createPolySprite(this.sprite.image, x, bb.min.x, bb.min.y);
        let offx = bb.min.x - local.x;
        let offy = bb.min.y - local.y;
        sprite.imageOffset.x = m.imageOffset.x + -offx;// m.imageOffset.x;
        sprite.imageOffset.y = m.imageOffset.y + -offy;//m.imageOffset.y;
        sprite.rigidBody.velocity.x = side == leftSide ? -splitSpeed : splitSpeed;
        sprite.rigidBody.velocity.x *= 2;
        toAdd.push(sprite);
        side++;
      });
      
      if(index==0) {
        let p1 = intersections[0];
        let p2 = intersections[1];
        midPoint = { x: (p1.x+p2.x)/2, y: (p1.y+p2.y)/2 };
      }
      index++;
    }  

    for (let child of toAdd) {
      scene.addChild(child);
    }
    
    this.destroy();
  }
}
class ZombieHead extends SliceableObject {
  constructor() {
    super(Sprite.fromUrl(zombieHeadImages[0]), createZombieHeadPolygon());
    this.score = 100;
    this.name = 'virus'
  }
  draw() {
    if (!this.isEnabled || !this.isVisible) return;
    super.draw();
  }
  update() {
    if (!this.isEnabled) return;
    super.update();
  }    
}

class HumanHead extends SliceableObject {
  constructor() {
    super(Sprite.fromUrl(humanHeadImages[0]),createHumanHeadPolygon());
    this.name = 'toilet'
    this.score = -500;
  }
  draw() {
    if (!this.isEnabled || !this.isVisible) return;
    super.draw();
  }
  update() {
    if (!this.isEnabled) return;
    super.update();
  }    
}

class SlicePoint {
  constructor(x, y, life) {
    this.x = x;
    this.y = y;
    this.lifeTimer = life;
  }
  update() {
    this.lifeTimer -= Time.deltaTime / 1000;
  }
}

class Slicer extends GameObject {
  constructor() {
    super();
    this.game = undefined;
    this.points = [];
    this.minDistance = 30; // pixels
    this.trailLife = 0.1;
  }  
  
  draw() {
    super.draw();      
    if (this.points.length > 1) {
      const lines = this.getLines();
      lines.forEach(x => x.draw("red"));
    }            
  }
      
  update(game) {
    this.game = game;
    super.update();
    const dist = (p1, p2) => {
      const a = p1.x - p2.x;
      const b = p1.y - p2.y;
      return Math.sqrt(a * a + b * b);
    }
    const toRemove = [];
    this.points.forEach(x => { 
      x.update(); 
      if (x.lifeTimer <= 0) toRemove.push(x);
    });
        
    if (mouse.leftButton) {
      if (this.points.length == 0 || dist(this.points[0], mouse) >= this.minDistance) {
        this.addPoint();
      }      
    }
    
    toRemove.forEach(x => { 
      let index = this.points.indexOf(x);
      this.points.remove(index);
    });
              
    this.updateSlice(game);
    
  }
  
  updateSlice(game) {
    if (!game) return;     
    let slicerLines = this.getLines();
    
    for(let obj of game.children) {
      let mask = obj.mask;
      if (!mask) continue;                       
      let slicePoints = [];
      slicerLines.forEach(line => Intersection.check(mask.shape, line).forEach(x => slicePoints.push(x)));
      if (slicePoints.length > 1) {
        // we will only take the two first ones anyway.
        let sliceLine = new Line(slicePoints[0], slicePoints[1]);                
        let splatterPos = sliceLine.getMidPoint();        
        obj.slice(game, sliceLine);
        game.score += obj.score;
        if (obj.name == 'virus') game.addBloodStain(splatterPos.x, splatterPos.y);
        
      }
    }         
  }
  
  addPoint() {
    this.points.splice(0, 0, new SlicePoint(mouse.x, mouse.y, this.trailLife));
  }
  getLines() {
    let pts = [];
    let lines=[];
    let idx = 0;
    this.points.forEach(x=>pts.push(new Point(x.x, x.y)));
    for(let i = 1; i < pts.length; i++) {
      let line = new Line(pts[i-1], pts[i]);
      line.index = idx++;
      lines.push(line);
    }
    return lines;    
  }  
}

function createZombieHeadPolygon() {
  return new Polygon([new Point(4,14),new Point(48,2),new Point(116,0),new Point(154,17),new Point(168,46),new Point(173,85),new Point(166,124),new Point(154,141),new Point(106,158),new Point(66,158),new Point(25,148),new Point(5,104),new Point(0,50),new Point(4,14)]);
}
function createHumanHeadPolygon() {
  return new Polygon([new Point(4,14),new Point(48,2),new Point(116,0),new Point(154,17),new Point(168,46),new Point(173,85),new Point(166,124),new Point(154,141),new Point(106,158),new Point(66,158),new Point(25,148),new Point(5,104),new Point(0,50),new Point(4,14)]);
}

const slicer = new Slicer();// new Line(new Point(0,0), new Point(0,0));

//const bloodSliceSprite = Sprite.fromUrl(
//  "https://s3-us-west-2.amazonaws.com/s.cdpn.io/163870/blood-splatter-1.png");
const game = new Game();

const draw   = () => {  
  clear();
  game.draw();  
  if (isSlicing) 
    slicer.draw();        
};

const update = () => {
  game.update();    
  slicer.update(game);  
};

const resize = () => {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
};

setup(".le-canvas", draw, update, resize);


window.addEventListener("mousedown", e => isSlicing = true, false);
window.addEventListener("mouseup", e => isSlicing = false, false);

window.addEventListener("touchstart", e => { 
    e.preventDefault();
    let rect = canvas.getBoundingClientRect();
    let pos = {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
    };
    mouse.x = pos.x;
    mouse.y = pos.y;
  
  isSlicing = true 
  // alert("start " + mouse.x + ", " + mouse.y) ;
}, false);
window.addEventListener("touchend", e => { 
  e.preventDefault();    
  isSlicing = false; 
  // alert("end " + mouse.x + ", " + mouse.y) ;
}, false);
window.addEventListener("touchmove", e => { 
    e.preventDefault();
    let rect = canvas.getBoundingClientRect();
    let pos = {
        x: e.touches[0].clientX - rect.left,
        y: e.touches[0].clientY - rect.top
    };
    mouse.x = pos.x;
    mouse.y = pos.y;
  
  
  isSlicing = true; 
  // alert("move " + mouse.x + ", " + mouse.y) ;
}, false);

canvas.addEventListener("click", e => {
  // game.addBloodStain();
  // game.addObject();
},false);

const spawnHead = () => {
  game.addObject();
  
  setTimeout(spawnHead, (1000-(game.score/5000)) + (Math.random() * 3500-(game.score/500)));
};

spawnHead();