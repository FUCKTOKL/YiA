import {spawn} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const executable=process.argv[2];
if(!executable) throw new Error('Usage: node render-cad.mjs <path-to-openscad.com>');
const jobs=[
 ['body','stl/case-body.stl',[]],
 ['back','stl/case-back.stl',[]],
 ['main_outline','pcb/main-outline.dxf',[]],
 ['sensor_outline','pcb/sensor-outline.dxf',[]],
 ['assembly','renders/cad-assembly.png',['--imgsize=1400,1100','--viewall','--autocenter','--projection=o','--camera=0,0,8,58,0,32,130']],
 ['exploded','renders/cad-exploded.png',['--imgsize=1400,1200','--viewall','--autocenter','--projection=o','--camera=0,0,20,65,0,30,180']]
];
const results=await Promise.all(jobs.map(([part,file,extra])=>new Promise(resolve=>{
 const args=['-o',path.join(root,file),'-D',`part="${part}"`,...extra,path.join(root,'enclosure.scad')];
 const proc=spawn(executable,args,{cwd:root,windowsHide:true});
 let log='';proc.stdout.on('data',x=>log+=x);proc.stderr.on('data',x=>log+=x);
 proc.on('error',error=>resolve({file,code:-1,log:String(error)}));
 proc.on('close',code=>resolve({file,code,log:log.slice(-1600)}));
})));
for(const result of results)console.log(JSON.stringify(result));
if(results.some(x=>x.code!==0))process.exitCode=1;
