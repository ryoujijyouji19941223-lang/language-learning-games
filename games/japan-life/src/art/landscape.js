import * as THREE from 'three';
import {surface,mesh,block,projectUV,rod} from './materials.js';
import {groundHeight} from './height.js';
import {random} from './vegetation.js';
export function terrain(g,season) {
  const geo=new THREE.PlaneGeometry(190,147,150,130);geo.rotateX(-Math.PI/2);geo.translate(0,0,-5.5);
  const p=geo.attributes.position,colors=[],c=new THREE.Color();
  for(let i=0;i<p.count;i++) {const x=p.getX(i),z=p.getZ(i);p.setY(i,groundHeight(x,z));const n=Math.sin(x*.31+z*.17)*.035+Math.sin(x*.13-z*.27)*.025;c.set(season==='冬'?'#eef0e9':season==='秋'?'#d9d5b4':season==='春'?'#d4dfb6':'#c3d69e');c.multiplyScalar(1+n);colors.push(c.r,c.g,c.b);}
  geo.computeVertexNormals();projectUV(geo,3.6);geo.setAttribute('color',new THREE.Float32BufferAttribute(colors,3));
  const land=mesh(g,geo,surface(season==='冬'?'snow':'grass','#ffffff',{vertexColors:true}));land.userData.keep=true;land.castShadow=false;
  function road(a,b,width,type='asphalt',tint='#ffffff',height=.045) {
    const length=Math.hypot(b[0]-a[0],b[1]-a[1]),steps=Math.ceil(length/1.5),dx=(b[0]-a[0])/length,dz=(b[1]-a[1])/length,vertices=[],uv=[];
    for(let i=0;i<steps;i++)for(const [t,side] of [[i,-1],[i,1],[i+1,-1],[i,1],[i+1,1],[i+1,-1]]) {const d=t/steps*length,x=a[0]+dx*d-dz*width/2*side,z=a[1]+dz*d+dx*width/2*side;vertices.push(x,groundHeight(x,z)+height,z);uv.push(d/2,side*width/4);}
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();const m=mesh(g,geometry,surface(type,tint));m.castShadow=false;return m;
  }
  road([0,-63],[0,44],6.4);
  for(const z of [-55,-20,7,29]) {road([-70,z],[70,z],5.2);road([-70,z-3.35],[70,z-3.35],1.25,'concrete','#d0c5aa',.07);}
  for(const x of [-55,-34,10,57])road([x,-60],[x,41],2.1,'concrete','#b7b39e',.05);
  road([-70,42],[70,42],5,'stone','#d0c5ae',.065);
  road([-21,48],[15,48],5,'sand','#d5c4a1',.05);
  // Drain channels, road edging and intermittent retaining walls beside the hill ramp.
  for(const side of [-1,1])for(let z=-58;z<44;z+=1.8) {
    const y=groundHeight(side*3.65,z);block(g,side*3.65,y+.035,z,.18,.13,1.7,surface('concrete','#b8b5a1'));
    if(z%8<1.8)block(g,side*3.15,y+.065,z,.32,.035,.6,surface('metal','#49554e'));
  }
  for(const x of [-4.4,4.4])for(const z of [-31,-12]) {
    const h=.6;block(g,x,groundHeight(x,z)+h/2,z,.3,h,7,surface('stone','#aba28b'));
  }
  return {road};
}
export function seaAndMountains(g) {
  const seaGeo=new THREE.PlaneGeometry(700,440,70,44);seaGeo.rotateX(-Math.PI/2);seaGeo.translate(0,0,286);
  const seaMat=new THREE.MeshStandardMaterial({color:'#386f76',roughness:.27,metalness:.28});
  const time={value:0};seaMat.onBeforeCompile=shader=>{shader.uniforms.uShiomachiTime=time;shader.vertexShader='uniform float uShiomachiTime;\n'+shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed.y += sin(position.x*.18 + uShiomachiTime*.7)*.055 + sin(position.z*.31+position.x*.09+uShiomachiTime*.5)*.035;');};
  const water=mesh(g,seaGeo,seaMat);water.userData.keep=true;water.castShadow=false;
  const rng=random(189);
  for(let layer=0;layer<3;layer++) {
    const positions=[],indices=[],count=60;
    for(let i=0;i<=count;i++) {const x=-340+i*680/count,y=22+Math.sin(i*.43+layer)*14+Math.sin(i*.91)*7+Math.sin(i*.17)*13+layer*7,z=-115-layer*65;positions.push(x,-5,z,x,y,z);if(i<count){const a=i*2;indices.push(a,a+1,a+2,a+1,a+3,a+2);}}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setIndex(indices);geo.computeVertexNormals();projectUV(geo,15);mesh(g,geo,surface('soil',['#5d756e','#748b84','#8e9f99'][layer],{side:THREE.DoubleSide})).castShadow=false;
  }
  // Harbour quay ends at a beach opening, with timber mooring posts and small boats.
  for(const [a,b] of [[-70,-22],[17,70]]) {
    block(g,(a+b)/2,.8,48,b-a,1.6,.8,surface('stone','#8b9285'));
    for(let x=a+1;x<b;x+=4) {rod(g,[x,1.55,47.6],[x,2.5,47.6],.035,surface('metal','#63746b'));rod(g,[x,2.5,47.6],[Math.min(x+4,b),2.5,47.6],.025,surface('metal','#63746b'));}
  }
  for(let i=0;i<3;i++) {
    const boat=new THREE.Group();boat.position.set(-42+i*48,.12,74+i*9);boat.rotation.y=.3-i*.4;g.add(boat);
    const hull=new THREE.Shape();hull.moveTo(-.85,-2.7);hull.lineTo(.85,-2.7);hull.quadraticCurveTo(1.5,.8,0,3.2);hull.quadraticCurveTo(-1.5,.8,-.85,-2.7);
    const hullMesh=mesh(boat,new THREE.ExtrudeGeometry(hull,{depth:.65,bevelEnabled:true,bevelSize:.08,bevelThickness:.08,bevelSegments:1}),surface('metal','#d6d8c8'));hullMesh.rotation.x=Math.PI/2;
    block(boat,0,.4,-.8,1.25,1.0,1.5,surface('wood','#718a85'));block(boat,0,.95,-.8,1.45,.12,1.7,surface('metal','#e1ddcb'));rod(boat,[0,.3,-1],[0,3.5,-1],.035,surface('metal','#727e72'));
  }
  return {water,time};
}
