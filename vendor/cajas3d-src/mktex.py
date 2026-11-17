import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter
A=np.asarray(Image.open('/mnt/user-data/uploads/674a55dc-image.png').convert('RGB')).astype(np.float32)/255
B=np.asarray(Image.open('/mnt/user-data/uploads/fa1fd713-image.png').convert('RGB')).astype(np.float32)/255
# top face region, remove tape band (rows ~386-454) by copying flute rows from above (flutes are vertical)
T=A[458:792,240:1360].copy()
T=np.concatenate([T,T[::-1]],0)  # espejo vertical: la onda es vertical y sigue continua
# flatten lighting
L=gaussian_filter(T,(70,70,0))
F=T/np.maximum(L,1e-3)          # ~1 mean, detail only
# warm kraft target (from inner photo of the same board)
inner=B[300:560,560:1000].reshape(-1,3).mean(0)
target=inner*0.92
alb=np.clip(F*target,0,1)
# make seamless 1024 tile
alb=np.asarray(Image.fromarray((alb*255).astype(np.uint8)).resize((1024,int(1024*alb.shape[0]/alb.shape[1])),Image.LANCZOS)).astype(np.float32)/255
H,W,_=alb.shape
pass
def seamless(a,m=96):
    a=a.copy(); n=a.shape[0]
    r=np.roll(a,(n//2,n//2),(0,1))
    # blend seams: weight based on distance to edge
    y=np.minimum(np.arange(n),n-1-np.arange(n))
    wy=np.clip(y/m,0,1); w=np.minimum(wy[:,None],wy[None,:])
    if a.ndim==3: w=w[...,None]
    return a*w+r*(1-w)
pass
Image.fromarray((alb*255).astype(np.uint8)).save('/tmp/c3d/tex/kraft_albedo.jpg',quality=90)
# height from luminance high-pass (flutes + fibers)
lum=alb.mean(2)
hp=lum-gaussian_filter(lum,6)
hp=hp/ (np.abs(hp).max()+1e-6)
# add synthetic flute ridges to reinforce (vertical, ~ 8mm pitch?) observe photo pitch ~ 27px at 1024 tile
n=lum.shape[1]; pitch=n/38
fl=0.35*np.sin(np.arange(n)*2*np.pi/pitch)[None,:]
hgt=gaussian_filter(hp,0.8)*0.9+fl*0.25
gy,gx=np.gradient(hgt)
st=3.0
nx,ny,nz=-gx*st,-gy*st,np.ones_like(gx)
l=np.sqrt(nx**2+ny**2+nz**2)
N=np.stack([nx/l,-ny/l,nz/l],2)*0.5+0.5
Image.fromarray((N*255).astype(np.uint8)).save('/tmp/c3d/tex/kraft_normal.png')
rough=np.clip(0.86+hp*0.06,0,1)
Image.fromarray((rough*255).astype(np.uint8)).save('/tmp/c3d/tex/kraft_rough.jpg',quality=90)
# inner face (smoother, lighter, as in photo 2)
I=B[300:600,380:1000]
IL=gaussian_filter(I,(50,50,0)); IF=I/np.maximum(IL,1e-3)
inn=np.clip(IF*inner*1.04,0,1)
inn=np.asarray(Image.fromarray((inn*255).astype(np.uint8)).resize((1024,int(1024*inn.shape[0]/inn.shape[1])),Image.LANCZOS)).astype(np.float32)/255
s=inn.shape[0]; inn=np.concatenate([inn,inn[::-1]],0)[:1024] if s<1024 else inn[:1024]
inn=inn[:min(inn.shape[:2])]
inn=np.asarray(Image.fromarray((inn*255).astype(np.uint8)).resize((1024,1024))).astype(np.float32)/255
pass
Image.fromarray((inn*255).astype(np.uint8)).save('/tmp/c3d/tex/kraft_inner.jpg',quality=90)
# flute edge strip from the open box rim (top edge, y~36-52)
E=B[30:58,420:1300]
Image.fromarray((E*255).astype(np.uint8)).resize((1024,32),Image.LANCZOS).save('/tmp/c3d/tex/flute_edge.jpg',quality=92)
print(alb.shape, inner)
