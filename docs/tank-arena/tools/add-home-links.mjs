// Run against your current homepage to preserve its other games and custom styling.
import {readFileSync,writeFileSync,copyFileSync,constants} from 'node:fs';import {resolve} from 'node:path';
const path=resolve(process.argv[2]||'website/index.html');let html=readFileSync(path,'utf8');
const wanted=[['arena','Tank Arena','Multiplayer PvP'],['frontier','Tank Frontier','Explore, gather, and build together']];
const missing=wanted.filter(([route])=>!new RegExp('href=["\'](?:\\./|/)?'+route+'/?(?:index\\.html)?["\']','i').test(html));
if(!missing.length){console.log('Both game links are already present.');process.exit(0);}
const cards=missing.map(([route,title,description])=>`<a href="./${route}/"><div><b>${title}</b><p>${description}</p></div><span>Play →</span></a>`).join('');
const start=/<div\b[^>]*class=["'][^"']*\bgames\b[^"']*["'][^>]*>/i.exec(html);let insert=-1;
if(start){const tags=/<\/?div\b[^>]*>/gi;tags.lastIndex=start.index+start[0].length;let depth=1,m;while((m=tags.exec(html))){depth+=m[0].startsWith('</')?-1:1;if(depth===0){insert=m.index;break;}}}
if(insert>=0)html=html.slice(0,insert)+cards+html.slice(insert);else{const block='<nav aria-label="Multiplayer games" style="display:flex;gap:20px;flex-wrap:wrap;padding:24px">'+missing.map(([route,title])=>`<a href="./${route}/">${title} →</a>`).join('')+'</nav>';const end=html.lastIndexOf('</main>');if(end<0)throw new Error('No main element found. Add links to /arena/ and /frontier/ in your navigation.');html=html.slice(0,end)+block+html.slice(end);}
const backup=path+'.before-multiplayer';copyFileSync(path,backup,constants.COPYFILE_EXCL);writeFileSync(path,html);console.log('Added game links. Original saved to '+backup);
