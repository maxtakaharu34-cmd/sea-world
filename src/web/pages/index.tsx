import { useRef, useEffect, useCallback, useState } from 'react';
import { CANVAS_W, CANVAS_H, POWERUP_CONFIG } from '../game/constants';
import type { CharId } from '../game/constants';
import { Player, Platform, Coin, Powerup, Enemy, buildLevel, rectsOverlap } from '../game/entities';
import type { LevelData } from '../game/levels';
import { initAudio, sfxJump, sfxCoin, sfxHit, sfxPowerup, sfxDie, sfxClear, sfxStep } from '../game/sounds';

const SEA_CHARS=[
  {id:'diver',  name:'Diver', color:'#b3e5fc',accent:'#f57f17',hat:'#ffd54f'},
  {id:'mermaid',name:'Mermy', color:'#80cbc4',accent:'#e040fb',hat:'#f8bbd9'},
  {id:'crab',   name:'Crab',  color:'#ef9a9a',accent:'#ffd180',hat:'#ff5252'},
];
const SEA_LEVELS:LevelData[]=[
  {id:1,name:'Coral Coast',bgColors:['#006064','#00838f'] as [string,string],width:3200,spawnX:80,spawnY:300,goal:{x:3100,y:200},
    platforms:[{x:0,y:400,w:360},{x:430,y:380,w:200},{x:690,y:350,w:180},{x:940,y:320,w:200},{x:1200,y:300,w:180,type:'moving'},{x:1460,y:270,w:200},{x:1720,y:250,w:180},{x:1980,y:230,w:200,type:'cloud'},{x:2240,y:250,w:180},{x:2500,y:230,w:200},{x:2760,y:210,w:180,type:'moving'},{x:3000,y:220,w:260},{x:280,y:310,w:120},{x:580,y:280,w:100}],
    coins:[{x:300,y:270},{x:332,y:270},{x:1480,y:230},{x:1512,y:230},{x:2520,y:190},{x:2552,y:190},{x:3020,y:180},{x:3052,y:180}],
    powerups:[{x:598,y:240,type:'speed'},{x:1480,y:220,type:'star'},{x:2250,y:210,type:'double_jump'}],
    enemies:[{x:150,y:368,type:'walk'},{x:460,y:348,type:'walk'},{x:760,y:318,type:'fly'},{x:1020,y:288,type:'jump'},{x:1520,y:238,type:'walk'},{x:1820,y:218,type:'fly'},{x:2120,y:198,type:'jump'},{x:2620,y:198,type:'walk'}]},
  {id:2,name:'Pirate Bay',bgColors:['#004d40','#00695c'] as [string,string],width:3600,spawnX:80,spawnY:350,goal:{x:3500,y:160},
    platforms:[{x:0,y:420,w:280},{x:360,y:390,w:200},{x:630,y:360,w:180,type:'moving'},{x:900,y:320,w:200},{x:1170,y:290,w:180},{x:1440,y:260,w:200,type:'cloud'},{x:1710,y:230,w:180},{x:1980,y:210,w:200},{x:2250,y:230,w:180,type:'moving'},{x:2520,y:210,w:200},{x:2790,y:190,w:180},{x:3060,y:170,w:200,type:'moving'},{x:3330,y:180,w:180},{x:3510,y:170,w:180}],
    coins:[{x:380,y:350},{x:650,y:320},{x:682,y:320},{x:1460,y:220},{x:1492,y:220},{x:2540,y:170},{x:3530,y:130},{x:3562,y:130}],
    powerups:[{x:920,y:280,type:'shield'},{x:2000,y:170,type:'double_jump'},{x:3350,y:140,type:'star'}],
    enemies:[{x:200,y:388,type:'walk'},{x:420,y:358,type:'fly'},{x:720,y:328,type:'jump'},{x:1020,y:288,type:'walk'},{x:1320,y:258,type:'fly'},{x:1620,y:198,type:'jump'},{x:1920,y:178,type:'walk'},{x:2320,y:198,type:'fly'},{x:2620,y:158,type:'jump'},{x:2920,y:138,type:'walk'}]},
  {id:3,name:'Abyssal Depths',bgColors:['#1a0030','#003040'] as [string,string],width:4000,spawnX:80,spawnY:360,goal:{x:3900,y:150},
    platforms:[{x:0,y:400,w:240},{x:320,y:370,w:180,type:'moving'},{x:580,y:340,w:200},{x:860,y:300,w:180},{x:1120,y:270,w:200,type:'cloud'},{x:1400,y:240,w:180},{x:1660,y:210,w:200,type:'moving'},{x:1940,y:230,w:180},{x:2200,y:200,w:200},{x:2480,y:180,w:180,type:'cloud'},{x:2740,y:200,w:200,type:'moving'},{x:3020,y:170,w:180},{x:3280,y:150,w:200},{x:3560,y:170,w:180,type:'moving'},{x:3820,y:160,w:280}],
    coins:[{x:340,y:330},{x:600,y:300},{x:632,y:300},{x:1140,y:230},{x:1172,y:230},{x:2500,y:140},{x:3840,y:120},{x:3872,y:120}],
    powerups:[{x:880,y:260,type:'speed'},{x:1680,y:170,type:'double_jump'},{x:2760,y:160,type:'star'},{x:3840,y:120,type:'shield'}],
    enemies:[{x:140,y:368,type:'walk'},{x:380,y:338,type:'jump'},{x:640,y:308,type:'fly'},{x:920,y:268,type:'walk'},{x:1220,y:238,type:'jump'},{x:1520,y:208,type:'fly'},{x:1820,y:198,type:'walk'},{x:2120,y:168,type:'fly'},{x:2520,y:148,type:'jump'},{x:2820,y:138,type:'walk'},{x:3120,y:118,type:'fly'},{x:3420,y:138,type:'jump'}]},
];
type Screen='menu'|'playing'|'level_complete'|'gameover';
function rr(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(ctx.canvas.width,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}
function rr2(ctx:CanvasRenderingContext2D,x:number,y:number,w:number,h:number,r:number){ctx.beginPath();ctx.moveTo(x+r,y);ctx.lineTo(x+w-r,y);ctx.quadraticCurveTo(x+w,y,x+w,y+r);ctx.lineTo(x+w,y+h-r);ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h);ctx.lineTo(x+r,y+h);ctx.quadraticCurveTo(x,y+h,x,y+h-r);ctx.lineTo(x,y+r);ctx.quadraticCurveTo(x,y,x+r,y);ctx.closePath();}

function draw(ctx:CanvasRenderingContext2D,players:Player[],platforms:Platform[],coins:Coin[],powerups:Powerup[],enemies:Enemy[],camX:number,lvl:LevelData,level:number,total:number){
  const g=ctx.createLinearGradient(0,0,0,CANVAS_H);g.addColorStop(0,lvl.bgColors[0]);g.addColorStop(1,lvl.bgColors[1]);ctx.fillStyle=g;ctx.fillRect(0,0,CANVAS_W,CANVAS_H);
  // Bubbles
  ctx.globalAlpha=0.12;for(let i=0;i<15;i++){const px=((i*140-camX*0.06)%(CANVAS_W+40)+CANVAS_W+40)%CANVAS_W;const py=(Date.now()/30+i*80)%CANVAS_H;ctx.fillStyle='#80deea';ctx.beginPath();ctx.arc(px,py,3+i%4,0,Math.PI*2);ctx.fill();}
  ctx.globalAlpha=0.08;ctx.font='20px Arial';for(let i=0;i<8;i++){const px=((i*200-camX*0.1)%(CANVAS_W+40)+CANVAS_W+40)%CANVAS_W;const py=(i*80+100)%CANVAS_H;ctx.fillText(['🐠','🐡','🦑','🦀','🐙'][i%5],px,py);}ctx.globalAlpha=1;
  ctx.save();ctx.translate(-camX,0);
  platforms.forEach(p=>{
    if(p.type==='cloud'){ctx.fillStyle='#ff8f00';rr2(ctx,p.x,p.y,p.w,p.h,6);ctx.fill();ctx.strokeStyle='#ffd54f';ctx.lineWidth=1;rr2(ctx,p.x,p.y,p.w,p.h,6);ctx.stroke();ctx.font='12px Arial';ctx.textAlign='center';for(let i=0;i<Math.floor(p.w/30);i++)ctx.fillText('🪸',p.x+15+i*28,p.y+p.h*0.7);}
    else if(p.type==='moving'){ctx.fillStyle='#004d40';rr2(ctx,p.x,p.y,p.w,p.h,4);ctx.fill();ctx.shadowColor='#00bfa5';ctx.shadowBlur=8;ctx.strokeStyle='#00bfa5';ctx.lineWidth=1.5;rr2(ctx,p.x,p.y,p.w,p.h,4);ctx.stroke();ctx.shadowBlur=0;}
    else{const pg=ctx.createLinearGradient(p.x,p.y,p.x,p.y+p.h);pg.addColorStop(0,'#00897b');pg.addColorStop(1,'#004d40');ctx.fillStyle=pg;rr2(ctx,p.x,p.y,p.w,p.h,3);ctx.fill();ctx.strokeStyle='#26a69a';ctx.lineWidth=0.8;ctx.strokeRect(p.x,p.y,p.w,p.h);ctx.font='10px Arial';ctx.textAlign='left';for(let i=0;i<Math.floor(p.w/24);i++)ctx.fillText('🌊',p.x+2+i*22,p.y+p.h-2);}
  });
  coins.forEach(c=>{if(c.collected)return;ctx.font='16px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText('🐚',c.x+8,c.y+8);});
  powerups.forEach(pu=>{if(pu.collected)return;const em:Record<string,string>={star:'⭐',shield:'🐠',speed:'🦈',double_jump:'🦑',coin_magnet:'🧲'};ctx.font='18px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(em[pu.type]||'⭐',pu.x+11+pu.bobOffset,pu.y+11+pu.bobOffset*0.5);});
  enemies.forEach(e=>{
    if(!e.alive)return;const cx=e.x+e.w/2,cy=e.y+e.h/2;ctx.save();ctx.translate(cx,cy);if(e.facing===1)ctx.scale(-1,1);
    const sea_em={walk:'🦀',fly:'🪼',jump:'🦞'}[e.type];
    ctx.font='24px Arial';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(sea_em,0,0);ctx.restore();
  });
  players.forEach(p=>{
    if(!p.alive)return;const char=SEA_CHARS.find(c=>c.id===p.charId)||SEA_CHARS[0];
    const cx=p.x+p.w/2,cy=p.y+p.h/2;ctx.save();ctx.translate(cx,cy);if(p.facing===-1)ctx.scale(-1,1);
    if(p.isInvincible)ctx.globalAlpha=0.5+0.5*Math.sin(Date.now()/80);
    if(p.hasPowerup('star')){ctx.shadowColor='#FFD700';ctx.shadowBlur=18;}
    const bob=p.onGround&&(p.animFrame===1||p.animFrame===3)?1:0;
    // Wetsuit body
    ctx.fillStyle=char.color;ctx.beginPath();ctx.ellipse(0,3+bob,11,13,0,0,Math.PI*2);ctx.fill();
    ctx.fillStyle=char.accent;ctx.beginPath();ctx.ellipse(2,5+bob,6,9,0.1,0,Math.PI*2);ctx.fill();
    // Head
    ctx.fillStyle=char.color;ctx.beginPath();ctx.ellipse(-1,-4+bob,9,10,0,0,Math.PI*2);ctx.fill();
    // Diving mask
    ctx.fillStyle=char.hat+'cc';ctx.beginPath();ctx.ellipse(2,-3+bob,8,8,0.1,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle='#333';ctx.lineWidth=1.5;ctx.beginPath();ctx.ellipse(2,-3+bob,8,8,0.1,0,Math.PI*2);ctx.stroke();
    ctx.fillStyle='#fff';ctx.beginPath();ctx.arc(-2,-5+bob,1,0,Math.PI*2);ctx.fill();
    // Fins for swimming
    if(!p.onGround){const ft=Date.now()/200;ctx.fillStyle=char.accent;ctx.beginPath();ctx.ellipse(-5,15+Math.sin(ft)*3+bob,4,6,0.3,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(5,15+Math.sin(ft+Math.PI)*3+bob,4,6,-0.3,0,Math.PI*2);ctx.fill();}
    else{const step=Math.sin(p.animFrame*Math.PI/2)*3;ctx.fillStyle=char.color;ctx.beginPath();ctx.ellipse(-4,15+step+bob,3,4,-0.2,0,Math.PI*2);ctx.fill();ctx.beginPath();ctx.ellipse(4,15-step+bob,3,4,0.2,0,Math.PI*2);ctx.fill();}
    const arm=p.onGround?Math.sin(p.animFrame*Math.PI/2)*4:0;ctx.fillStyle=char.color;ctx.beginPath();ctx.ellipse(-13,2+arm+bob,4,3,-0.4,0,Math.PI*2);ctx.fill();
    ctx.shadowBlur=0;ctx.globalAlpha=1;ctx.restore();
  });
  const gx=lvl.goal.x,gy=lvl.goal.y;ctx.strokeStyle='#aaa';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(gx+12,gy+60);ctx.lineTo(gx+12,gy);ctx.stroke();ctx.fillStyle='#00bfa5';ctx.beginPath();ctx.moveTo(gx+12,gy);ctx.lineTo(gx+42,gy+12);ctx.lineTo(gx+12,gy+24);ctx.closePath();ctx.fill();ctx.font='14px Arial';ctx.textAlign='center';ctx.fillText('🏴‍☠️',gx+22,gy+18);ctx.fillStyle='#26a69a';ctx.beginPath();ctx.ellipse(gx+12,gy+62,10,4,0,0,Math.PI*2);ctx.fill();
  ctx.restore();
  players.forEach((p,i)=>{const ox=i===0?10:CANVAS_W-180;ctx.fillStyle='rgba(0,40,40,0.6)';rr2(ctx,ox,8,165,48,8);ctx.fill();ctx.fillStyle='#80cbc4';ctx.font='bold 13px monospace';ctx.fillText(`P${i+1} ${SEA_CHARS.find(c=>c.id===p.charId)?.name||'Diver'}`,ox+10,26);ctx.fillStyle='#4dd0e1';ctx.font='bold 12px monospace';ctx.fillText(`🐚 ${p.coins}`,ox+10,43);ctx.fillStyle='#fff';ctx.fillText(`${p.score}pt`,ox+65,43);});
  ctx.fillStyle='rgba(0,40,40,0.6)';rr2(ctx,CANVAS_W/2-60,8,120,28,8);ctx.fill();ctx.fillStyle='#80cbc4';ctx.font='bold 13px monospace';ctx.textAlign='center';ctx.fillText(`LEVEL ${level} / ${total}`,CANVAS_W/2,26);ctx.textAlign='left';
}

export default function Index(){
  const canvasRef=useRef<HTMLCanvasElement>(null);const[screen,setScreen]=useState<Screen>('menu');const[p1Char,setP1Char]=useState('diver');const[currentLevel,setCurrentLevel]=useState(1);const[soundOn,setSoundOn]=useState(true);
  const screenRef=useRef<Screen>('menu');const keysRef=useRef<Set<string>>(new Set());const playersRef=useRef<Player[]>([]);const platformsRef=useRef<Platform[]>([]);const coinsRef=useRef<Coin[]>([]);const powerupsRef=useRef<Powerup[]>([]);const enemiesRef=useRef<Enemy[]>([]);const camXRef=useRef(0);const levelRef=useRef(1);const soundRef=useRef(true);const animRef=useRef(0);const levelDataRef=useRef(SEA_LEVELS[0]);
  useEffect(()=>{screenRef.current=screen;},[screen]);useEffect(()=>{soundRef.current=soundOn;},[soundOn]);
  const sfx=useCallback((fn:()=>void)=>{if(soundRef.current)fn();},[]);
  const loadLevel=useCallback((idx:number,char:string)=>{const data=SEA_LEVELS[idx];levelDataRef.current=data;const{platforms,coins,powerups,enemies}=buildLevel(data);platformsRef.current=platforms;coinsRef.current=coins;powerupsRef.current=powerups;enemiesRef.current=enemies;camXRef.current=0;playersRef.current=[new Player(data.spawnX,data.spawnY,char as CharId,0)];},[]);
  const startGame=useCallback((lvl=1)=>{initAudio();levelRef.current=lvl;setCurrentLevel(lvl);loadLevel(lvl-1,p1Char);setScreen('playing');},[loadLevel,p1Char]);
  useEffect(()=>{const down=(e:KeyboardEvent)=>{keysRef.current.add(e.key);if(['ArrowUp',' '].includes(e.key)){e.preventDefault();const p=playersRef.current[0];if(p&&(p.onGround||p.jumpsLeft>0)){p.jump();sfx(sfxJump);}}if(e.key==='Enter'){if(screenRef.current==='level_complete'){const n=levelRef.current+1;if(n<=SEA_LEVELS.length)startGame(n);else setScreen('menu');}if(screenRef.current==='gameover')startGame(levelRef.current);}};const up=(e:KeyboardEvent)=>keysRef.current.delete(e.key);window.addEventListener('keydown',down);window.addEventListener('keyup',up);return()=>{window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);};},[sfx,startGame]);
  useEffect(()=>{
    const canvas=canvasRef.current;if(!canvas)return;canvas.width=CANVAS_W;canvas.height=CANVAS_H;const ctx=canvas.getContext('2d')!;let stepT=0;
    const loop=()=>{
      animRef.current=requestAnimationFrame(loop);const s=screenRef.current;const lvl=levelDataRef.current;
      if(s!=='playing'){draw(ctx,playersRef.current,platformsRef.current,coinsRef.current,powerupsRef.current,enemiesRef.current,camXRef.current,lvl,levelRef.current,SEA_LEVELS.length);if(s==='level_complete'||s==='gameover'){ctx.fillStyle='rgba(0,0,0,0.72)';ctx.fillRect(0,0,CANVAS_W,CANVAS_H);ctx.textAlign='center';if(s==='level_complete'){ctx.fillStyle='#80cbc4';ctx.font='bold 36px monospace';ctx.fillText('🐚 CLEAR!',CANVAS_W/2,CANVAS_H/2-50);ctx.fillStyle='#fff';ctx.font='16px monospace';ctx.fillText(`Score: ${playersRef.current[0]?.score||0}`,CANVAS_W/2,CANVAS_H/2);ctx.fillStyle='#4dd0e1';ctx.font='14px monospace';ctx.fillText('Press ENTER for next level',CANVAS_W/2,CANVAS_H/2+40);}else{ctx.fillStyle='#ef5350';ctx.font='bold 34px monospace';ctx.fillText('GAME OVER',CANVAS_W/2,CANVAS_H/2-40);ctx.fillStyle='#fff';ctx.font='16px monospace';ctx.fillText(`Score: ${playersRef.current[0]?.score||0}`,CANVAS_W/2,CANVAS_H/2+5);ctx.fillStyle='#80cbc4';ctx.font='14px monospace';ctx.fillText('Press ENTER to retry',CANVAS_W/2,CANVAS_H/2+45);}ctx.textAlign='left';}return;}
      const keys=keysRef.current;const players=playersRef.current;const platforms=platformsRef.current;
      platforms.forEach(p=>p.update());
      players.forEach(p=>{if(!p.alive)return;p.update(keys,platforms,1);coinsRef.current.forEach(c=>{if(c.collected)return;if(rectsOverlap({x:p.x,y:p.y,w:p.w,h:p.h},{x:c.x,y:c.y,w:c.w,h:c.h})||(p.hasPowerup('coin_magnet')&&Math.hypot(p.x-c.x,p.y-c.y)<80)){c.collected=true;p.coins++;p.score+=10;sfx(sfxCoin);}});powerupsRef.current.forEach(pu=>{if(pu.collected)return;if(rectsOverlap({x:p.x,y:p.y,w:p.w,h:p.h},{x:pu.x,y:pu.y,w:pu.w,h:pu.h})){pu.collected=true;p.activePowerups.push({type:pu.type,expiresAt:Date.now()+POWERUP_CONFIG[pu.type].duration});sfx(sfxPowerup);}});enemiesRef.current.forEach(e=>{if(!e.alive)return;if(!rectsOverlap({x:p.x,y:p.y,w:p.w,h:p.h},{x:e.x,y:e.y,w:e.w,h:e.h}))return;if((p.vy>0&&p.y+p.h<e.y+e.h*0.4)||p.hasPowerup('star')){e.alive=false;p.vy=-8;p.score+=50;sfx(sfxHit);}else if(!p.isInvincible){if(p.hasPowerup('shield')){p.activePowerups=p.activePowerups.filter(ap=>ap.type!=='shield');p.invincibleUntil=Date.now()+1500;}else{p.alive=false;sfx(sfxDie);}}});if(p.onGround&&(keys.has('ArrowLeft')||keys.has('ArrowRight'))){stepT++;if(stepT%18===0)sfx(sfxStep);}if(rectsOverlap({x:p.x,y:p.y,w:p.w,h:p.h},{x:lvl.goal.x,y:lvl.goal.y,w:30,h:60})){p.score+=200;sfx(sfxClear);setScreen('level_complete');return;}});
      if(players.every(p=>!p.alive)){setScreen('gameover');return;}
      coinsRef.current.forEach(c=>c.update());powerupsRef.current.forEach(pu=>pu.update());enemiesRef.current.forEach(e=>e.update(platforms));
      const p1=players[0];if(p1){const t=p1.x-CANVAS_W/3;camXRef.current+=(t-camXRef.current)*0.1;camXRef.current=Math.max(0,Math.min(camXRef.current,lvl.width-CANVAS_W));}
      draw(ctx,players,platforms,coinsRef.current,powerupsRef.current,enemiesRef.current,camXRef.current,lvl,levelRef.current,SEA_LEVELS.length);
    };
    animRef.current=requestAnimationFrame(loop);return()=>cancelAnimationFrame(animRef.current);
  },[sfx]);
  return(
    <div className="min-h-screen bg-gradient-to-b from-[#001a1a] via-[#002b2b] to-[#001a1a] flex flex-col items-center justify-center p-4">
      <div className="text-center mb-4">
        <h1 className="text-4xl md:text-5xl font-black tracking-tight bg-gradient-to-r from-teal-300 via-cyan-300 to-blue-400 bg-clip-text text-transparent">🌊 Sea World</h1>
        <p className="text-teal-400/60 text-sm mt-1">Collect shells · Dodge sea creatures · Reach the treasure!</p>
      </div>
      <div className="flex flex-col items-center gap-4 select-none">
        <canvas ref={canvasRef} className="rounded-xl shadow-2xl border-2 border-teal-700" style={{maxWidth:'100%',imageRendering:'pixelated'}}/>
        {screen==='menu'&&(<div className="flex flex-col items-center gap-4 w-full max-w-sm"><div className="flex justify-center gap-2">{SEA_CHARS.map(c=>(<button key={c.id} onClick={()=>setP1Char(c.id)} className={`px-3 py-1 rounded-lg text-xs font-bold border-2 transition-all ${p1Char===c.id?'border-yellow-400 scale-110':'border-gray-600'}`} style={{background:c.accent+'22',color:c.accent}}>{c.name}</button>))}</div><div className="flex gap-3"><button onClick={()=>startGame(1)} className="px-8 py-3 bg-gradient-to-r from-teal-700 to-cyan-700 text-white rounded-xl text-lg font-bold hover:scale-105 transition-transform shadow-lg">🌊 Dive!</button><button onClick={()=>setSoundOn(s=>!s)} className="px-4 py-3 bg-gray-700 text-white rounded-xl text-sm hover:bg-gray-600">{soundOn?'🔊':'🔇'}</button></div><p className="text-gray-500 text-xs">←→ Move · ↑ Jump · Collect 🐚 shells · Dodge 🦀🪼🦞</p></div>)}
        {screen==='playing'&&(<div className="flex flex-col gap-2 md:hidden w-full max-w-xs"><div className="flex justify-center"><button onTouchStart={(e)=>{e.preventDefault();playersRef.current[0]?.jump();sfx(sfxJump);}} className="w-14 h-14 bg-teal-800 rounded-xl text-2xl font-bold text-white flex items-center justify-center">↑</button></div><div className="flex justify-center gap-3"><button onTouchStart={(e)=>{e.preventDefault();keysRef.current.add('ArrowLeft');}} onTouchEnd={(e)=>{e.preventDefault();keysRef.current.delete('ArrowLeft');}} className="w-14 h-14 bg-teal-800 rounded-xl text-2xl font-bold text-white flex items-center justify-center">←</button><button onTouchStart={(e)=>{e.preventDefault();keysRef.current.add('ArrowRight');}} onTouchEnd={(e)=>{e.preventDefault();keysRef.current.delete('ArrowRight');}} className="w-14 h-14 bg-teal-800 rounded-xl text-2xl font-bold text-white flex items-center justify-center">→</button></div></div>)}
        {screen==='level_complete'&&<button onClick={()=>{const n=currentLevel+1;if(n<=SEA_LEVELS.length)startGame(n);else setScreen('menu');}} className="px-6 py-3 bg-gradient-to-r from-teal-600 to-cyan-600 text-white rounded-xl font-bold hover:scale-105">{currentLevel<SEA_LEVELS.length?'Next Level →':'🏠 Menu'}</button>}
        {screen==='gameover'&&<div className="flex gap-3"><button onClick={()=>startGame(currentLevel)} className="px-6 py-3 bg-gradient-to-r from-teal-700 to-cyan-700 text-white rounded-xl font-bold hover:scale-105">Try Again</button><button onClick={()=>setScreen('menu')} className="px-6 py-3 bg-gray-700 text-white rounded-xl font-bold hover:bg-gray-600">Menu</button></div>}
      </div>
    </div>
  );
}
