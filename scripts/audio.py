import numpy as np, wave
sr=44100;T=10;n=sr*T;t=np.arange(n)/sr;rng=np.random.default_rng(3)
def env(a,d): # envelope helper
    return np.exp(-np.clip(t-a,0,None)/d)*(t>=a)
hum=0.10*np.sin(2*np.pi*55*t)+0.05*np.sin(2*np.pi*110.5*t)+0.03*np.sin(2*np.pi*165*t)*(0.6+0.4*np.sin(2*np.pi*.4*t))
hum*=np.clip(t/1.5,0,1)*np.clip((10-t)/0.8,0,1)
def noise_band(lo,hi):
    N=np.fft.rfft(rng.standard_normal(n));f=np.fft.rfftfreq(n,1/sr)
    N[(f<lo)|(f>hi)]=0;x=np.fft.irfft(N,n);return x/np.abs(x).max()
whoosh_n=noise_band(300,5000)
def whoosh(c,w,amp): return whoosh_n*amp*np.exp(-((t-c)/w)**2)
sig=hum+whoosh(1.0,.5,.25)+whoosh(3.8,.35,.22)+whoosh(6.1,1.3,.34)+whoosh(8.6,.4,.22)
sig+=0.06*np.sin(2*np.pi*(160+90*np.sin(np.pi*np.clip((t-3.6)/5,0,1)))*t)*np.exp(-((t-6.1)/1.8)**2)
# reveal boom
sig+=0.5*np.sin(2*np.pi*(45-12*np.clip(t-1.55,0,1))*t)*env(1.55,.5)
# zaps (random-ish bursts) once arcs active
zn=noise_band(1500,9000)
for z in np.sort(rng.uniform(1.4,9.2,22)):
    sig+=0.22*zn*env(z,.035)*(rng.uniform(.5,1))
sig+=0.45*zn*env(1.6,.12)
# HUD blips
for s in [1.6,1.95,2.3,2.65,3.0,3.3]:
    m=(t>=s)&(t<s+.12)
    sig[m]+=0.12*np.sin(2*np.pi*(1800+600*(s%2))*t[m])*np.exp(-(t[m]-s)/.04)
sig/=np.abs(sig).max()*1.15
st=np.stack([sig,np.roll(sig,40)],1)
w=wave.open('public/audio.wav','wb');w.setnchannels(2);w.setsampwidth(2);w.setframerate(sr)
w.writeframes((st*32767).astype('<i2').tobytes());w.close()
