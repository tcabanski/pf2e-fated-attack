import fs from 'node:fs'; import assert from 'node:assert/strict';
let callback,spent=false,calls=0,confirm=true;
const actor={uuid:'Actor.a',isOwner:true,isOfType:t=>t==='character',getFlag:()=>spent,setFlag:async(s,k,v)=>{spent=v},system:{resources:{mythicPoints:{value:2}}}};
const message={id:'m',actor,isAuthor:true,isRerollable:true,flags:{pf2e:{context:{type:'spell-attack-roll'},modifiers:[{type:'proficiency',enabled:true}]}},rolls:[{toJSON:()=>({id:'r'})}]};
const messages=new Map([['m',message]]);
class Menu { constructor(){this.menuItems=[];} render(){return this.menuItems;} }
const existingMenu=new Menu();
global.ui={notifications:{warn:()=>{},info:()=>{},error:()=>{}}};
global.game={user:{isGM:false},messages,pf2e:{Check:{rerollFromMessage:async(m,o)=>{calls++;assert.equal(o.resource,'mythic-points');const die={faces:20};const r={dice:[die],terms:[die],options:{}};callback(m.rolls[0],r,{slug:'mythic-points'});assert.equal(die.number,2);assert.deepEqual(die.modifiers,['kh']);actor.system.resources.mythicPoints.value--;messages.delete(m.id);}}}};
global.foundry={applications:{ux:{ContextMenu:{implementation:Menu}},api:{DialogV2:{confirm:async()=>confirm}}}};
const hooks=new Map();global.Hooks={once:(n,f)=>hooks.set(n,f),on:(n,f)=>{if(n==='pf2e.preReroll')callback=f;else hooks.set(n,f);return 1},off:()=>{callback=null}};
global.Roll={getFormula:()=> '2d20kh+20'};
(async()=>{
await import('../scripts/fated-attack.js');hooks.get('ready')();const el={dataset:{messageId:'m'},matches:()=>true};existingMenu.render(el);existingMenu.render(el);assert.equal(existingMenu.menuItems.length,1);const fresh=new Menu();fresh.render(el);assert.equal(fresh.menuItems.length,1);const e=existingMenu.menuItems[0];assert(e.visible(el));
confirm=false;await e.onClick(null,el);assert.equal(spent,false);assert.equal(calls,0);
confirm=true;await e.onClick(null,el);assert.equal(spent,true);assert.equal(calls,1);assert.equal(actor.system.resources.mythicPoints.value,1);assert.equal(callback,null);
messages.set('m',message);assert.equal(e.visible(el),false);const log=console.error;console.error=()=>{};await e.onClick(null,el);assert.equal(calls,1);
spent=false;actor.system.resources.mythicPoints.value=0;await e.onClick(null,el);assert.equal(calls,1);assert.equal(spent,false);console.error=log;
spent=true;hooks.get('pf2e.restForTheNight')(actor);await Promise.resolve();assert.equal(spent,false);assert(e.visible(el));
console.log('PASS: cached and new menus, no duplicate entries, cancellation, 2d20kh, costs, hidden spent entry, zero-point refusal, rest reset, hook cleanup. Mock tests, not live Foundry.');
})();