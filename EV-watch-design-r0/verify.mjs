import assert from 'node:assert/strict';
import {readFile,readdir,stat,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const design=JSON.parse(await readFile(path.join(root,'design.json'),'utf8'));
const results=[];

for(const [filename,expected] of [['case-body.stl',[[-23,-27,1.8],[23,27,16.2]]],['case-back.stl',[[-23,-22,-0.8],[23,22,3]]]]){
 const text=await readFile(path.join(root,'stl',filename),'utf8');
 const vertices=[...text.matchAll(/vertex\s+([-+\deE.]+)\s+([-+\deE.]+)\s+([-+\deE.]+)/g)].map(m=>m.slice(1).map(Number));
 assert(vertices.length>0&&vertices.length%3===0,`${filename}: missing triangles`);
 const key=v=>v.map(x=>Math.round(x*1e6)).join(',');
 const edges=new Map(),adj=new Map();let volume=0;
 const bounds=[[Infinity,Infinity,Infinity],[-Infinity,-Infinity,-Infinity]];
 for(let i=0;i<vertices.length;i+=3){
  const [a,b,c]=vertices.slice(i,i+3),keys=[a,b,c].map(key);
  assert.equal(new Set(keys).size,3,`${filename}: degenerate triangle`);
  volume+=(a[0]*(b[1]*c[2]-b[2]*c[1])-a[1]*(b[0]*c[2]-b[2]*c[0])+a[2]*(b[0]*c[1]-b[1]*c[0]))/6;
  for(const v of [a,b,c])for(let axis=0;axis<3;axis++){bounds[0][axis]=Math.min(bounds[0][axis],v[axis]);bounds[1][axis]=Math.max(bounds[1][axis],v[axis]);}
  for(let n=0;n<3;n++){
   const p=keys[n],q=keys[(n+1)%3],edge=[p,q].sort().join('|');
   edges.set(edge,(edges.get(edge)??0)+1);
   if(!adj.has(p))adj.set(p,new Set());if(!adj.has(q))adj.set(q,new Set());adj.get(p).add(q);adj.get(q).add(p);
  }
 }
 assert([...edges.values()].every(count=>count===2),`${filename}: mesh is not closed two-manifold by edge count`);
 const remaining=new Set(adj.keys());let components=0;
 while(remaining.size){components++;const stack=[remaining.values().next().value];while(stack.length){const item=stack.pop();if(!remaining.delete(item))continue;for(const neighbor of adj.get(item))if(remaining.has(neighbor))stack.push(neighbor);}}
 assert.equal(components,1,`${filename}: disconnected solids`);
 for(let side=0;side<2;side++)for(let axis=0;axis<3;axis++)assert(Math.abs(bounds[side][axis]-expected[side][axis])<1e-4,`${filename}: unexpected bounds`);
 assert(Math.abs(volume)>100,`${filename}: negligible volume`);
 results.push({file:filename,triangles:vertices.length/3,closed_edge_count:true,connected_components:components,bounds_mm:bounds,volume_mm3:Math.round(Math.abs(volume))});
}

let localLinks=0;
for(const filename of (await readdir(root)).filter(x=>x.endsWith('.md'))){
 const content=new TextDecoder('utf-8',{fatal:true}).decode(await readFile(path.join(root,filename)));
 assert.equal((content.match(/^```/gm)??[]).length%2,0);
 for(const match of content.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/g)){
  if(/^https?:\/\//.test(match[1])){new URL(match[1]);continue;}
  await stat(path.isAbsolute(match[1])?match[1]:path.resolve(root,match[1]));localLinks++;
 }
}
for(const [filename,layers,holes] of [['ev-main-placement.kicad_pcb',4,design.main.holes.length],['ev-sensor-placement.kicad_pcb',2,design.sensor.holes.length]]){
 const text=await readFile(path.join(root,'pcb',filename),'utf8');
 assert.equal((text.match(/"(?:F|B|In\d)\.Cu" signal/g)??[]).length,layers);
 assert.equal((text.match(/np_thru_hole/g)??[]).length,holes);
 assert(!/\(segment|\(via\s|\(net\s/.test(text),'Placement board must not imply completed routing');
}
const report={revision:'R0',mesh_checks:results,local_links_checked:localLinks,status:'passed',not_checked:['Electrical correctness / schematic ERC / PCB DRC','KiCad import / production land patterns','Supplier fits and manufacturing tolerances','Optical, RF, acoustic, thermal and battery testing','Medical performance']};
await writeFile(path.join(root,'generated','validation-report.json'),JSON.stringify(report,null,2),'utf8');
console.log(JSON.stringify(report));
