#!/usr/bin/env python3
"""Export the authored English ASTRA dossier as PDF and editable Word."""
from pathlib import Path
import argparse, re, shutil
from xml.sax.saxutils import escape
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Image as PDFImage
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib import colors
from docx import Document
from docx.shared import Inches, Pt, RGBColor
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
import docx.opc.constants
ROOT=Path(__file__).resolve().parents[1]

def inline(s):
    s=escape(s)
    s=re.sub(r'\[([^\]]+)\]\(([^)]+)\)',lambda m:'<a color="#14727a" href="'+escape(resolve_url(m.group(2)),{'"':'&quot;'})+'">'+m.group(1)+'</a>',s)
    s=re.sub(r'\*\*([^*]+)\*\*',r'<b>\1</b>',s)
    s=re.sub(r'(?<!\*)\*([^*]+)\*(?!\*)',r'<i>\1</i>',s)
    return re.sub(r'`([^`]+)`',r'<font face="Courier">\1</font>',s)

def resolve_url(url):
    if url.startswith(('https://','http://')):return url
    p=(ROOT/'docs/delivery'/url).resolve()
    return 'https://github.com/andrecodexvictor/astra-junior-astronaut-mission-trainer/blob/main/'+str(p.relative_to(ROOT))

def add_word_text(p,s):
    # Native runs and hyperlinks preserve editability.
    pattern=re.compile(r'\[([^\]]+)\]\(([^)]+)\)|\*\*([^*]+)\*\*|`([^`]+)`')
    pos=0
    for m in pattern.finditer(s):
        p.add_run(s[pos:m.start()])
        if m.group(1):
            rel=p.part.relate_to(resolve_url(m.group(2)),docx.opc.constants.RELATIONSHIP_TYPE.HYPERLINK,is_external=True)
            h=OxmlElement('w:hyperlink');h.set(qn('r:id'),rel)
            run=OxmlElement('w:r');props=OxmlElement('w:rPr');c=OxmlElement('w:color');c.set(qn('w:val'),'14727A');props.append(c);run.append(props);t=OxmlElement('w:t');t.text=m.group(1);run.append(t);h.append(run);p._p.append(h)
        elif m.group(3):p.add_run(m.group(3)).bold=True
        else:p.add_run(m.group(4)).font.name='Consolas'
        pos=m.end()
    p.add_run(s[pos:])

def main():
    ap=argparse.ArgumentParser();ap.add_argument('--output-dir',type=Path,required=True);ap.add_argument('--logo',type=Path);args=ap.parse_args();args.output_dir.mkdir(parents=True,exist_ok=True)
    source=ROOT/'docs/delivery/PROJECT_DOSSIER_EN.md';text=source.read_text();out=args.output_dir
    styles=getSampleStyleSheet();styles['Normal'].fontName='Helvetica';styles['Normal'].fontSize=10.5;styles['Normal'].leading=15;styles['Normal'].textColor=colors.HexColor('#17283e');styles['Normal'].spaceAfter=9
    for name in ['Heading1','Heading2']:styles[name].textColor=colors.HexColor('#17283e');styles[name].fontName='Helvetica-Bold';styles[name].keepWithNext=True
    styles['Heading1'].fontSize=26;styles['Heading1'].leading=31;styles['Heading1'].spaceAfter=14;styles['Heading2'].fontSize=15;styles['Heading2'].leading=19;styles['Heading2'].spaceBefore=16;styles['Heading2'].spaceAfter=10
    styles.add(ParagraphStyle(name='BulletItem',parent=styles['Normal'],leftIndent=15,firstLineIndent=-10))
    flow=[];doc=Document();sec=doc.sections[0];sec.top_margin=Inches(.65);sec.bottom_margin=Inches(.65);sec.left_margin=sec.right_margin=Inches(.7)
    normal=doc.styles['Normal'];normal.font.name='Arial';normal.font.size=Pt(10.5);normal.paragraph_format.space_after=Pt(7)
    for n in ['Title','Heading 1','Heading 2']:doc.styles[n].font.name='Arial';doc.styles[n].font.color.rgb=RGBColor.from_string('17283E')
    if args.logo and args.logo.is_file():flow.extend([PDFImage(str(args.logo),width=225,height=225*150/790),Spacer(1,16)]);doc.add_picture(str(args.logo),width=Inches(2.8))
    for line in text.splitlines():
        if not line.strip():continue
        if line.startswith('# '):flow.append(Paragraph(inline(line[2:]),styles['Heading1']));doc.add_heading(line[2:],0)
        elif line.startswith('## '):flow.append(Paragraph(inline(line[3:]),styles['Heading2']));doc.add_heading(line[3:],1)
        elif line.startswith('- '):flow.append(Paragraph('• '+inline(line[2:]),styles['BulletItem']));add_word_text(doc.add_paragraph(style='List Bullet'),line[2:])
        elif re.match(r'^\d+\. ',line):
            body=re.sub(r'^\d+\. ','',line);flow.append(Paragraph(inline(line),styles['BulletItem']));add_word_text(doc.add_paragraph(style='List Number'),body)
        else:
            flow.append(Paragraph(inline(line),styles['Normal']));p=doc.add_paragraph();add_word_text(p,line.strip('*') if line.startswith('*') and line.endswith('*') else line)
    def footer(c,d):
        c.setStrokeColor(colors.HexColor('#ED8B35'));c.setLineWidth(1.5);c.line(43,36,552,36);c.setFont('Helvetica',8);c.setFillColor(colors.HexColor('#536276'));c.drawString(43,24,'ASTRA / PROJECT DOSSIER / INDEPENDENT PROTOTYPE');c.drawRightString(552,24,str(d.page))
    SimpleDocTemplate(str(out/'ASTRA-Project-Dossier-EN.pdf'),pagesize=(595.28,841.89),leftMargin=43,rightMargin=43,topMargin=42,bottomMargin=50,title='ASTRA — Project dossier',author='ASTRA project').build(flow,onFirstPage=footer,onLaterPages=footer)
    doc.core_properties.title='ASTRA — Project dossier';doc.core_properties.subject='What it does, how it works, technologies, evidence and production vision';doc.core_properties.author='ASTRA project'
    foot=sec.footer.paragraphs[0];foot.text='ASTRA / PROJECT DOSSIER / INDEPENDENT PROTOTYPE';foot.style=doc.styles['Caption']
    doc.save(out/'ASTRA-Project-Dossier-EN.docx');shutil.copy2(source,out/'ASTRA-Project-Dossier-EN.md')
    print('Built',out/'ASTRA-Project-Dossier-EN.pdf');print('Built',out/'ASTRA-Project-Dossier-EN.docx')
if __name__=='__main__':main()
