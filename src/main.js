import * as THREE from 'three';
import { LABELS, TIMELINE, FONT } from './config.js';
const W=1080,H=1920,DUR=10;
const cv=document.getElementById('c'),ctx=cv.getContext('2d');
const glowC=document.createElement('canvas');glowC.width=W/2;glowC.height=H/2;const gc=glowC.getContext('2d');
const ease=x=>x<0?0:x>1?1:x*x*(3-2*x);
const easeIO=x=>x<0?0:x>1?1:(x<.5?4*x*x*x:1-Math.pow(-2*x+2,3)/2);
const clamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x));
function rng(seed){return function(){seed|=0;seed=seed+0x6D2B79F5|0;let t=Math.imul(seed^seed>>>15,1|seed);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

/* ================= EXPLORE STATE (focus / scroll modes, driven by app.js) =================
   FX.v  : focus position 0..6  (0 = overview, 1..6 = HUD parts, fractions glide between parts)
   FX.ht : HUD clock override (null = use timeline t)  FX.lineT : seconds since the active part changed */
export const FX={on:false,v:0,target:0,act:-1,lineT:99,ht:null,idle:0,pt:3.6,
  orbit:{yaw:0,pitch:0,zoom:1,vy:0},   // free-orbit state (drag / wheel / tour spin)
  pad:null};                           // live gamepad state {a:[4 axes], b:[button values]} set by app.js
export const actIndex=v=>v<.5?-1:Math.min(6,Math.max(1,Math.round(v)))-1;
const FI={amt:0,a:0,b:0,f:0,act:-1,sx:W/2,sy:H/2,fw:400,fh:400,zoom:1};

/* ================= THREE.JS SCENE ================= */
const gl=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});
gl.setPixelRatio(1);gl.setSize(W,H,false);
gl.outputColorSpace=THREE.SRGBColorSpace;gl.toneMapping=THREE.ACESFilmicToneMapping;
gl.setClearColor(0x000000,1);
const scene=new THREE.Scene();
const cam=new THREE.PerspectiveCamera(30,W/H,0.1,200);

/* studio environment: strip lights that sweep across the glossy shell as it spins */
const envScene=new THREE.Scene();envScene.background=new THREE.Color(0x010204);
function strip(w,h,pos,rgb,k){
  const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color:new THREE.Color(rgb[0]*k,rgb[1]*k,rgb[2]*k),side:THREE.DoubleSide}));
  m.position.set(...pos);m.lookAt(0,0,0);envScene.add(m);
}
strip(2,16,[-13,2,-7],[1,1,1],9);      // back-left white strip
strip(2,16,[13,2,-7],[1,1,1],9);       // back-right white strip
strip(16,2,[0,13,3],[1,1,1],5);        // top softbox
strip(12,7,[0,3,16],[1,1,1],1.6);      // soft front key
strip(12,7,[0,3,-16],[1,1,1],1.6);     // soft rear key (for the back view)
strip(1.6,10,[-12,-4,6],[.15,.5,1],10); // blue low-left
strip(1.6,10,[12,-4,6],[.15,.5,1],10);  // blue low-right
strip(1.6,10,[-12,-4,-6],[.15,.5,1],8);
strip(1.6,10,[12,-4,-6],[.15,.5,1],8);
const pm=new THREE.PMREMGenerator(gl);
scene.environment=pm.fromScene(envScene,0.03).texture;
const key=new THREE.DirectionalLight(0xffffff,.6);key.position.set(-6,8,12);scene.add(key);
const rimL=new THREE.DirectionalLight(0x3a8cff,2.2);rimL.position.set(9,-2,-8);scene.add(rimL);
const rimR=new THREE.DirectionalLight(0x3a8cff,1.6);rimR.position.set(-9,-2,-8);scene.add(rimR);

/* materials */
const shell=new THREE.MeshPhysicalMaterial({color:0xdfe4ec,roughness:.26,metalness:0,clearcoat:1,clearcoatRoughness:.06,envMapIntensity:.9});
const dark=new THREE.MeshPhysicalMaterial({color:0x0b0d12,roughness:.28,metalness:.1,clearcoat:1,clearcoatRoughness:.1,envMapIntensity:.7});
const darkRough=new THREE.MeshStandardMaterial({color:0x14171d,roughness:.5,metalness:.2,envMapIntensity:1});
const blue=new THREE.MeshBasicMaterial({color:new THREE.Color(.25,.8,2.4)});
const blueDim=new THREE.MeshBasicMaterial({color:new THREE.Color(.15,.5,1.4)});

/* geometry helpers (canvas-style coords -> world units) */
const P=(x,y)=>[x/100,-(y-10)/100];
const F=0.95; // front surface z
function bodyShape(){
  const R=[[0,-165],[120,-185,220,-180,300,-170],[350,-165,385,-130,385,-80],[395,-20,410,60,400,120],
           [395,190,370,225,330,215],[280,205,250,150,230,110],[205,70,170,60,130,70],[80,85,40,75,0,75]];
  const sh=new THREE.Shape();let s0=P(0,-165);sh.moveTo(s0[0],s0[1]);
  for(let i=1;i<R.length;i++){const r=R[i],a=P(r[0],r[1]),b=P(r[2],r[3]),c=P(r[4],r[5]);sh.bezierCurveTo(a[0],a[1],b[0],b[1],c[0],c[1])}
  for(let i=R.length-1;i>=1;i--){
    const s=R[i],p=R[i-1];
    const a=P(-s[2],s[3]),b=P(-s[0],s[1]),c=P(-p[p.length-2],p[p.length-1]);
    sh.bezierCurveTo(a[0],a[1],b[0],b[1],c[0],c[1]);
  }
  return sh;
}
function rrShape(w,h,r){ // centered rounded rect, size in canvas units
  w/=100;h/=100;r/=100;const x=-w/2,y=-h/2,s=new THREE.Shape();
  s.moveTo(x+r,y);s.lineTo(x+w-r,y);s.quadraticCurveTo(x+w,y,x+w,y+r);s.lineTo(x+w,y+h-r);s.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  s.lineTo(x+r,y+h);s.quadraticCurveTo(x,y+h,x,y+h-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;
}
const ex=(shape,depth,b=0.02,seg=4)=>new THREE.ExtrudeGeometry(shape,{depth,bevelEnabled:b>0,bevelThickness:b,bevelSize:b,bevelSegments:seg,curveSegments:32});
function place(mesh,cx,cy,z){const p=P(cx,cy);mesh.position.set(p[0],p[1],z);return mesh}

const RIGS=[]; // one per controller instance (real + mirrored reflection): moving parts for the gamepad
function makeController(){
  const g=new THREE.Group();
  const rig={sticks:[],faces:[],dpad:[],bump:[],trig:[]};RIGS.push(rig);
  // main shell
  const bg=new THREE.ExtrudeGeometry(bodyShape(),{depth:1.2,bevelEnabled:true,bevelThickness:.35,bevelSize:.3,bevelOffset:-.3,bevelSegments:12,curveSegments:48});
  bg.translate(0,0,-.6);g.add(new THREE.Mesh(bg,shell));
  // front dark face plate
  g.add(place(new THREE.Mesh(ex(rrShape(380,255,70),.05,.03),dark),0,-22,F-.01));
  // touchpad + glowing strip
  g.add(place(new THREE.Mesh(ex(rrShape(240,105,22),.03,.02),new THREE.MeshPhysicalMaterial({color:0x05070a,roughness:.15,clearcoat:1,envMapIntensity:1.5})),0,-77,F+.06));
  g.add(place(new THREE.Mesh(new THREE.BoxGeometry(2.0,.09,.05),blue),0,-43,F+.12));
  // thumbsticks
  for(const sx of[-105,105]){
    const base=new THREE.Mesh(new THREE.CylinderGeometry(.58,.62,.1,48).rotateX(Math.PI/2),darkRough);place(base,sx,42,F+.1);g.add(base);
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.55,.018,12,64),blueDim);place(ring,sx,42,F+.16);g.add(ring);
    const cap=new THREE.Mesh(new THREE.CylinderGeometry(.4,.46,.3,48).rotateX(Math.PI/2),dark);place(cap,sx,42,F+.26);g.add(cap);
    const cring=new THREE.Mesh(new THREE.TorusGeometry(.3,.012,8,48),new THREE.MeshBasicMaterial({color:0x2a3340}));place(cring,sx,42,F+.42);g.add(cring);
    rig.sticks.push({side:sx<0?0:1,cap,ring,cr:cring,cx:cap.position.x,cy:cap.position.y,rx:ring.position.x,ry:ring.position.y,crx:cring.position.x,cry:cring.position.y});
  }
  // face buttons (plain, no symbols)
  for(const[bx,by]of[[235,-95],[235,-25],[200,-60],[270,-60]]){
    const b=new THREE.Mesh(new THREE.CylinderGeometry(.17,.18,.1,32).rotateX(Math.PI/2),dark);place(b,bx,by,F+.06);g.add(b);rig.faces.push({m:b,z:b.position.z,i:[0,3,2,1][rig.faces.length]});
    const r=new THREE.Mesh(new THREE.TorusGeometry(.17,.01,8,32),blueDim);place(r,bx,by,F+.11);g.add(r);rig.faces[rig.faces.length-1].r=r;
  }
  // d-pad
  for(const[w,h]of[[.22,.68],[.68,.22]]){const d=new THREE.Mesh(new THREE.BoxGeometry(w,h,.1),dark);place(d,-234,-52,F+.06);g.add(d);rig.dpad.push(d)}
  // small center buttons
  for(const sx of[-155,155]){const b=new THREE.Mesh(new THREE.BoxGeometry(.3,.1,.05),darkRough);place(b,sx,-113,F+.06);g.add(b)}
  // shoulder bumpers (front lip) & triggers (rear)
  for(const m of[-1,1]){
    const bm=new THREE.Mesh(new THREE.BoxGeometry(1.55,.26,.75),dark);bm.position.set(m*2.35,1.78,.2);bm.rotation.z=-m*.16;g.add(bm);rig.bump.push({m:bm,i:m<0?4:5});
    const tr=new THREE.Mesh(new THREE.BoxGeometry(1.3,.38,.85),dark);tr.position.set(m*2.5,1.62,-.5);tr.rotation.z=-m*.2;g.add(tr);rig.trig.push({m:tr,i:m<0?6:7});
    const tl=new THREE.Mesh(new THREE.BoxGeometry(1.0,.04,.05),blueDim);tl.position.set(m*2.45,1.84,-.5);tl.rotation.z=-m*.2;g.add(tl);
  }
  // rear plate with glowing light bars
  const rg=new THREE.Mesh(ex(bodyShape(),.04,.03),dark);rg.scale.set(.78,.74,1);rg.position.set(0,.1,-F-.035);g.add(rg);
  for(const y of[.55,-.1]){const bar=new THREE.Mesh(new THREE.BoxGeometry(2.4,.07,.05),blue);bar.position.set(0,y,-F-.08);g.add(bar)}
  return g;
}
const FLOOR=-2.15,SC=.78;
const root=new THREE.Group();root.scale.setScalar(SC);root.add(makeController());scene.add(root);
// mirrored copy for the glossy floor reflection
const mroot=new THREE.Group();mroot.position.y=2*FLOOR;mroot.scale.y=-1;
const mInner=new THREE.Group();mInner.scale.setScalar(SC);mInner.add(makeController());mroot.add(mInner);scene.add(mroot);
// floor: dark veil over the reflection + soft blue glow
const veil=new THREE.Mesh(new THREE.PlaneGeometry(80,80).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({color:0x000000,transparent:true,opacity:.80,depthWrite:false}));
veil.position.y=FLOOR;scene.add(veil);
const gcan=document.createElement('canvas');gcan.width=gcan.height=256;{const g=gcan.getContext('2d'),r=g.createRadialGradient(128,128,0,128,128,128);r.addColorStop(0,'rgba(60,150,255,.9)');r.addColorStop(.4,'rgba(30,100,230,.35)');r.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=r;g.fillRect(0,0,256,256)}
const glow=new THREE.Mesh(new THREE.PlaneGeometry(14,14).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(gcan),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:.5}));
glow.position.y=FLOOR+.01;scene.add(glow);


/* ================= FINISHES (live page only) ================= */
export const FINISHES={
  arctic:  {name:'Arctic',   shell:0xdfe4ec, accent:[.25,.80,2.4], rim:0x3a8cff, glow:'60,150,255',  ui:'#5ff1ff'},
  midnight:{name:'Midnight', shell:0x14171f, accent:[.10,1.6,1.9], rim:0x35d6ff, glow:'40,220,255',  ui:'#5ff1ff'},
  crimson: {name:'Crimson',  shell:0xa8101c, accent:[2.4,.55,.25], rim:0xff5a3a, glow:'255,110,60',  ui:'#ff9a6a'},
  violet:  {name:'Violet',   shell:0x5b34c8, accent:[1.9,.45,2.4], rim:0xc05cff, glow:'190,90,255',  ui:'#d6a0ff'},
};
export function setFinish(id){
  const f=FINISHES[id];if(!f)return;
  shell.color.setHex(f.shell);
  blue.color.setRGB(...f.accent);blueDim.color.setRGB(f.accent[0]*.6,f.accent[1]*.6,f.accent[2]*.6);
  rimL.color.setHex(f.rim);rimR.color.setHex(f.rim);
  const g=gcan.getContext('2d'),r=g.createRadialGradient(128,128,0,128,128,128);
  r.addColorStop(0,`rgba(${f.glow},.9)`);r.addColorStop(.4,`rgba(${f.glow},.35)`);r.addColorStop(1,'rgba(0,0,0,0)');
  g.clearRect(0,0,256,256);g.fillStyle=r;g.fillRect(0,0,256,256);glow.material.map.needsUpdate=true;
  document.documentElement.style.setProperty('--cy',f.ui);
}

/* ================= LIVE GAMEPAD (moves the real parts of the model) ================= */
let padWas=false;
function applyPad(p){
  if(!p&&!padWas)return;padWas=!!p;
  const B=i=>(p&&p.b[i])||0,A=i=>(p&&p.a[i])||0;
  for(const r of RIGS){
    for(const s of r.sticks){
      const ax=A(s.side*2),ay=A(s.side*2+1);
      s.cap.position.set(s.cx+ax*.20,s.cy-ay*.20,s.cap.position.z);
      s.ring.position.set(s.rx+ax*.09,s.ry-ay*.09,s.ring.position.z);
      s.cr.position.set(s.crx+ax*.26,s.cry-ay*.26,s.cr.position.z);
      s.cap.rotation.set(ay*.25,ax*.25,0);
    }
    for(const f of r.faces){const v=B(f.i);f.m.position.z=f.z-v*.05;if(f.r){f.r.scale.setScalar(1+.35*v);f.r.position.z=f.z+.05-v*.05}}
    for(const d of r.dpad)d.rotation.set((B(13)-B(12))*.2,(B(15)-B(14))*.2,0);
    for(const b of r.bump)b.m.rotation.x=.28*B(b.i);
    for(const t of r.trig)t.m.rotation.x=-.4*B(t.i);
  }
}

/* ================= TIMELINE ================= */
const SPIN0=TIMELINE.spinStart,SPIN1=TIMELINE.spinEnd;
function spinAngle(t){
  const sway=.14*Math.sin(t*1.1)*(1-ease((t-3.0)/.6))+.05*Math.sin(t*.9)*ease((t-8.7)/1);
  return sway+Math.PI*2*easeIO((t-SPIN0)/(SPIN1-SPIN0));
}
const Wa=new THREE.Vector3(),Wb=new THREE.Vector3(),Cf=new THREE.Vector3(),LK=new THREE.Vector3();
function wpt(i,out){const c=CALLS[i],q=c.fp||c.p,p=P(q[0],q[1]);out.set(p[0],p[1],q[2]);return root.localToWorld(out)}
function setPose(t){
  const k=ease(t/DUR);
  root.position.set(0,.2+Math.sin(t*1.2)*.07,0);
  root.rotation.set(-.10+.03*Math.sin(t*.8),spinAngle(t),0);
  if(FX.on){root.position.y+=Math.sin(FX.idle*1.3)*.05;root.rotation.y+=.035*Math.sin(FX.idle*.7)+FX.orbit.yaw;root.rotation.x+=.015*Math.sin(FX.idle*.9)+FX.orbit.pitch}
  mInner.position.copy(root.position);mInner.rotation.copy(root.rotation);
  applyPad(FX.pad);
  cam.position.set(Math.sin(t*.25)*.4,1.5+.5*k,30-4.2*k);
  LK.set(0,-.45,0);
  root.updateMatrixWorld(true);
  const d0=cam.position.distanceTo(LK),v=FX.on?FX.v:0;
  FI.amt=0;FI.act=actIndex(v);
  if(v>0){ // focus: dolly the camera onto the (interpolated) part
    FI.amt=ease(Math.min(v,1));
    const x=Math.max(v,1)-1;FI.a=Math.min(5,Math.floor(x));FI.b=Math.min(5,FI.a+1);FI.f=FI.a===FI.b?0:x-FI.a;
    wpt(FI.a,Wa);wpt(FI.b,Wb);Wa.lerp(Wb,FI.f);
    const A=CALLS[FI.a],B=CALLS[FI.b],m=(p,q)=>p+(q-p)*FI.f;
    FI.fw=m(A.fw,B.fw);FI.fh=m(A.fh,B.fh);
    Cf.set(Wa.x+.3,Wa.y+.2,Wa.z+m(A.D,B.D));
    cam.position.lerp(Cf,FI.amt);LK.lerp(Wa,FI.amt);
  }
  if(FX.on&&FX.orbit.zoom!==1)cam.position.lerp(LK,1-1/FX.orbit.zoom); // wheel / pinch zoom
  cam.lookAt(LK);cam.updateMatrixWorld(true);
  if(FI.amt>0){v3.copy(Wa).project(cam);FI.sx=(v3.x+1)/2*W;FI.sy=(1-v3.y)/2*H;FI.zoom=d0/cam.position.distanceTo(Wa)}
  glow.material.opacity=.35+.15*Math.sin(t*2.2);
}
const v3=new THREE.Vector3();
function scr(x,y,z){ // controller-local canvas coords -> screen px
  const p=P(x,y);v3.set(p[0],p[1],z);root.localToWorld(v3);v3.project(cam);return[(v3.x+1)/2*W,(1-v3.y)/2*H];
}
function facing(){ // 1 = front faces camera, -1 = back
  const n=new THREE.Vector3(0,0,1).transformDirection(root.matrixWorld);
  const d=cam.position.clone().sub(root.position).normalize();return n.dot(d);
}

/* ================= 2D OVERLAYS ================= */
function bolt(g,a,b,seed,amp,w,alpha){
  const r=rng(seed),n=14,pts=[];
  const dx=b[0]-a[0],dy=b[1]-a[1],L=Math.hypot(dx,dy),nx=-dy/L,ny=dx/L;
  for(let i=0;i<=n;i++){const u=i/n,j=(i==0||i==n)?0:(r()-.5)*2*amp*Math.sin(Math.PI*u);pts.push([a[0]+dx*u+nx*j,a[1]+dy*u+ny*j])}
  const path=()=>{g.beginPath();pts.forEach((p,i)=>i?g.lineTo(p[0],p[1]):g.moveTo(p[0],p[1]))};
  g.lineCap='round';g.lineJoin='round';g.save();g.globalCompositeOperation='lighter';
  path();g.strokeStyle=`rgba(40,120,255,${.55*alpha})`;g.lineWidth=w*5;g.shadowColor='#2f80ff';g.shadowBlur=30;g.stroke();
  path();g.strokeStyle=`rgba(120,200,255,${.9*alpha})`;g.lineWidth=w*2;g.shadowBlur=14;g.stroke();
  path();g.strokeStyle=`rgba(255,255,255,${alpha})`;g.lineWidth=w*.8;g.shadowBlur=0;g.stroke();g.restore();
}
// D = camera distance when focused, fw/fh = focus-frame size in px
const CALLS=[
  {p:[-105,42,.7], side:-1, ly:1400, start:1.6, D:9,    fw:440, fh:440},
  {p:[0,-90,F+.1], side: 1, ly: 340, start:1.95,D:11.5, fw:740, fh:380},
  {p:[105,42,.7],  side: 1, ly:1290, start:2.3, D:9,    fw:440, fh:440},
  {p:[235,-60,F+.1],side:1, ly: 470, start:2.65,D:8,    fw:440, fh:440},
  {p:[-234,-52,F+.1],side:-1,ly: 470, start:3.0,D:7,    fw:380, fh:380},
  {p:[-360,60,.5], side:-1, ly:1230, start:3.3, D:11.5, fw:520, fh:600, fp:[-300,40,.5]}, // fp = focus point (defaults to p)
];
function rrPath(g,x,y,w,h,r){g.moveTo(x+r,y);g.arcTo(x+w,y,x+w,y+h,r);g.arcTo(x+w,y+h,x,y+h,r);g.arcTo(x,y+h,x,y,r);g.arcTo(x,y,x+w,y,r);g.closePath()}
function drawHUD(g,t,vis){
  g.save();g.setTransform(1,0,0,1,0,0);
  const cy='#5ff1ff';
  CALLS.forEach((k,i)=>{
    const u=clamp((t-k.start)/.9);
    // focus weight: 1 for the part(s) under the focus frame, 0 for the rest (they dim)
    let w=1,lt=t-k.start-.75; // lt = clock for the line-by-line text reveal
    if(FI.amt>0){w=(i===FI.a?1-FI.f:0)+(i===FI.b&&FI.b!==FI.a?FI.f:0);lt=i===FI.act?FX.lineT:99}
    const V=vis*(FI.amt>0?1-.88*FI.amt*(1-w):1);
    if(u<=0||V<=.01)return;
    const Pn=scr(k.p[0],k.p[1],k.p[2]);
    const e1=ease(clamp(u/.25)),e2=ease(clamp((u-.25)/.45)),e3=ease(clamp((u-.7)/.3));
    const zf=FI.amt*w,s=1+.28*zf;                 // label card zooms up on focus
    const labelW=300,labelH=92,lw=labelW*s,endX=k.side<0?60:W-60-lw;
    let ly=k.ly;if(zf>0)ly+=(clamp(FI.sy+FI.fh/2+150,230,H-230)-k.ly)*zf;
    const kx=Pn[0]+k.side*80;
    const knee=[k.side<0?Math.max(kx,endX+lw+40):Math.min(kx,endX-40),ly];
    const endPt=[k.side<0?endX+lw:endX,ly];
    g.globalAlpha=V;g.shadowColor=cy;g.shadowBlur=14;g.strokeStyle=cy;g.fillStyle=cy;
    const rad=(26+4*Math.sin(t*4+i))*e1*(1+1.6*zf);
    g.lineWidth=2.5;g.beginPath();g.arc(Pn[0],Pn[1],rad,0,7);g.stroke();
    g.beginPath();g.arc(Pn[0],Pn[1],5*e1,0,7);g.fill();
    g.globalAlpha=.35*V;g.beginPath();g.arc(Pn[0],Pn[1],rad+10,0,7);g.lineWidth=1;g.stroke();g.globalAlpha=V;
    g.lineWidth=2.5;g.beginPath();g.moveTo(Pn[0],Pn[1]);
    if(e2>0)g.lineTo(Pn[0]+(knee[0]-Pn[0])*e2,Pn[1]+(knee[1]-Pn[1])*e2);
    if(e3>0)g.lineTo(knee[0]+(endPt[0]-knee[0])*e3,knee[1]);
    g.stroke();
    if(e3>0){
      g.save();g.translate(endX,ly);g.scale(s,s);
      const bx=0,by=-labelH/2;g.globalAlpha=e3*V;g.lineWidth=2;
      g.beginPath();g.rect(bx,by,labelW,labelH);g.fillStyle='rgba(20,90,120,.18)';g.fill();g.stroke();
      g.lineWidth=3;g.beginPath();g.moveTo(bx-6,by+12);g.lineTo(bx-6,by-6);g.lineTo(bx+12,by-6);g.stroke();
      // line-by-line reveal: each text line wipes in left→right with a caret, one after the other
      const L=LABELS[i];
      const lines=[[L.title,`700 25px ${FONT}`,by+36,'#bff9ff',1],[L.sub,`500 17px ${FONT}`,by+62,cy,.85],[L.meta,`500 14px ${FONT}`,by+82,cy,.5]];
      g.shadowBlur=8;g.textBaseline='alphabetic';
      lines.forEach((ln,j)=>{
        const p=ease(clamp((lt-j*.16)/.38));if(p<=0)return;
        g.font=ln[1];const tw=g.measureText(ln[0]).width;
        g.save();g.beginPath();g.rect(bx+10,ln[2]-30,(tw+12)*p,40);g.clip();
        g.fillStyle=ln[3];g.globalAlpha=e3*V*ln[4];g.fillText(ln[0],bx+16,ln[2]+(1-p)*6);g.restore();
        if(p<1){g.globalAlpha=e3*V;g.fillStyle='#bff9ff';g.fillRect(bx+16+tw*p,ln[2]-14,7,16)}
      });
      g.restore();
    }
  });
  g.restore();
}
// dim everything outside the focus frame
function drawFocusDim(g){
  if(FI.amt<=.01)return;
  const e=FI.amt,k=1+(1-e)*1.4,w=FI.fw*k,h=FI.fh*k;
  g.save();g.setTransform(1,0,0,1,0,0);
  g.beginPath();g.rect(0,0,W,H);rrPath(g,FI.sx-w/2,FI.sy-h/2,w,h,18);
  g.fillStyle=`rgba(0,4,10,${.62*e})`;g.fill('evenodd');g.restore();
}
// focus frame: corner brackets, edge ticks, centre cross, scan line, readout
function drawFocusFrame(g,t){
  if(FI.amt<=.01)return;
  const e=FI.amt,k=1+(1-e)*1.4,w=FI.fw*k,h=FI.fh*k,x=FI.sx-w/2,y=FI.sy-h/2,cx=FI.sx,cyy=FI.sy,cy='#5ff1ff',L=46+8*Math.sin(t*3);
  g.save();g.setTransform(1,0,0,1,0,0);
  g.globalAlpha=e;g.strokeStyle=cy;g.shadowColor=cy;g.shadowBlur=16;g.lineWidth=4;g.lineCap='square';
  [[x,y,1,1],[x+w,y,-1,1],[x,y+h,1,-1],[x+w,y+h,-1,-1]].forEach(([px,py,sx,sy])=>{g.beginPath();g.moveTo(px,py+sy*L);g.lineTo(px,py);g.lineTo(px+sx*L,py);g.stroke()});
  g.globalAlpha=.22*e;g.lineWidth=1.5;g.beginPath();rrPath(g,x,y,w,h,18);g.stroke();
  g.globalAlpha=.85*e;g.lineWidth=2;g.beginPath();
  g.moveTo(cx,y);g.lineTo(cx,y+16);g.moveTo(cx,y+h);g.lineTo(cx,y+h-16);g.moveTo(x,cyy);g.lineTo(x+16,cyy);g.moveTo(x+w,cyy);g.lineTo(x+w-16,cyy);
  g.moveTo(cx-14,cyy);g.lineTo(cx-5,cyy);g.moveTo(cx+5,cyy);g.lineTo(cx+14,cyy);g.moveTo(cx,cyy-14);g.lineTo(cx,cyy-5);g.moveTo(cx,cyy+5);g.lineTo(cx,cyy+14);g.stroke();
  // scan line
  g.save();g.beginPath();g.rect(x,y,w,h);g.clip();g.shadowBlur=0;
  const sy=y+((t*.6)%1)*h,gr=g.createLinearGradient(0,sy-40,0,sy);gr.addColorStop(0,'rgba(95,241,255,0)');gr.addColorStop(1,'rgba(95,241,255,.22)');
  g.globalAlpha=e;g.fillStyle=gr;g.fillRect(x,sy-40,w,40);g.restore();
  // readout
  const n=FI.a+(FI.f>.5?1:0);
  g.shadowBlur=8;g.globalAlpha=e;g.textBaseline='alphabetic';g.fillStyle='#bff9ff';g.font=`700 22px ${FONT}`;
  g.fillText(`FOCUS ${String(n+1).padStart(2,'0')}/0${CALLS.length}`,x,y-16);
  g.textAlign='right';g.fillStyle=cy;g.font=`500 18px ${FONT}`;g.fillText(`ZOOM ${FI.zoom.toFixed(1)}×`,x+w,y+h+30);
  g.globalAlpha=e*(Math.sin(t*6)>0?1:.25);g.beginPath();g.arc(x+w-10,y-24,5,0,7);g.fillStyle='#ff5a5a';g.fill();
  g.restore();
}
const PARTS=(()=>{const r=rng(77),a=[];for(let i=0;i<70;i++)a.push({x:r()*W,y:r()*H,s:r()*2.6+.6,vx:(r()-.5)*18,vy:-(r()*22+4),ph:r()*6.28,g:r()<.25});return a})();
function drawParticles(g,t){
  g.save();g.setTransform(1,0,0,1,0,0);g.globalCompositeOperation='lighter';
  for(const p of PARTS){
    const x=((p.x+p.vx*t)%W+W)%W,y=((p.y+p.vy*t)%H+H)%H;
    const a=(.25+.35*Math.sin(t*2+p.ph))*(p.g?1:.6);
    if(p.g){g.fillStyle=`rgba(95,241,255,${Math.max(0,a)})`;if(Math.sin(t*9+p.ph)>-.3)g.fillRect(x,y,p.s*5,p.s*1.3)}
    else{g.fillStyle=`rgba(180,215,255,${Math.max(0,a)})`;g.beginPath();g.arc(x,y,p.s,0,7);g.fill()}
  }
  g.restore();
}
const grainC=document.createElement('canvas');grainC.width=270;grainC.height=480;const grc=grainC.getContext('2d');
function grain(t){const id=grc.createImageData(270,480),r=rng(Math.floor(t*24)+1),d=id.data;
  for(let i=0;i<d.length;i+=4){const v=r()*255;d[i]=d[i+1]=d[i+2]=v;d[i+3]=9}grc.putImageData(id,0,0)}

/* ================= FRAME ================= */
export function draw(t){
  setPose(t);
  gl.toneMappingExposure=.08+.42*ease(t/1.6);
  gl.render(scene,cam);
  ctx.setTransform(1,0,0,1,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;
  ctx.drawImage(gl.domElement,0,0,W,H);

  // fade the reflection with distance below the floor line
  v3.set(0,FLOOR,0);v3.project(cam);const fy=(1-v3.y)/2*H;
  const mg=ctx.createLinearGradient(0,fy,0,fy+420);mg.addColorStop(0,'rgba(0,0,0,0)');mg.addColorStop(1,'rgba(0,0,0,1)');
  ctx.fillStyle=mg;ctx.fillRect(0,fy,W,H-fy);

  // electric arcs on the lower edges, glued to the 3D model
  const arcT=ease((t-1.2)/1.0);
  if(arcT>0){
    const slot=Math.floor(t*14),r=rng(slot*13+5),n=4+Math.floor(r()*3);
    const anchors=[[-390,150],[-330,215],[-240,120],[240,120],[330,215],[390,150],[0,75],[-60,80],[60,80]];
    const spinPhase=Math.abs(facing());
    for(let i=0;i<n;i++){
      const a=anchors[Math.floor(r()*anchors.length)];
      const ang=(r()*.9+.2)*Math.PI*(a[0]<0?1:-1)*(r()<.5?1:.5)+(a[0]<0?.4:-.4);
      const len=(50+r()*110)*(.6+.4*spinPhase);
      const A=scr(a[0],a[1],0);
      const B=[A[0]+Math.cos(ang+Math.PI/2)*len*(a[0]<0?-1:1),A[1]+Math.abs(Math.sin(ang))*len*.9+10];
      const flick=.45+.55*r();
      bolt(ctx,A,B,slot*97+i*31,16+r()*14,1.6+r()*1.2,arcT*flick*(r()<.2?0:1)*(1-.85*FI.amt));
    }
    const z=Math.exp(-Math.pow((t-1.6)*3.5,2));
    if(z>.02&&FI.amt<.05){const A=scr(-390,150,0),B=scr(390,150,0);bolt(ctx,A,[B[0],B[1]+30],41,45,3,z)}
  }
  // HUD only when the front faces the camera
  const f=facing(),ht=FX.ht==null?t:FX.ht;
  drawFocusDim(ctx);drawHUD(ctx,ht,ease((f-.35)/.5));drawFocusFrame(ctx,t);
  drawParticles(ctx,t);

  // bloom
  gc.setTransform(1,0,0,1,0,0);gc.clearRect(0,0,W/2,H/2);gc.drawImage(cv,0,0,W/2,H/2);
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.filter='blur(18px)';ctx.globalAlpha=.30;ctx.drawImage(glowC,0,0,W,H);ctx.filter='none';ctx.restore();
  // chromatic aberration (stronger during the spin)
  const spinning=Math.sin(Math.PI*clamp((t-SPIN0)/(SPIN1-SPIN0)));
  const ca=1.5+(t<2?4*(1-t/2):0)+3*spinning;
  ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=.10;ctx.drawImage(cv,ca,0);ctx.drawImage(cv,-ca,0);ctx.restore();
  // vignette
  const vg=ctx.createRadialGradient(W/2,H/2,H*.28,W/2,H/2,H*.72);vg.addColorStop(0,'rgba(0,0,0,0)');vg.addColorStop(1,'rgba(0,0,0,.75)');
  ctx.fillStyle=vg;ctx.fillRect(0,0,W,H);
  grain(t);ctx.save();ctx.globalCompositeOperation='overlay';ctx.drawImage(grainC,0,0,W,H);ctx.restore();
  const flash=Math.exp(-Math.pow((t-1.55)*5,2))*.30;
  if(flash>.01){ctx.fillStyle=`rgba(160,210,255,${flash})`;ctx.fillRect(0,0,W,H)}
  const fade=Math.min(ease(t/.8),1-ease((t-9.4)/.6));
  ctx.fillStyle=`rgba(0,0,0,${1-fade})`;ctx.fillRect(0,0,W,H);
}
window.draw=draw;window.ready=true;
if(window.__render)document.body.classList.add('render');
