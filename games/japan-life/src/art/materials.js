import * as THREE from 'three';
let sources={};const cache=new Map(),textures=new Map();
export function configureSurfaces(value){sources=value;}
export function surface(name,color='#ffffff',options={}) {
  const key=name+color+JSON.stringify(options);if(cache.has(key))return cache.get(key);
  let maps=textures.get(name);
  if(!maps&&sources[name]) {
    maps={};for(const [channel,uri] of Object.entries(sources[name])) {const t=new THREE.TextureLoader().load(uri);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.anisotropy=4;if(channel==='color')t.colorSpace=THREE.SRGBColorSpace;maps[channel]=t;}
    textures.set(name,maps);
  }
  const m=new THREE.MeshStandardMaterial({color,roughness:.86,...(maps?{map:maps.color,normalMap:maps.normal,roughnessMap:maps.rough,normalScale:new THREE.Vector2(.24,.24)}:{}),...options});cache.set(key,m);return m;
}
export function projectUV(geo,scale=2) {
  const p=geo.getAttribute('position'),n=geo.getAttribute('normal'),uv=[];
  for(let i=0;i<p.count;i++) {const x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(Math.abs(n.getY(i))>.6)uv.push(x/scale,z/scale);else if(Math.abs(n.getX(i))>.6)uv.push(z/scale,y/scale);else uv.push(x/scale,y/scale);}
  geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));return geo;
}
export function mesh(g,geo,mat,x=0,y=0,z=0) {const m=new THREE.Mesh(geo,mat);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;g.add(m);return m;}
export function block(g,x,y,z,w,h,d,mat) {return mesh(g,projectUV(new THREE.BoxGeometry(w,h,d)),mat,x,y,z);}
export function rod(g,a,b,r,mat,r2=r) {const v=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));const m=mesh(g,new THREE.CylinderGeometry(r2,r,v.length(),7),mat);m.position.copy(new THREE.Vector3(...a).addScaledVector(v,.5));m.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());return m;}
