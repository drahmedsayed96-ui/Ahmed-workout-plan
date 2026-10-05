from PIL import Image,ImageDraw,ImageFont
from pathlib import Path
import json,re,math
ROOT=Path(__file__).resolve().parents[1]; DATA=ROOT/"app/src/main/assets/data.js"; OUT=ROOT/"app/src/main/assets/gifs"; OUT.mkdir(parents=True,exist_ok=True)
s=DATA.read_text(); s=re.sub(r"^window\.WORKOUT_PLAN\s*=\s*","",s.strip()); s=s[:-1] if s.endswith(";") else s
E=[e for w in json.loads(s) for e in w["exercises"]]
W,H=320,220; BG=(247,249,252); INK=(20,42,70); ACC=(47,117,200); EQ=(70,78,90); FLOOR=(216,224,234)
try:F=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",12);B=ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",16)
except:F=B=ImageFont.load_default()
def L(a,b,t):return int(a+(b-a)*t)
def P(a,b,t):return(L(a[0],b[0],t),L(a[1],b[1],t))
def ln(d,a,b,c=INK,w=7):d.line([a,b],fill=c,width=w)
def hd(d,p,r=12):d.ellipse([p[0]-r,p[1]-r,p[0]+r,p[1]+r],outline=INK,width=5,fill="white")
def ar(d,a,b):
 d.line([a,b],fill=ACC,width=5); ang=math.atan2(b[1]-a[1],b[0]-a[0])
 for q in (2.6,-2.6):
  x=int(b[0]-12*math.cos(ang+q));y=int(b[1]-12*math.sin(ang+q));d.line([b,(x,y)],fill=ACC,width=5)
def typ(n):
 n=n.lower()
 if any(x in n for x in ["bench press","chest press","squeeze press"]):return"bench"
 if "fly" in n or "pec deck" in n:return"fly"
 if any(x in n for x in ["shoulder press","arnold press","landmine press","high-incline"]):return"press"
 if any(x in n for x in ["lateral raise","y-raise","rear-delt","face pull"]):return"raise"
 if "pulldown" in n:return"down"
 if "pull-up" in n or "chin-up" in n:return"pullup"
 if "row" in n:return"row"
 if "curl" in n:return"curl"
 if "triceps" in n or "skull crusher" in n:return"tri"
 if "squat" in n or "leg press" in n:return"squat"
 if any(x in n for x in ["deadlift","romanian","good morning","pull-through","back extension"]):return"hinge"
 if any(x in n for x in ["lunge","split squat","step-up"]):return"lunge"
 if "hip thrust" in n or "glute bridge" in n:return"hip"
 if "leg curl" in n or "nordic" in n:return"legcurl"
 if "leg extension" in n:return"legext"
 if "calf" in n:return"calf"
 if "carry" in n:return"carry"
 return"core"
def base(name,t):
 im=Image.new("RGB",(W,H),BG);d=ImageDraw.Draw(im);d.rounded_rectangle([7,7,W-7,H-7],20,fill="white",outline=(220,228,238),width=2);d.text((17,14),name,fill=INK,font=B);d.text((W-75,18),"START" if t<.5 else "FINISH",fill=ACC,font=F);d.line([(18,191),(W-18,191)],fill=FLOOR,width=3);return im,d
def stand(d,t,mode="press"):
 hip=(160,142);neck=(160,94);hd(d,(160,70));ln(d,neck,hip);ln(d,hip,(145,190));ln(d,hip,(178,190));ln(d,neck,(137,118));ln(d,(137,118),(132,150))
 if mode=="press":e=P((185,120),(178,75),t);h=P((193,152),(190,48),t)
 elif mode=="raise":e=P((184,118),(210,100),t);h=P((190,150),(240,100),t)
 elif mode=="curl":e=(187,132);h=P((192,169),(176,111),t)
 elif mode=="tri":e=(188,125);h=P((172,108),(197,169),t)
 else:e=(185,120);h=(195,150)
 ln(d,neck,e);ln(d,e,h);return h
def frame(name,t):
 im,d=base(name,t);p=typ(name)
 if p=="bench":
  d.rounded_rectangle([80,145,242,154],4,fill=EQ);hd(d,(108,124),10);ln(d,(120,130),(180,140));ln(d,(180,140),(210,170));ln(d,(210,170),(224,190));sh=(145,134);e=P((151,107),(160,91),t);h=P((129,95),(176,70),t);ln(d,sh,e);ln(d,e,h);d.line([(172,70),(210,70)],fill=EQ,width=5);ar(d,(170,116),(177,80))
 elif p=="fly":
  stand(d,0);x=L(88,145,t);y=L(121,105,t);ln(d,(160,104),(x,y));ln(d,(160,104),(320-x,y));ar(d,(95,124),(143,108))
 elif p in("press","raise","curl","tri"):
  stand(d,t,p);ar(d,(222,158 if p in("curl","tri") else 126),(215,82 if p=="press" else 102))
 elif p=="down":
  hd(d,(160,74));ln(d,(160,95),(160,150));ln(d,(160,150),(145,190));ln(d,(160,150),(178,190));y=L(58,116,t);d.line([(108,y),(212,y)],fill=EQ,width=5);ln(d,(160,96),(120,y));ln(d,(160,96),(200,y));ar(d,(242,70),(242,122))
 elif p=="pullup":
  d.line([(95,58),(225,58)],fill=EQ,width=6);y=L(126,85,t);hd(d,(160,y-28));ln(d,(160,y-7),(160,y+43));ln(d,(160,y-7),(118,58));ln(d,(160,y-7),(202,58));ln(d,(160,y+43),(145,y+75));ln(d,(160,y+43),(177,y+75));ar(d,(245,140),(245,91))
 elif p=="row":
  hd(d,(118,88),10);hip=(158,148);neck=(137,106);ln(d,neck,hip);ln(d,hip,(146,190));ln(d,hip,(185,190));sh=(140,111);e=P((174,130),(154,118),t);h=P((212,148),(171,126),t);ln(d,sh,e);ln(d,e,h);d.ellipse([h[0]-6,h[1]-6,h[0]+6,h[1]+6],fill=EQ);ar(d,(214,154),(172,131))
 elif p=="squat":
  y=L(0,35,t);hd(d,(160,68+y));ln(d,(160,90+y),(160,138+y));ln(d,(160,138+y),(140,161+y//2));ln(d,(140,161+y//2),(126,190));ln(d,(160,138+y),(180,161+y//2));ln(d,(180,161+y//2),(195,190));d.line([(120,105+y),(200,105+y)],fill=EQ,width=5);ar(d,(237,106),(237,160))
 elif p=="hinge":
  hip=(160,146);neck=P((160,96),(116,120),t);hd(d,(neck[0]-12,neck[1]-22),10);ln(d,neck,hip);ln(d,hip,(145,190));ln(d,hip,(178,190));h=P((190,132),(126,160),t);ln(d,neck,h);d.line([(h[0]-18,h[1]+8),(h[0]+18,h[1]+8)],fill=EQ,width=5);ar(d,(220,106),(187,148))
 elif p=="lunge":
  y=L(0,26,t);hd(d,(160,68+y));ln(d,(160,91+y),(160,139+y));ln(d,(160,139+y),(126,159+y//2));ln(d,(126,159+y//2),(105,190));ln(d,(160,139+y),(194,159));ln(d,(194,159),(222,190));ar(d,(246,118),(246,160))
 elif p=="hip":
  d.line([(75,156),(132,156)],fill=EQ,width=7);hd(d,(102,137),10);hip=P((168,170),(170,132),t);ln(d,(119,146),hip);ln(d,hip,(205,164));ln(d,(205,164),(220,190));ln(d,hip,(148,188));ar(d,(187,174),(187,136))
 elif p=="legcurl":
  d.rounded_rectangle([84,142,223,152],4,fill=EQ);hd(d,(109,128),10);ln(d,(120,136),(156,144));k=(191,147);ln(d,(156,144),k);f=P((228,177),(194,113),t);ln(d,k,f);ar(d,(242,170),(216,121))
 elif p=="legext":
  d.line([(120,128),(120,178)],fill=EQ,width=6);hd(d,(142,94));ln(d,(142,115),(148,146));k=(185,151);ln(d,(148,146),k);f=P((184,188),(230,151),t);ln(d,k,f);ar(d,(202,186),(231,158))
 elif p=="calf":
  y=L(0,-18,t);hd(d,(160,70+y));ln(d,(160,92+y),(160,142+y));ln(d,(160,142+y),(146,182+y));ln(d,(160,142+y),(176,182+y));ln(d,(146,182+y),(138,190));ln(d,(176,182+y),(186,190));ar(d,(220,176),(220,140))
 elif p=="carry":
  x=L(-10,15,t);hd(d,(160+x,70));ln(d,(160+x,92),(160+x,142));ln(d,(160+x,142),(143+x,190));ln(d,(160+x,142),(178+x,190));ln(d,(160+x,94),(136+x,140));ln(d,(160+x,94),(184+x,140));d.rectangle([125+x,140,142+x,165],fill=EQ);d.rectangle([178+x,140,195+x,165],fill=EQ);ar(d,(105,178),(207,178))
 else:
  d.line([(82,170),(238,170)],fill=EQ,width=5);hd(d,(112,145),10);sh=P((126,156),(145,128),t);ln(d,sh,(160,164));ln(d,(160,164),(200,168));ln(d,(200,168),(226,170));ln(d,sh,(105,166));ar(d,(150,154),(150,124))
 d.text((18,197),"Animated technique guide • controlled motion",fill=(115,128,145),font=F);return im
ph=[0,.2,.4,.6,.8,1,.8,.6,.4,.2]
for e in E:
 fs=[frame(e["name"],t) for t in ph];fs[0].save(OUT/f'{e["id"]}.gif',save_all=True,append_images=fs[1:],duration=95,loop=0,optimize=True,disposal=2)
print("generated",len(E),"gifs")