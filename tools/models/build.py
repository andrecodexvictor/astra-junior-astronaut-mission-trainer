# SPDX-License-Identifier: Apache-2.0
# Original ASTRA AI-assisted geometry, reused from the independent legacy demo.
from pathlib import Path
import bpy, math, random
from mathutils import Vector, Matrix
random.seed(4)
bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)

def mat(n,c,metal=0,rough=.45, emission=0):
 m=bpy.data.materials.new(n); m.diffuse_color=(*c,1); m.use_nodes=True; p=m.node_tree.nodes.get('Principled BSDF'); p.inputs['Base Color'].default_value=(*c,1); p.inputs['Metallic'].default_value=metal; p.inputs['Roughness'].default_value=rough
 if emission: p.inputs['Emission Color'].default_value=(*c,1); p.inputs['Emission Strength'].default_value=emission
 return m
white=mat('ceramic ivory',(.78,.81,.79),.45); dark=mat('graphite joints',(.035,.06,.08),.65); orange=mat('safety orange',(1,.22,.035),.25); cyan=mat('luminous cyan',(.02,.75,.9),.2,emission=2); glass=mat('deep blue glass',(.035,.18,.23),.7,.15); silver=mat('brushed alloy',(.33,.4,.42),.8); green=mat('plant leaves',(.08,.38,.19)); soil=mat('soil',(.18,.10,.06)); solar=mat('solar cells',(.025,.075,.13),.5,.18)
transparent=mat('transparent greenhouse glazing',(.30,.75,.77),.05,.12)
transparent.diffuse_color=(.30,.75,.77,.22)
transparent.node_tree.nodes.get('Principled BSDF').inputs['Alpha'].default_value=.22
if hasattr(transparent,'surface_render_method'): transparent.surface_render_method='DITHERED'
else: transparent.blend_method='BLEND'
def cube(n,loc,scale,ma,bev=.08):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=bpy.context.object; o.name=n; o.dimensions=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True); o.data.materials.append(ma)
 if bev: mod=o.modifiers.new('soft machined edges','BEVEL'); mod.width=bev; mod.segments=3; o.modifiers.new('weighted normals','WEIGHTED_NORMAL')
 return o
def uv(n,loc,scale,ma):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=24,ring_count=12,location=loc); o=bpy.context.object; o.name=n; o.scale=scale; o.data.materials.append(ma); bpy.ops.object.shade_smooth(); return o
def cyl(n,loc,r,depth,ma,axis='Z',vertices=32):
 bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=loc); o=bpy.context.object; o.name=n; o.data.materials.append(ma)
 if axis=='X': o.rotation_euler[1]=math.pi/2
 if axis=='Y': o.rotation_euler[0]=math.pi/2
 bevel=o.modifiers.new('edge highlights','BEVEL'); bevel.width=.045; bevel.segments=2; o.modifiers.new('weighted normals','WEIGHTED_NORMAL'); return o
def export(name):
 bpy.ops.object.select_all(action='SELECT'); bpy.ops.export_scene.gltf(filepath=str(Path(__file__).resolve().parents[2] / 'public' / 'assets' / 'models' / (name+'.glb')),export_format='GLB',use_selection=True,export_apply=True); bpy.ops.object.delete(use_global=False)
# Habitat: horizontal cylindrical lab with segmented shell and luminous door
cyl('pressure hull',(0,0,1.85),1.65,5.4,white,'X')
for x in [-2.65,-1.8,0,1.8,2.65]: cyl('hull reinforcing hoop',(x,0,1.85),1.72,.13,silver,'X')
for x in [-1.5,0,1.5]:
 cube('window frame',(x,-1.54,2.2),(1.05,.14,.75),dark,.15); cube('blue window',(x,-1.63,2.2),(.87,.04,.57),glass,.10); cube('window light',(x,-1.67,2.48),(.65,.025,.035),cyan,.01)
for x in [-2,2]:
 for y in [-1.15,1.15]: cube('landing foot',(x,y,.25),(.55,.55,.5),dark); cube('foot pad',(x,y,.09),(.85,.8,.18),silver)
cyl('airlock rim',(2.8,0,1.85),1.17,.25,dark,'X'); cyl('airlock panel',(2.96,0,1.85),.98,.12,white,'X'); cyl('airlock porthole',(3.04,0,2.05),.43,.08,glass,'X'); cube('airlock stripe',(3.05,0,1.35),(.09,1,.12),orange)
for i in range(4): cube('airlock stair',(3.2+i*.35,0,.15+i*.16),(.4,1.5,.15),silver,.02)
for y in [-.8,.8]:
 for x in [3.2,4.2]: cyl('railing post',(x,y,.65),.035,1.1,silver)
 cube('stair railing',(3.7,y,1.15),(1.2,.06,.06),orange,.02)
for x in [-2.3,2.3]:
 cube('hull seam',(x,-1.57,1.45),(.05,.08,1.0),orange,.01)
 for z in [1.0,1.3,1.6]: uv('hull rivet',(x,-1.63,z),(.045,.025,.045),silver)
cube('roof equipment',(0,0,3.47),(1.7,1,.25),dark); cube('roof antenna',(-.2,0,4),(.08,.08,.85),silver); uv('antenna beacon',(-.2,0,4.48),(.12,.12,.12),cyan)
export('habitat')
# greenhouse dome with visible plants / ribs
cyl('greenhouse foundation',(0,0,.42),2.0,.65,white,vertices=48); cyl('dark floor',(0,0,.77),1.85,.12,dark,vertices=48)
# glass dome made of bands using flattened sphere, styled opaque blue glass
uv('greenhouse glass dome',(0,0,.82),(1.82,1.82,1.9),transparent)
for y in [-.75,.75]:
 cube('grow bed',(0,y,.95),(2.4,.52,.22),white)
 cube('dark growing medium',(0,y,1.08),(2.2,.43,.06),soil,.01)
 for x in [-.85,-.42,0,.42,.85]:
  for dx in [-.09,.09]: uv('lettuce leaves',(x+dx,y,1.25),(.13,.16,.2),green)
for a in range(0,360,45):
 t=math.radians(a); x,y=1.8*math.cos(t),1.8*math.sin(t); cube('dome footing',(x,y,.85),(.12,.12,.3),white)
# meridian ribs curve as bevelled curves
for a in range(0,180,45):
 t=math.radians(a); cu=bpy.data.curves.new('arched structure','CURVE'); cu.dimensions='3D'; cu.bevel_depth=.045; cu.bevel_resolution=3; sp=cu.splines.new('POLY'); sp.points.add(24)
 for i,p in enumerate(sp.points):
  ang=math.pi*i/24; p.co=(1.84*math.cos(ang)*math.cos(t),1.84*math.cos(ang)*math.sin(t),.83+1.92*math.sin(ang),1)
 ob=bpy.data.objects.new('white arch',cu); bpy.context.collection.objects.link(ob); ob.data.materials.append(white)
for a in range(0,360,30):
 t=math.radians(a); uv('leaf',(1.15*math.cos(t),1.15*math.sin(t),1.15),(.24,.13,.32),green)
cyl('greenhouse entrance',(0,-1.9,1.25),.6,.15,orange,'Y'); cube('door glass',(0,-2.01,1.3),(.65,.08,.7),glass)
export('greenhouse')
# solar array
cube('central mast',(0,0,1),(.18,.18,2),silver)
for x in [-1.35,1.35]:
 cube('panel frame',(x,0,2.05),(2.55,2,.12),white); cube('photovoltaic surface',(x,0,2.13),(2.4,1.85,.06),solar)
 for i in range(1,6): cube('cell lines',(x-1.2+i*.4,0,2.17),(.018,1.8,.012),silver,.005)
 for y in [-.45,0,.45]: cube('cell lines',(x,y,2.17),(2.35,.018,.012),silver,.005)
# Tilt panel assembly toward the light around the mast top.
panel_tilt=Matrix.Translation(Vector((0,0,2.05))) @ Matrix.Rotation(math.radians(18),4,'X') @ Matrix.Translation(Vector((0,0,-2.05)))
for obj in list(bpy.context.scene.objects):
 if obj.name.startswith(('panel frame','photovoltaic surface','cell lines')): obj.matrix_world=panel_tilt @ obj.matrix_world
cube('solar ground base',(0,0,.1),(1.2,.8,.2),dark)
export('solar')
# battery
cube('battery chassis',(0,0,.67),(1.55,1.1,1.25),white,.14); cube('battery top',(0,0,1.34),(1.4,1,.15),dark); cube('battery face',(0,-.56,.75),(1.1,.05,.7),dark)
for x in [-.38,-.19,0,.19,.38]: cube('power indicator',(x,-.60,.75),(.1,.03,.38),cyan,.01)
for x in [-.6,.6]: cube('orange corner',(x,-.57,.7),(.13,.06,1.05),orange,.02)
export('battery')
# oxygen
cube('oxygen skid',(0,0,.15),(1.8,1.1,.3),dark)
for x in [-.55,0,.55]:
 cyl('oxygen cylinder',(x,0,.95),.23,1.45,white); uv('tank shoulder',(x,0,1.67),(.23,.23,.18),white); cyl('valve',(x,0,1.91),.07,.3,silver); cube('tank band',(x,-.235,1),(.42,.035,.18),orange,.02)
cube('oxygen status',(0,-.57,.32),(.8,.08,.12),cyan)
export('oxygen')
# Water recycler, with two tanks, pipework and a lit blue control panel
cube('water recycler skid',(0,0,.15),(1.8,1.2,.3),dark)
for x in [-.45,.45]:
 cyl('water filtration tank',(x,0,.9),.31,1.4,white); uv('tank cap',(x,0,1.58),(.31,.31,.16),white); cube('water label',(x,-.31,1.0),(.42,.04,.25),cyan,.02)
cube('control bridge',(0,0,1.73),(1.15,.35,.16),orange); cube('filter display',(0,-.39,.48),(.7,.08,.3),dark); cube('filter status',(0,-.44,.49),(.48,.02,.12),cyan)
export('water')
# Astronaut: articulated limb roots stay as glTF nodes for runtime gait.
def pivot(name,location):
 o=bpy.data.objects.new(name,None); bpy.context.collection.objects.link(o); o.location=location; return o
def child(o,p):
 bpy.context.view_layer.update(); o.parent=p; o.matrix_parent_inverse=p.matrix_world.inverted(); return o
cube('life support backpack',(0,.30,1.12),(.70,.40,.94),white,.12)
cube('backpack orange',(0,.52,1.12),(.48,.05,.55),orange)
for x in [-.24,.24]:
 cyl('backpack oxygen cartridge',(x,.48,1.15),.105,.65,silver)
 cube('backpack light',(x,.535,1.46),(.12,.025,.08),cyan,.01)
uv('spacesuit torso',(0,0,1.07),(.42,.29,.5),white)
cube('chest control',(0,-.29,1.18),(.48,.10,.29),dark)
cube('chest screen',(0,-.35,1.23),(.26,.02,.10),cyan,.01)
for x in [-.14,-.07,0,.07,.14]: uv('control button',(x,-.35,1.08),(.024,.015,.024),orange if x==0 else silver)
for x,side in [(-.24,'L'),(.24,'R')]:
 leg=pivot('LegPivot_'+side,(x,0,.86))
 child(uv('thigh '+side,(x,0,.64),(.18,.19,.29),white),leg)
 child(uv('knee joint '+side,(x,-.015,.43),(.18,.19,.13),dark),leg)
 child(uv('shin '+side,(x,0,.29),(.16,.18,.23),white),leg)
 child(uv('boot '+side,(x,-.12,.12),(.20,.30,.13),dark),leg)
 child(cube('boot toe '+side,(x,-.32,.13),(.30,.12,.15),orange,.03),leg)
 arm=pivot('ArmPivot_'+side,(x*1.8,0,1.35))
 child(uv('shoulder '+side,(x*1.8,0,1.30),(.20,.21,.20),orange),arm)
 child(uv('upper arm '+side,(x*2,0,1.10),(.15,.16,.25),white),arm)
 child(uv('elbow '+side,(x*2,-.01,.91),(.15,.16,.12),dark),arm)
 child(uv('forearm '+side,(x*2,-.015,.79),(.15,.16,.19),white),arm)
 child(uv('glove '+side,(x*2,-.04,.64),(.16,.17,.15),dark),arm)
 child(cube('wrist indicator '+side,(x*2,-.17,.78),(.12,.03,.08),cyan,.01),arm)
uv('helmet',(0,0,1.78),(.41,.37,.40),white)
uv('visor rim',(0,-.30,1.80),(.34,.10,.26),silver)
uv('visor',(0,-.36,1.80),(.30,.06,.22),glass)
for x in [-.12,.12]: uv('visor reflection',(x,-.418,1.84),(.035,.012,.025),cyan)
cube('helmet light',(0,-.36,2.05),(.22,.04,.045),cyan,.01)
export('astronaut')
# Companion: readable face, individual eye nodes, wheel tread and antenna.
for x in [-.38,.38]:
 cube('tracked wheel',(x,0,.25),(.25,.82,.43),dark,.15)
 for y in [-.27,0,.27]: cyl('tread wheel',(x*1.3,y,.25),.12,.07,silver,'X')
 for y in [-.31,-.16,0,.16,.31]: cube('tread grip',(x,y,.46),(.26,.055,.035),silver,.01)
cube('robot body',(0,0,.62),(.75,.65,.62),white,.18)
cube('orange band',(0,-.33,.58),(.6,.06,.12),orange)
for x in [-.22,.22]: cube('body lamp',(x,-.34,.75),(.12,.03,.05),cyan,.01)
head=pivot('PipHeadPivot',(0,0,1.0))
child(uv('robot head',(0,0,1.11),(.39,.32,.31),white),head)
child(cube('robot face',(0,-.30,1.12),(.58,.08,.31),dark,.10),head)
for x,side in [(-.13,'L'),(.13,'R')]: child(uv('PipEye_'+side,(x,-.35,1.14),(.063,.025,.07),cyan),head)
# friendly curved mouth
cu=bpy.data.curves.new('smile curve','CURVE'); cu.dimensions='3D'; cu.bevel_depth=.012; cu.bevel_resolution=2
sp=cu.splines.new('POLY'); sp.points.add(12)
for i,pt in enumerate(sp.points):
 x=-.12+i*.02; pt.co=(x,-.35,1.04+.045*(x/.12)**2,1)
ob=bpy.data.objects.new('Pip smile',cu); bpy.context.collection.objects.link(ob); ob.data.materials.append(cyan); child(ob,head)
child(cube('robot antenna',(0,.05,1.46),(.045,.045,.30),silver),head)
child(uv('antenna tip',(0,.05,1.63),(.08,.08,.08),orange),head)
export('robot')
