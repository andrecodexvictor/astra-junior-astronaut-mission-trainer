#!/usr/bin/env python3
"""Build ASTRA's timed, editable English pitch and Portuguese elevator pitch."""
import argparse, base64, importlib.util, json, math, os, shutil, sys
from pathlib import Path
from PIL import Image, ImageDraw
from pptx import Presentation
from pptx.util import Inches
from pptx.oxml.xmlchemy import OxmlElement
from reportlab.pdfgen import canvas

ROOT=Path(__file__).resolve().parents[1]
FONT_HOME=ROOT/'docs/presentation/v3/fonts'
os.environ['ASTRA_FONT_REGULAR']=str(FONT_HOME/'LiberationSans-Regular.ttf')
os.environ['ASTRA_FONT_BOLD']=str(FONT_HOME/'LiberationSans-Bold.ttf')
spec=importlib.util.spec_from_file_location('base',ROOT/'scripts/build-pitch.py')
base=importlib.util.module_from_spec(spec); spec.loader.exec_module(base)
W,H=1920,1080
URL='https://astra-mission-trainer.andrevictorandrade.chatgpt.site'
NAVY='#081522'; WHITE='#F7F5F0'; CYAN='#7AD7DD'; ORANGE='#F6AB64'
PROD=ROOT/'docs/art/production-vision'; DEMO=ROOT/'docs/demo/fixture-captures'
ALLOWED=('09-', '10-', '11-', '13-', '15-', '16-', '17-', '18-', '20-', '21-')

def asset(name):
    name=str(name or '')
    if not name: return None
    p=Path(name); n=p.name
    if not n.endswith('.png'): n += '.png'
    if n.startswith('fixture-'): p=DEMO/n
    elif n.startswith(ALLOWED): p=PROD/n
    else: raise ValueError('Disallowed art: '+name)
    if not p.exists(): raise FileNotFoundError(p)
    return p

def render(s,tmp,lang,total):
    n=int(s['id']); p=asset(s.get('art')); evidence=s['layout']=='evidence'; is_demo=p and p.name.startswith('fixture-')
    if p and not evidence and not is_demo:
        im=Image.open(p).convert('RGB').resize((W,H),Image.Resampling.LANCZOS).convert('RGBA')
        # Preserve the complete image; a smooth veil gives readable type and context.
        veil=Image.new('RGBA',(W,H)); vd=ImageDraw.Draw(veil)
        for x in range(W):
            a=int(226-145*min(1,x/1250))
            vd.line((x,0,x,H), fill=(8,21,34,a))
        im=Image.alpha_composite(im,veil).convert('RGB')
    else:
        im=Image.new('RGB',(W,H),NAVY); d=ImageDraw.Draw(im)
        for y in range(H): d.line((0,y,W,y),fill=(8+int(y/H*6),21+int(y/H*12),34+int(y/H*15)))
    bg=tmp/f'{n:02d}.jpg'; im.save(bg,quality=94)
    e=[]
    def text(x,y,w,t,sz,c=WHITE,b=False):
        if t: e.append(('text',x,y,w,str(t),sz,c,b))
    def box(x,y,w,h,c): e.append(('box',x,y,w,h,c,0))
    stage=str(s.get('stage','')).upper()
    text(90,65,1500,'ASTRA   /   '+stage,22,CYAN,True)
    text(1720,65,130,f'{n:02d} / {total:02d}',22,WHITE,True)
    wide_demo = lang=='en' and n in (21,29)
    if wide_demo:
        tw=1650; y=115
    elif evidence or is_demo:
        tw=700 if p else 1500; y=220
    else: tw=1000; y=235
    headline=s['headline']; size=100 if len(headline)<35 else 88
    while len(base.fit_lines(headline,tw,size,True))*size*1.22>370 and size>62: size-=4
    lines=base.fit_lines(headline,tw,size,True)
    text(90,y,tw,headline,size,WHITE,True)
    sub_y=y+len(lines)*size*1.22+34
    text(95,int(sub_y),tw,s.get('subtitle',''),36,WHITE)
    if p and (evidence or is_demo):
        # Entire uncropped capture, centered on a generous field.
        if wide_demo:
            e.append(('picture',180,350,1560,620,str(p)))
        else:
            e.append(('picture',865,235,970,650,str(p)))
        text(180 if wide_demo else 900,985 if wide_demo else 912,1500 if wide_demo else 900,('CURRENT DEMO  ·  PREPARED SCENE' if lang=='en' else 'DEMO ATUAL  ·  CENA PREPARADA') if is_demo else ('PRODUCTION VISION  ·  AI-ASSISTED CONCEPT ART' if lang=='en' else 'VISÃO DE PRODUÇÃO  ·  ARTE CONCEITUAL COM IA'),23,ORANGE,True)
    if lang=='en' and n==7:
        text(95,650,350,'4',190,ORANGE,True)
        text(255,735,620,'SYSTEMS',32,WHITE,True)
        text(700,735,650,'/  ONE MISSION',32,CYAN,True)
    if lang=='en' and n in (22,24):
        text(95,650 if n==22 else 715,500,'67' if n==22 else '33',150,ORANGE,True)
        text(95,835 if n==22 else 890,650,'CPU UNIT TESTS' if n==22 else 'STEM GAME STUDIES',26,CYAN,True)
        if n==24: text(95,945,680,'WANG ET AL. (2022) · DOI: 10.1186/S40594-022-00344-0',18,WHITE)
    if (lang=='en' and n==29) or (lang=='pt' and n==6):
        text(95,1030 if lang=='en' else 930,1700,URL,24,WHITE,True)
    if lang=='en' and n==24: text(95,985,700,'General STEM research; not ASTRA outcomes.',18,WHITE)
    status=str(s.get('status','')).lower()
    if not is_demo:
        if any(k in status for k in ('concept','vision','production','planned','future')) or (p and not evidence):
            label='PRODUCTION VISION  ·  AI-ASSISTED CONCEPT ART' if lang=='en' else 'VISÃO DE PRODUÇÃO  ·  ARTE CONCEITUAL COM IA'
            text(95,988,1600,label,20,CYAN,True)
        elif 'evidence' in status:
            text(95,988,1500,'EXTERNAL EVIDENCE' if lang=='en' else 'EVIDÊNCIA EXTERNA',20,CYAN,True)
    return bg,e

def build(source,out,slug):
    data=json.loads(source.read_text()); slides=data['slides']; lang='pt' if 'pt' in data['language'].lower() else 'en'
    assert sum(s['durationSeconds'] for s in slides)==data['totalDurationSeconds']
    assert (len(slides)==30 and data['totalDurationSeconds']==180) if lang=='en' else (len(slides)<=7 and data['totalDurationSeconds']==30)
    for d in ('png','jpeg','backgrounds'): (out/d).mkdir(parents=True,exist_ok=True)
    prs=Presentation(); prs.slide_width=Inches(13.333333); prs.slide_height=Inches(7.5)
    pdf=canvas.Canvas(str(out/(slug+'.pdf')),pagesize=(W,H)); elapsed=0
    for s in slides:
        n=int(s['id']); bg,e=render(s,out/'backgrounds',lang,len(slides)); png=out/'png'/f'{n:02d}.png'
        base.render_pil(bg,e,png)
        Image.open(png).resize((960,540),Image.Resampling.LANCZOS).save(out/'jpeg'/f'{n:02d}.jpg',quality=88,optimize=True)
        slide=prs.slides.add_slide(prs.slide_layouts[6]); slide.shapes.add_picture(str(bg),0,0,width=prs.slide_width,height=prs.slide_height); base.ppt_elements(slide,e)
        for sh in slide.shapes:
            if sh.has_text_frame:
                for para in sh.text_frame.paragraphs:
                    for run in para.runs:
                        run.font.name='Liberation Sans'
                        if URL in run.text: run.hyperlink.address=URL
        tr=OxmlElement('p:transition'); tr.set('advClick','0'); tr.set('advTm',str(int(s['durationSeconds']*1000))); tr.append(OxmlElement('p:fade')); slide._element.insert_element_before(tr,'p:timing','p:extLst')
        refs=s.get('sourceIds',[])
        notes=f"{elapsed//60:02d}:{elapsed%60:02d} · {s['durationSeconds']}s\n{s['narration']}\nStatus: {s.get('status','')}\nSource IDs: {', '.join(refs)}\nReference: docs/presentation/v3/SOURCES_EN.md"
        if 'challenge' in refs: notes+='\nhttps://www.spaceappschallenge.org/2026/challenges/junior-astronaut-mission-trainer/'
        if 'wang' in refs: notes+='\nhttps://doi.org/10.1186/s40594-022-00344-0'
        if 'fixture-' in str(s.get('art','')): notes+='\nScreenshot: prepared demo scene; interface shown in Portuguese.'
        slide.notes_slide.notes_text_frame.text=notes
        pdf.drawImage(str(bg),0,0,width=W,height=H); base.pdf_elements(pdf,e)
        if (lang=='en' and n==29) or (lang=='pt' and n==6): pdf.linkURL(URL,(95,H-(1030 if lang=='en' else 930)-35,1700,H-(1030 if lang=='en' else 930)+5),relative=0)
        pdf.showPage(); elapsed+=s['durationSeconds']
    prs.save(out/(slug+'.pptx')); pdf.save()
    cols=5 if len(slides)>7 else 3; rows=math.ceil(len(slides)/cols)
    sheet=Image.new('RGB',(cols*384,rows*216),NAVY)
    for i,s in enumerate(slides): sheet.paste(Image.open(out/'jpeg'/f"{int(s['id']):02d}.jpg").resize((384,216)),((i%cols)*384,(i//cols)*216))
    sheet.save(out/'contact-sheet.png')
    frames=['data:image/jpeg;base64,'+base64.b64encode((out/'jpeg'/f"{int(s['id']):02d}.jpg").read_bytes()).decode() for s in slides]
    durations=[s['durationSeconds'] for s in slides]
    html='''<!doctype html><html lang="LANG"><meta charset="utf-8"><meta name="viewport" content="width=device-width"><title>TITLE</title><style>body{margin:0;background:#081522;color:#fff;font:16px system-ui;display:grid;place-items:center;min-height:100vh}main{width:min(96vw,1600px)}img{display:block;width:100%;aspect-ratio:16/9;object-fit:contain}nav{display:flex;gap:10px;padding:12px;flex-wrap:wrap}button{background:#f6ab64;color:#081522;border:0;padding:12px 18px;min-height:44px;cursor:pointer}span{margin-left:auto}main:fullscreen{width:100vw}</style><main><img id="slide" alt=""><nav><button id="toggle">PLAY</button><button id="prev" aria-label="Previous">←</button><button id="next" aria-label="Next">→</button><button id="full">FULL</button><a href="https://astra-mission-trainer.andrevictorandrade.chatgpt.site" style="color:#fff;padding:12px" target="_blank" rel="noopener">DEMO</a><span id="time"></span></nav></main><script>const frames=FRAMES,durations=DURATIONS,total=durations.reduce((a,b)=>a+b,0);let elapsed=0,playing=false,last=0;const img=document.querySelector('#slide'),label=document.querySelector('#time'),toggle=document.querySelector('#toggle');function idx(){let t=elapsed;for(let i=0;i<durations.length;i++){if(t<durations[i])return i;t-=durations[i]}return durations.length-1}function start(i){return durations.slice(0,i).reduce((a,b)=>a+b,0)}function render(){let i=idx();if(img.dataset.slide!=i){img.src=frames[i];img.dataset.slide=i;img.alt='Slide '+(i+1)+' / '+frames.length}label.textContent=(i+1)+' / '+frames.length+' · '+Math.floor(elapsed)+'s / '+total+'s';toggle.textContent=playing?'PAUSE':elapsed>=total?'RESTART':'PLAY'}function tick(now){if(playing){elapsed=Math.min(total,elapsed+(now-last)/1000);last=now;if(elapsed>=total)playing=false;render()}requestAnimationFrame(tick)}toggle.onclick=()=>{if(elapsed>=total)elapsed=0;playing=!playing;last=performance.now();render()};function go(d){elapsed=start(Math.max(0,Math.min(frames.length-1,idx()+d)));last=performance.now();render()}document.querySelector('#prev').onclick=()=>go(-1);document.querySelector('#next').onclick=()=>go(1);document.querySelector('#full').onclick=()=>document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();document.onkeydown=e=>{if(e.key==='ArrowLeft')go(-1);if(e.key==='ArrowRight')go(1);if(e.key===' '){e.preventDefault();toggle.click()}};render();requestAnimationFrame(tick)</script></html>'''
    for a,b in [('LANG','pt-BR' if lang=='pt' else 'en'),('TITLE',data['title']),('FRAMES',json.dumps(frames)),('DURATIONS',json.dumps(durations)),('PLAY','Iniciar' if lang=='pt' else 'Play'),('PAUSE','Pausar' if lang=='pt' else 'Pause'),('RESTART','Reiniciar' if lang=='pt' else 'Restart'),('FULL','Tela cheia' if lang=='pt' else 'Fullscreen'),('DEMO','Abrir demo' if lang=='pt' else 'Open demo')]: html=html.replace(a,b)
    (out/(slug+'.html')).write_text(html,encoding='utf8')
    (out/'narration.md').write_text('# '+data['title']+'\n\n'+'\n\n'.join(f"**{int(s['id']):02d} · {s['durationSeconds']}s · {s['headline']}**\n\n{s['narration']}" for s in slides)+'\n',encoding='utf8')
    print('Built',out)

def main():
    ap=argparse.ArgumentParser(); ap.add_argument('--output-dir',type=Path,default=Path('/workspace/artifacts/ASTRA-Submission-2026-11-15')); args=ap.parse_args()
    for filename,folder,slug in [('PITCH_EN.json','pitch-en','ASTRA-Pitch-EN-180s'),('ELEVATOR_PT.json','elevator-pt','ASTRA-Elevator-PT-30s')]: build(ROOT/'docs/presentation/v3'/filename,args.output_dir/folder,slug)
if __name__=='__main__': main()
