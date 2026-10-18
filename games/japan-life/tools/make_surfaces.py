"""Original seamless PBR surfaces, authored for Shiomachi. No input photographs."""
from pathlib import Path
import math, random
import numpy as np
from PIL import Image, ImageFilter, ImageDraw
ROOT=Path(__file__).resolve().parents[1]/'src/art/textures'
ROOT.mkdir(parents=True,exist_ok=True)
N=512
rng=np.random.default_rng(19019)
y,x=np.mgrid[:N,:N]

def noise(scale):
    a=Image.fromarray(rng.integers(0,256,(scale,scale),dtype=np.uint8)).resize((N,N),Image.Resampling.BICUBIC)
    return np.asarray(a,dtype=float)/255-.5
fine=noise(512); broad=noise(16); medium=noise(64)

def save(name,base,h,rough):
    h=np.clip(h,0,1)
    color=np.clip(np.asarray(base)+fine[:,:,None]*9+broad[:,:,None]*12,0,255).astype('uint8')
    Image.fromarray(color).save(ROOT/(name+'-color.webp'),quality=88,method=6)
    dx=(np.roll(h,-1,axis=1)-np.roll(h,1,axis=1))*4
    dy=(np.roll(h,-1,axis=0)-np.roll(h,1,axis=0))*4
    normal=np.stack([-dx,-dy,np.ones_like(dx)],axis=2);normal/=np.linalg.norm(normal,axis=2)[:,:,None]
    Image.fromarray(np.uint8((normal*.5+.5)*255)).resize((256,256),Image.Resampling.LANCZOS).save(ROOT/(name+'-normal.png'),optimize=True)
    Image.fromarray(np.uint8(np.clip(rough+fine*.12,0,1)*255)).resize((256,256),Image.Resampling.LANCZOS).save(ROOT/(name+'-rough.png'),optimize=True)

for name,base in [('plaster',[185,174,150]),('stucco',[218,210,183]),('asphalt',[79,81,77]),('soil',[133,122,96]),('grass',[145,152,106]),('sand',[167,153,119])]:
    h=.5+fine*.25+medium*.14+broad*.05
    rgb=np.ones((N,N,3))*base+(medium*16+broad*18+fine*16)[:,:,None]
    if name=='plaster': rgb-=np.maximum(0,broad[:,:,None])**2*55
    save(name,rgb,h,.93 if name!='sand' else .86)
# Slate tiles: rolled edges, staggered joints, weathered ridges.
row=y//64;xx=(x+(row%2)*32)%64;yy=y%64
ridge=np.sin(xx/64*math.pi)**.55
joint=(xx<3)|(yy<3)
h=.38+ridge*.28+(yy/64)*.06+fine*.06;h[joint]=.15
rgb=np.stack([69+ridge*12,76+ridge*14,78+ridge*16],axis=2)+(noise(8)*20)[:,:,None]
rgb[joint]=[32,37,37]
save('tile',rgb,h,.68)
# Vertical weathered timber boards, with grain and dark seams.
grain=np.sin(x*.23+medium*2)+np.sin(x*.8+broad*5)*.3
joint=(x%64)<3
h=.5+grain*.04+medium*.08;h[joint]=.15
rgb=np.stack([111+grain*9,84+grain*7,59+grain*5],axis=2)+(broad*18)[:,:,None];rgb[joint]=[48,43,36]
save('wood',rgb,h,.82)
# Irregular cut stone courses with mortar and individual block tones.
row=y//85;xx=(x+(row%2)*95)%170;yy=y%85
joint=(xx<5)|(yy<5)
blocks=rng.uniform(-18,18,(7,5));tone=blocks[row,np.minimum((x+(row%2)*95)//170,4)]
h=.55+medium*.09+fine*.06;h[joint]=.22
rgb=np.stack([128+tone,125+tone,110+tone],axis=2)+broad[:,:,None]*18;rgb[joint]=[71,72,65]
save('stone',rgb,h,.94)
# Concrete with seams and grit, useful on curbs and house plinths.
joint=(x%256<3)|(y%256<3);h=.5+fine*.11+medium*.03;h[joint]=.25
rgb=np.ones((N,N,3))*[145,144,132]+(fine*15+broad*15)[:,:,None];rgb[joint]=[95,96,89]
save('concrete',rgb,h,.9)
# Source imports are isolated from model/engine modules so node tests need no image loader.
names=['plaster','stucco','asphalt','soil','grass','sand','tile','wood','stone','concrete']
imports=[];entries=[]
for name in names:
    vals=[]
    for channel in ['color','normal','rough']:
        ident=name+'_'+channel
        ext="webp" if channel=="color" else "png"
        imports.append(f"import {ident} from './textures/{name}-{channel}.{ext}?inline';")
        vals.append(f'{channel}:{ident}')
    entries.append(name+':{'+','.join(vals)+'}')
(ROOT.parent/'texture-sources.js').write_text('\n'.join(imports)+'\nexport const textureSources={'+','.join(entries)+'};\n')
print('Generated',len(names),'original PBR surfaces (27 PNGs).')
