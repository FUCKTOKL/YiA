import {spawn} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
const root=path.dirname(fileURLToPath(import.meta.url));
const browser=process.argv[2];
if(!browser)throw new Error('Usage: node render-drawings.mjs <Chrome-or-Edge-executable>');
const results=await Promise.all([['mechanical',1600,1160],['pcb-layout',1600,1060]].map(([name,w,h])=>new Promise(resolve=>{
 const args=['--headless','--disable-gpu','--hide-scrollbars','--no-first-run','--no-default-browser-check','--force-device-scale-factor=1',`--user-data-dir=${path.join(os.tmpdir(),`ev-cad-${name}`)}`,`--window-size=${w},${h}`,`--screenshot=${path.join(root,'renders',`${name}.png`)}`,pathToFileURL(path.join(root,'drawings',`${name}.svg`)).href];
 const proc=spawn(browser,args,{windowsHide:true});let log='';
 proc.stderr.on('data',x=>log+=x);
 const timer=setTimeout(()=>{proc.kill();resolve({name,error:'Browser render timeout'});},45000);
 proc.on('error',error=>{clearTimeout(timer);resolve({name,error:String(error)});});
 proc.on('close',code=>{clearTimeout(timer);resolve({name,code,log:log.slice(-400)});});
})));
for(const result of results)console.log(JSON.stringify(result));
if(results.some(x=>x.code!==0))process.exitCode=1;
