import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root=path.dirname(fileURLToPath(import.meta.url));
const d=JSON.parse(await readFile(path.join(root,'design.json'),'utf8'));
for(const folder of ['generated','drawings','pcb','renders','stl']) await mkdir(path.join(root,folder),{recursive:true});
const write=(file,content)=>writeFile(path.join(root,file),content,'utf8');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;');
const f=x=>Number(x.toFixed(4));

// Geometry assertions protect the shared mechanical coordinate system, not electrical correctness.
assert(d.main.width+2*d.case.wall<d.case.width);
assert(d.main.height+2*d.case.wall<d.case.height);
assert(d.battery.z+d.battery.thickness+1<=d.main.z);
assert(d.sensor.z+d.sensor.thickness<d.battery.z);
assert(d.display.z+d.display.thickness===15.6);
assert(d.glass.z+d.glass.thickness===d.case.top);
assert(d.case.strap_gap>d.case.strap);
for(const b of [d.main,d.sensor]) for(const [x,y] of b.holes) {
  assert(Math.abs(x)+b.hole_diameter/2<b.width/2);
  assert(Math.abs(y)+b.hole_diameter/2<b.height/2);
}
for(const c of d.main_components) {
  assert(Math.abs(c.x)+c.w/2<d.main.width/2,`${c.ref}: x envelope outside board`);
  assert(Math.abs(c.y)+c.h/2<d.main.height/2,`${c.ref}: y envelope outside board`);
  assert(d.main.z+d.main.thickness+c.t+0.3<=d.display.z,`${c.ref}: display z clearance`);
}
for(let i=0;i<d.main_components.length;i++) for(let j=i+1;j<d.main_components.length;j++) {
  const a=d.main_components[i],b=d.main_components[j];
  assert(!(Math.abs(a.x-b.x)<(a.w+b.w)/2&&Math.abs(a.y-b.y)<(a.h+b.h)/2),`Overlapping main-board envelopes: ${a.ref}/${b.ref}`);
}
const vars={case_w:d.case.width,case_h:d.case.height,case_r:d.case.radius,case_wall:d.case.wall,case_back:d.case.back,case_body_top:d.case.body_top,main_w:d.main.width,main_h:d.main.height,main_t:d.main.thickness,main_z:d.main.z,main_holes:d.main.holes,sensor_w:d.sensor.width,sensor_h:d.sensor.height,sensor_t:d.sensor.thickness,sensor_z:d.sensor.z,sensor_holes:d.sensor.holes,battery_w:d.battery.width,battery_h:d.battery.height,battery_z:d.battery.z,display_w:d.display.width,display_h:d.display.height,display_z:d.display.z,display_opening:d.display.opening,component_boxes:d.main_components.map(c=>[c.x,c.y,c.w,c.h,c.t])};
await write('generated/dimensions.scad',Object.entries(vars).map(([k,v])=>`${k} = ${JSON.stringify(v)};`).join('\n')+'\n');

const font='Segoe UI, Microsoft YaHei, sans-serif';
function svgStart(w,h,title,subtitle){return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}"><rect width="100%" height="100%" fill="#f6f8fa"/><style>text{font-family:${font};fill:#223644}.title{font-size:34px;font-weight:700}.sub{font-size:16px;fill:#526877}.small{font-size:13px}.label{font-size:16px;font-weight:600}.dim{font-size:15px;fill:#48627a}.note{font-size:15px;fill:#7d543b}</style><text x="52" y="58" class="title">${esc(title)}</text><text x="52" y="90" class="sub">${esc(subtitle)}</text>`;}
const txt=(x,y,s,cls='small',anchor='start')=>`<text x="${x}" y="${y}" class="${cls}" text-anchor="${anchor}">${esc(s)}</text>`;
const line=(x1,y1,x2,y2,color='#7c94a4',width=1.5)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="${width}"/>`;
function rounded(cx,cy,w,h,r,fill,stroke='#3b6477',sw=2){return `<rect x="${cx-w/2}" y="${cy-h/2}" width="${w}" height="${h}" rx="${r}" fill="${fill}" stroke="${stroke}" stroke-width="${sw}"/>`;}
function dimH(x1,x2,y,label){return line(x1,y,x2,y)+line(x1,y-6,x1,y+6)+line(x2,y-6,x2,y+6)+txt((x1+x2)/2,y-9,label,'dim','middle');}
function dimV(x,y1,y2,label){return line(x,y1,x,y2)+line(x-6,y1,x+6,y1)+line(x-6,y2,x+6,y2)+`<text transform="translate(${x-10},${(y1+y2)/2}) rotate(-90)" class="dim" text-anchor="middle">${esc(label)}</text>`;}

let mech=svgStart(1600,1160,'EV WATCH / R0 MECHANICAL','Rounded-square prototype | units: mm | nominal dimensions, not a released manufacturing drawing');
for(const [cx,cy,back,label] of [[350,440,false,'FRONT'],[1110,440,true,'BACK']]){
  const s=9;
  for(const sy of [-1,1]) for(const sx of [-1,1]) mech+=rounded(cx+sx*12.9*s,cy+sy*24*s,3.4*s,6*s,5,'#cbd2d9');
  mech+=rounded(cx,cy,46*s,44*s,8*s,back?'#dbe1e6':'#27323b');
  if(!back){
    mech+=rounded(cx,cy,42*s,40*s,6*s,'#101f29','#344956');
    mech+=rounded(cx,cy,29.4*s,29.4*s,2*s,'#122c38','#4d737d');
    mech+=`<circle cx="${cx}" cy="${cy-12}" r="57" fill="none" stroke="#5ab4b9" stroke-width="9"/>`;
    mech+=`<text x="${cx}" y="${cy+65}" text-anchor="middle" class="label" style="fill:#a9d9dc">EV / DEMO</text>`;
    mech+=rounded(cx+23.8*s,cy-5*s,1.8*s,3*s,7,'#58a3a8');
    mech+=`<text x="${cx}" y="${cy+150}" text-anchor="middle" class="small" style="fill:#9ab4bf">1.54 in / physical key / no touch assumed</text>`;
  }else{
    mech+=rounded(cx,cy,11*s,8*s,2*s,'#26353e');
    mech+=rounded(cx,cy,9*s,6*s,1*s,'#496957','#547a68');
    mech+=rounded(cx-6.5*s,cy-4.5*s,3.5*s,3.5*s,3,'#bfbdab');
    for(const x of [-3,3]) mech+=`<circle cx="${cx+x*s}" cy="${cy+15*s}" r="9" fill="#b59a5b"/>`;
    for(const [x,y] of d.main.holes) mech+=`<circle cx="${cx+x*s}" cy="${cy-y*s}" r="10" fill="#87939d"/>`;
    mech+=txt(cx,cy+80,'PPG window + separate temperature contact','small','middle');
    mech+=txt(cx,cy+175,'2-contact charging dock / 4 rear screws','small','middle');
  }
  mech+=txt(cx,135,label,'label','middle');
  mech+=dimH(cx-23*s,cx+23*s,cy+29*s,'46.0 body width');
  mech+=dimV(cx-27*s,cy-22*s,cy+22*s,'44.0 body height');
  mech+=dimH(cx-11.2*s,cx+11.2*s,cy-30*s,'22.4 strap gap / 22 strap');
}
mech+=txt(55,760,'SECTION / shared Z datum at rear plate outside face','label');
const sx=125,base=1060,ss=13;
mech+=rounded(sx+23*ss,base-8.5*ss,46*ss,17*ss,25,'#e8edf0');
const layers=[
  ['Back plate',0,1.8,46,'#9ba7b2'],['Sensor PCB',3,0.6,16,'#438b77'],['Battery envelope',4.6,4,30,'#a7adb4'],['Main PCB',10,0.8,37.6,'#438b77'],['Tallest component',10.8,2.5,12,'#536a79'],['LCD envelope',13.7,1.9,31.52,'#263f50'],['Cover',16.2,0.8,42,'#73a3ac']
];
for(const [label,z,t,w,c] of layers) mech+=`<rect x="${sx+(46-w)/2*ss}" y="${base-(z+t)*ss}" width="${w*ss}" height="${Math.max(t*ss,3)}" fill="${c}"/>`;
mech+=dimV(95,base-17*ss,base,'17.0 nominal / 17.8 incl. optical boss');
let ly=790;
for(const [label,z,t] of layers){mech+=txt(850,ly,`${label}: Z ${z.toFixed(1)} to ${(z+t).toFixed(1)}`,'label');ly+=36;}
mech+=txt(55,1122,'R0: battery, speaker, antenna, LCD tail, sealing and real assembly tolerances remain supplier-dependent.','note');
mech+='</svg>';
await write('drawings/mechanical.svg',mech);

let pcb=svgStart(1600,1060,'EV WATCH / R0 PCB PLACEMENT','Component BODY / ZONE envelopes, not verified footprints | no netlist, traces or Gerber release');
const cx=350,cy=430,s=15;
pcb+=rounded(cx,cy,d.main.width*s,d.main.height*s,4*s,'#e3f1ed','#2e6a59',3);
for(const [x,y] of d.main.holes) pcb+=`<circle cx="${cx+x*s}" cy="${cy-y*s}" r="${s}" fill="#f6f8fa" stroke="#5c7f78"/>`;
for(const c of d.main_components){
 const x=cx+c.x*s,y=cy-c.y*s;
 pcb+=rounded(x,y,c.w*s,c.h*s,3,c.color,c.color,1);
 const fs=c.w<4?10:12;
 pcb+=`<text x="${x}" y="${y-3}" text-anchor="middle" style="font-size:${fs}px;fill:white;font-weight:600">${c.ref}</text><text x="${x}" y="${y+12}" text-anchor="middle" style="font-size:${fs-1}px;fill:white">${esc(c.name)}</text>`;
}
pcb+=dimH(cx-d.main.width/2*s,cx+d.main.width/2*s,cy+20*s,'37.6');
pcb+=dimV(cx-21*s,cy-d.main.height/2*s,cy+d.main.height/2*s,'35.6');
pcb+=txt(cx,125,'MAIN PCB / F.Cu side view / 4-layer target','label','middle');
pcb+=txt(cx,cy+355,'H1-H4: 2.0 NPTH, pitch 33.6 x 29.6','small','middle');

const dcx=1040,dcy=340,ds=23;
pcb+=rounded(dcx,dcy,16*ds,14*ds,2*ds,'#e3f1ed','#2e6a59',3);
for(const [x,y] of d.sensor.holes) pcb+=`<circle cx="${dcx+x*ds}" cy="${dcy-y*ds}" r="${0.7*ds}" fill="#f6f8fa" stroke="#5c7f78"/>`;
for(const c of d.sensor_components){pcb+=rounded(dcx+c.x*ds,dcy-c.y*ds,c.w*ds,c.h*ds,2,c.color);pcb+=txt(dcx+c.x*ds,dcy-c.y*ds-8,c.ref,'label','middle');}
pcb+=txt(dcx,dcy+60,'U9 / optical face toward skin','small','middle');
pcb+=txt(dcx,125,'SENSOR PCB / skin-facing view reference','label','middle');
pcb+=txt(dcx,153,'Same XY coordinate system as main PCB; not a mirrored footprint drawing','small','middle');
pcb+=dimH(dcx-8*ds,dcx+8*ds,dcy+10*ds,'16.0');
pcb+=dimV(dcx-10*ds,dcy-7*ds,dcy+7*ds,'14.0');
pcb+=txt(800,635,'U10: temperature island / keep away from power heat','label');
pcb+=txt(800,667,'U9: 1.8 V logic + dedicated LED supply + level checks','small');
pcb+=txt(800,699,'FPC: matched return paths; local decoupling; low-noise routing','small');
pcb+=txt(800,731,'RF antenna: upper polymer bridge; copper / battery clearance TBD','small');
pcb+=txt(55,870,'Layer plan','label');
pcb+=txt(55,907,'L1: components + signals   |   L2: continuous GND   |   L3: power + slow signals   |   L4: signals + GND','sub');
pcb+=txt(55,947,'Main 0.8 mm / sensor 0.6 mm are fabrication targets. Confirm stack-up, courtyards and impedance with board house.','small');
pcb+=txt(55,1008,'No electrical pads were invented. Native KiCad files contain mechanical outlines, holes and drawing-layer envelopes only.','note');
pcb+='</svg>';
await write('drawings/pcb-layout.svg',pcb);

function outline(w,h,r,ox=100,oy=100){
 const a=w/2,b=h/2; const p=(x,y)=>[f(ox+x),f(oy-y)];
 const lines=[[[ -a+r,b],[a-r,b]],[[a,b-r],[a,-b+r]],[[a-r,-b],[-a+r,-b]],[[-a,-b+r],[-a,b-r]]];
 const arcs=[[[a-r,b],[a-r+r/Math.sqrt(2),b-r+r/Math.sqrt(2)],[a,b-r]],[[a,-b+r],[a-r+r/Math.sqrt(2),-b+r-r/Math.sqrt(2)],[a-r,-b]],[[-a+r,-b],[-a+r-r/Math.sqrt(2),-b+r-r/Math.sqrt(2)],[-a,-b+r]],[[-a,b-r],[-a+r-r/Math.sqrt(2),b-r+r/Math.sqrt(2)],[-a+r,b]]];
 return {lines:lines.map(l=>l.map(q=>p(...q))),arcs:arcs.map(l=>l.map(q=>p(...q)))};
}
function boardFile(board,components,title){
 const o=outline(board.width,board.height,board.radius);
 const inner=board.layers===4?'(1 "In1.Cu" signal) (2 "In2.Cu" signal) ':'';
 let out=`(kicad_pcb (version 20240108) (generator "pcbnew")\n(general (thickness ${board.thickness}))\n(paper "A4")\n(layers (0 "F.Cu" signal) ${inner}(31 "B.Cu" signal) (36 "B.SilkS" user "b.silkscreen") (37 "F.SilkS" user "f.silkscreen") (38 "B.Mask" user) (39 "F.Mask" user) (40 "Dwgs.User" user "User.Drawings") (44 "Edge.Cuts" user))\n(setup (pad_to_mask_clearance 0))\n`;
 const stroke='(stroke (width 0.05) (type default)) (layer "Edge.Cuts")';
 for(const [a,b] of o.lines) out+=`(gr_line (start ${a.join(' ')}) (end ${b.join(' ')}) ${stroke})\n`;
 for(const [a,m,b] of o.arcs) out+=`(gr_arc (start ${a.join(' ')}) (mid ${m.join(' ')}) (end ${b.join(' ')}) ${stroke})\n`;
 board.holes.forEach(([x,y],i)=>{
  out+=`(footprint "EV_Concept:NPTH_${board.hole_diameter}mm" (layer "F.Cu") (at ${f(100+x)} ${f(100-y)}) (attr through_hole) (property "Reference" "H${i+1}" (at 0 -2) (layer "F.SilkS") (effects (font (size 0.8 0.8) (thickness 0.12)))) (pad "" np_thru_hole circle (at 0 0) (size ${board.hole_diameter} ${board.hole_diameter}) (drill ${board.hole_diameter}) (layers "*.Cu" "*.Mask")))\n`;
 });
 for(const c of components){
  out+=`(gr_rect (start ${f(100+c.x-c.w/2)} ${f(100-c.y-c.h/2)}) (end ${f(100+c.x+c.w/2)} ${f(100-c.y+c.h/2)}) (stroke (width 0.15) (type default)) (fill none) (layer "Dwgs.User"))\n`;
  out+=`(gr_text "${c.ref} ${c.name}" (at ${f(100+c.x)} ${f(100-c.y)}) (layer "Dwgs.User") (effects (font (size 0.55 0.55) (thickness 0.1))))\n`;
 }
 out+=`(gr_text "${title} - R0 MECHANICAL PLACEMENT ONLY" (at 100 74) (layer "Dwgs.User") (effects (font (size 1 1) (thickness 0.15))))\n(gr_text "NO NETLIST / NO ROUTING / NOT FOR FABRICATION" (at 100 124) (layer "Dwgs.User") (effects (font (size 0.8 0.8) (thickness 0.12))))\n)\n`;
 let balance=0;for(const ch of out.replace(/"[^"\\]*(?:\\.[^"\\]*)*"/g,'')){if(ch==='(')balance++;if(ch===')')balance--;assert(balance>=0);}assert.equal(balance,0);
 return out;
}
await write('pcb/ev-main-placement.kicad_pcb',boardFile(d.main,d.main_components,'EV MAIN'));
await write('pcb/ev-sensor-placement.kicad_pcb',boardFile(d.sensor,d.sensor_components,'EV SENSOR'));
await write('generated/bom-candidates.json',JSON.stringify({status:d.status,main:d.main_components,sensor:d.sensor_components,sources:d.sources},null,2));
await write('generated/geometry-checks.json',JSON.stringify({revision:d.revision,checks:['board and battery envelopes','layer Z gaps','mounting-hole centers','main component envelope bounds','main component envelope non-overlap','KiCad S-expression balance'],passed:true,limitations:['Not an electrical DRC/ERC','No verified package land patterns','No RF/thermal/acoustic/optical simulation','Full supplier courtyards, routing and assembly fits not validated']},null,2));
console.log('Generated mechanical SVG, PCB-placement SVG, two KiCad mechanical boards and shared OpenSCAD dimensions. Geometry checks passed.');
