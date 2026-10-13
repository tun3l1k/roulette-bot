// Серверный движок игры. ФАЙЛ СОЗДАЁТСЯ АВТОМАТИЧЕСКИ из тех же модулей, что и игра. Не редактировать вручную.
export function createEngine(){
var NOOP=new Proxy(function(){},{get:function(){return NOOP},apply:function(){return NOOP},set:function(){return true}});
var document=NOOP,window=NOOP,navigator=NOOP,location=NOOP,localStorage=NOOP,sessionStorage=NOOP;
var S=null,TG=null,cur=null,busy=false,scr='home',MSGS=[];
function hap(){}function draw(){}function paintHome(){}function go(){}function back(){}function ask(){}function save(){}function SRV(){return false}
// Настройки игры: редкости, словари, диапазоны, курс, задания
var APP_VER='2.0.0';
var NEWS_URL='https://t.me/UsernameRouletteNews',SUPPORT_URL='https://t.me/TUN3L';
var PAY_LIVE=false; // true, когда подключена настоящая оплата Telegram Stars
var TIERS=[
 {id:'common',name:'обычный',icon:'⚪',color:'#9e9e9e',w:55,pts:1},
 {id:'norm',name:'необычный',icon:'🟢',color:'#34c759',w:25,pts:3},
 {id:'rare',name:'редкий',icon:'🔵',color:'#3b82f6',w:12,pts:10},
 {id:'epic',name:'эпический',icon:'🟣',color:'#a855f7',w:5,pts:30},
 {id:'legend',name:'легендарный',icon:'🟠',color:'#ff9500',w:2,pts:100},
 {id:'mythic',name:'мифический',icon:'🔴',color:'#ff3b30',w:0.8,pts:500},
 {id:'divine',name:'божественный',icon:'🌟',color:'#ffd700',w:0.2,pts:2000}
];
var NAMES=['alexander','dmitry','sergey','andrew','michael','nikolay','vladimir','natalia','svetlana','victoria','daniel','kirill','eugene','maxim','artem','olivia','sophia','natasha'];
var SURN=['ivanov','petrov','smirnov','volkov','kuznetsov','popov','sokolov','morozov'];
var SHORTN=['max','alex','anna','ivan','oleg','lena','dima','mike','sam','nick','kate','john','olga'];
var WORDS=['fox','wolf','king','neo','sun','moon','lion','star','fire','ice','cat','god','zen','sky','wave','gold','ace','boss'];
// Короткие слова в стиле каталога Fragment (легендарные)
var FRAG_L=['cash','gold','bank','love','game','king','queen','money','trade','wallet','poker','vip','luck','rich','boss','lion','tiger','wolf','storm','fire','magic','pixel','robot','ninja','pirate','rocket','diamond','silver','lucky','royal'];
// Совсем короткие (мифические)
var FRAG_M=['ton','nft','vip','btc','eth','usd','ai','tg','id','ok','go','me','x','z','q','win','pay','art'];
var DIVINE=['dubai','moscow','london','paris','bitcoin','crypto','tokyo','nft','casino','elon','miami','vegas','berlin','rome','madrid','istanbul','bali','telegram','wallet','invest','binance','ethereum','bank','money','crypto','gold','trade','bet','poker','jackpot','premium','official','support','admin','news'];
var BOTS=[['crypto_king',4200],['neo_wolf',1800],['dubai_boss',900],['lena_star',350],['max_ivanov_99',60]];
var RATE=50000;
var RNG={common:[1,5],norm:[5,20],rare:[20,80],epic:[80,300],legend:[300,1000],mythic:[1000,5000],divine:[5000,20000]};
var TASKS=[{id:'spin10',title:'Сделай 10 прокруток',goal:10,rew:50,ic:'repeat'},{id:'keep3',title:'Оставь 3 ника в коллекции',goal:3,rew:40,ic:'plus'},{id:'sell5',title:'Продай 5 ников',goal:5,rew:40,ic:'tag'},{id:'rare1',title:'Выбей редкий ник',goal:1,rew:150,ic:'star'},{id:'bid1',title:'Сделай ставку на аукционе',goal:1,rew:30,ic:'hammer'},{id:'list1',title:'Выставь ник на маркет',goal:1,rew:30,ic:'list'},{id:'wheel',title:'Крутани колесо фортуны',goal:1,rew:60,ic:'wheel'}];
var WTASKS=[{id:'w_spin',ev:'spin10',title:'Сделай 100 прокруток',goal:100,rew:600,ic:'repeat'},{id:'w_rare',ev:'rare1',title:'Выбей 5 редких ников',goal:5,rew:1000,ic:'star'},{id:'w_sell',ev:'sell5',title:'Продай 30 ников',goal:30,rew:700,ic:'tag'},{id:'w_bid',ev:'bid1',title:'Сделай 5 ставок',goal:5,rew:500,ic:'hammer'},{id:'w_wheel',ev:'wheel',title:'Крутани колесо 3 раза',goal:3,rew:500,ic:'wheel'}];
var COST=100;
var WHEEL_MS=5*3600*1000;
var WHEEL=[
 {id:'s50',c:'#5ac8fa',w:28,t:'star',v:50},
 {id:'s150',c:'#34c759',w:27,t:'star',v:150},
 {id:'gift',c:'#4f9bff',w:9,t:'gift',v:1},
 {id:'luck',c:'#a259f7',w:12,t:'luck',v:10},
 {id:'free',c:'#ff5d8f',w:12,t:'free',v:1},
 {id:'s1000',c:'#ffb020',w:7,t:'star',v:1000},
 {id:'ton',c:'#0098ea',w:2.5,t:'ton',v:0.005},
 {id:'s5000',c:'#ff6a5f',w:2.5,t:'star',v:5000}];
var XPT={common:1,norm:2,rare:5,epic:15,legend:40,mythic:100,divine:300};

// Мелкие помощники: случайность, форматирование, тосты, тема
function rnd(a){return a[Math.floor(Math.random()*a.length)]}
function ri(a,b){return a+Math.floor(Math.random()*(b-a+1))}
var V='aeiou',C='bcdfghklmnprstvz';
function pron(n){var s='';for(var i=0;i<n;i++)s+=(i%2?rnd(V):rnd(C));return s}
function $(i){return document.getElementById(i)}
function fmt(n){return String(n).replace(/\B(?=(\d{3})+(?!\d))/g,' ')}
function r3(x){return Math.round(x*1000)/1000}
function tonF(v){return v.toFixed(3).replace(/0+$/,'').replace(/\.$/,'').replace('.',',')}
var TQ_=[],TB_=false;
function toast(m){TQ_.push(m);if(TQ_.length>4)TQ_.shift();if(!TB_)nextToast()}
function nextToast(){var m=TQ_.shift();if(m===undefined){TB_=false;return}TB_=true;var t=$('toast');t.textContent=m;t.classList.add('show');setTimeout(function(){if(TQ_.length)nextToast();else{t.classList.remove('show');TB_=false}},TQ_.length?1500:2400)}
function abbr(n){n=Math.round(n);if(n<1000)return String(n);var U=[[1e12,'трлн'],[1e9,'млрд'],[1e6,'м'],[1e3,'к']];
 for(var i=0;i<U.length;i++){if(n>=U[i][0]){var v=n/U[i][0],s=v<10?Math.floor(v*100+1e-9)/100:v<100?Math.floor(v*10+1e-9)/10:Math.floor(v);return String(s).replace('.',',')+U[i][1]}}return String(n)}
function applySize(){document.documentElement.setAttribute('data-bs',S.bsize||'m')}
function theme(){var r=document.documentElement;if(S.theme=='auto')r.removeAttribute('data-theme');else r.setAttribute('data-theme',S.theme)}
function esc(t){return String(t).replace(/[&<>"']/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
function fm(m){return String(Math.round(m*10)/10).replace('.',',')}
function dt(ts){var d=new Date(ts);return ('0'+d.getDate()).slice(-2)+'.'+('0'+(d.getMonth()+1)).slice(-2)+' '+('0'+d.getHours()).slice(-2)+':'+('0'+d.getMinutes()).slice(-2)}
function dk(d){return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()}
function tleft(ms){var t=Math.max(0,Math.ceil(ms/1000));return Math.floor(t/60)+':'+('0'+t%60).slice(-2)}

// Математика редкости и цены: шансы, множители, оценка ника
function tier(id){return TIERS.filter(function(t){return t.id==id})[0]}
function ti(id){return TIERS.indexOf(tier(id))}
function level(){return Math.floor(Math.sqrt(S.xp/25))+1}
function lf(){return Math.max(S.luck>0?3:1,S.pity||1)}
function noteBest(r){if(!r)return;if(!S.best||worth(r)>worth(S.best))S.best={u:r.u,tier:r.tier,base:r.base,odds:r.odds,ts:r.ts||Date.now()}}
function pickTier(){var w=TIERS.map(function(t,i){return t.w*(i>=2?lf():1)}),sum=w.reduce(function(a,b){return a+b},0),r=Math.random()*sum;for(var i=0;i<w.length;i++){r-=w[i];if(r<=0)return TIERS[i]}return TIERS[0]}
function oddsOf(t){var w=TIERS.map(function(x,i){return x.w*(i>=2?lf():1)}),sum=w.reduce(function(a,b){return a+b},0);return Math.round(sum/(t.w*(TIERS.indexOf(t)>=2?lf():1)))}
function baseFor(id){var g=RNG[id];return Math.round(g[0]+Math.pow(Math.random(),1.4)*(g[1]-g[0]))}
function mult(u){var m=1,tg=[],pr=[],n=u.length;
 function add(x,lb){m*=x;tg.push(lb);pr.push([lb,x])}
 if(DIVINE.indexOf(u)>=0)add(5,'топ-слово');else if(WORDS.indexOf(u)>=0||FRAG_L.indexOf(u)>=0)add(2,'слово');else if(NAMES.indexOf(u)>=0||SHORTN.indexOf(u)>=0)add(1.5,'имя');
 if(n<=3)add(3,'короткий');else if(n==4)add(2,'короткий');
 if(n>=3&&u===u.split('').reverse().join(''))add(2,'зеркало');
 if(/(777|888|999|000|007|123|321)/.test(u))add(2,'красивые цифры');
 return{m:m,tags:tg,parts:pr}}
function worth(r){return Math.max(1,Math.round((r.base!=null?r.base:tier(r.tier).pts)*mult(r.u).m))}
function multText(r){var x=mult(r.u),b=r.base!=null?r.base:tier(r.tier).pts;if(!x.parts.length)return 'Цена: '+money(b);return 'Цена: '+money(b)+' '+x.parts.map(function(p){return '× '+fm(p[1])+' '+p[0]}).join(' ')+' = '+money(worth(r))}
function mx(u){var m=mult(u).m;return m>1?' · ×'+fm(m):''}

// Действия экономики. Этот код выполняется на сервере (источник правды) и локально, если сервера нет
var PREFK=['theme','bsize','haptic','anim','confirm','auto','arules','autoMax','autoKeep','autoTags','autoTagAct','autoCap','autoCapAct','autoNotify','asMin','asLimit','mf','mq','cf','cs','cq','hf','rc','tt','gt','pm','mt'];
function defState(){return {coll:[],hist:[],spins:0,yuz:1500,g1:1,g2:1,g3:1,xp:0,luck:0,theme:'auto'}}
function initState(){S.coll=S.coll||[];S.hist=S.hist||[];S.since=S.since||Date.now();S.lots=S.lots||[];S.rare=S.rare||S.hist.filter(function(c){return ti(c.tier)>=2});S.gifts=S.gifts||[];
 if(!S.best){var b=null;S.coll.concat(S.rare,S.hist).forEach(function(c){if(!b||worth(c)>worth(b))b=c});if(b)noteBest(b)}
 if(S.autoKeep===false&&!S.autoTags)S.autoTags=[];giftMigrate();if(!S.bl)S.bl={y:S.yuz,t:S.ton||0}}
function resetAll(){var keep={};PREFK.forEach(function(k){if(S[k]!==undefined)keep[k]=S[k]});S=defState();Object.keys(keep).forEach(function(k){S[k]=keep[k]});initState();cur=null;return{ok:1}}
function spinRoll(){if(S.pending)return{err:'pending'};var fr=S.free>0;if(!fr&&S.yuz<COST)return{err:'poor'};
 if(fr)S.free--;else{S.yuz-=COST;led('Прокрутка')}
 var t=pickTier(),r={u:build(t.id),tier:t.id,base:baseFor(t.id),odds:oddsOf(t),ts:Date.now()};
 S.pending=r;noteBest(r);S.spins++;S.xp+=XPT[t.id];if(S.luck>0)S.luck--;
 S.pity=0;if(S.spins%500==0)S.pity=5;else if(S.spins%50==0)S.pity=2;if(S.pity)toast('Гарант! Следующая прокрутка: удача ×'+S.pity);
 S.hist.unshift(r);if(S.hist.length>50)S.hist.pop();if(ti(r.tier)>=2){S.rare.unshift(r);if(S.rare.length>100)S.rare.pop()}
 tq('spin10');if(ti(r.tier)>=2)tq('rare1');
 if(Math.random()<.006){var gg=giveGift(randGiftType());toast('Находка! Подарок «'+GT(gg.type).n+'»')}
 if(Math.random()<.002){var tf=r3(.01+Math.random()*.04);S.ton=r3((S.ton||0)+tf);led('Находка TON');toast('Находка! +'+tonF(tf)+' TON')}
 save();return{r:r}}
function autoResolve(){var r=S.pending;if(!r)return{err:'none'};var a=autoAction(r);if(a=='ask')return{err:'ask'};
 if(a=='sell'){var g=worth(r);S.yuz+=g;led('Авто-продажа @'+r.u);logAuto(r,g,'sell');S.autoN=(S.autoN||0)+1;S.autoSum=(S.autoSum||0)+g;tq('sell5');S.pending=null;cur=null;save();autoToast('Авто-продажа @'+r.u+' · +'+money(g));paintHome(1)}
 else{logAuto(r,0,'keep');S.autoKept=(S.autoKept||0)+1;keepPending();autoToast('Авто-сохранение @'+r.u)}
 return{ok:1,a:a}}
function claimChest(){tqE();if(!allClaimed()||S.tq.c.chest)return{err:'no'};var cj=chestInfo();S.yuz+=cj.rew;if(cj.n>=7){S.ton=r3((S.ton||0)+.01);giveGift(randGiftType())}
 S.streak=cj.n;S.lastChest=dk(new Date());S.tq.c.chest=1;led('Бонус дня');save();hap({type:'notification',notification_type:'success'});toast('Бонус дня +'+money(cj.rew));draw();return{ok:1}}
function buyLuck(){if(S.yuz<100){toast('Не хватает баланса');return{err:'poor'}}S.yuz-=100;S.luck=(S.luck||0)+10;led('Удача ×3');save();toast('Удача на 10 прокруток');draw();return{ok:1}}
function exchangeTon(t){t=r3(+t);if(!(t>=.001)||t>1000)return{err:'arg'};var cst=Math.ceil(t*RATE*1.1);if(S.yuz<cst){toast('Не хватает звёзд');return{err:'poor'}}
 S.yuz-=cst;S.ton=r3((S.ton||0)+t);led('Обмен ⭐ → TON');save();hap({type:'notification',notification_type:'success'});toast('+'+tonF(t)+' TON');draw();return{ok:1}}
function wheelRoll(){wheelSync();if(S.wt<=0)return{err:'no'};var tot=WHEEL.reduce(function(a,b){return a+b.w},0),r=Math.random()*tot,k=0;
 for(var i=0;i<WHEEL.length;i++){r-=WHEEL[i].w;if(r<=0){k=i;break}}
 if(S.wt>=wcap())S.wl=Date.now();S.wt--;
 var pr=WHEEL[k],st=360/WHEEL.length,prev=S.wrot||0;S.wheelAt=Date.now();
 if(pr.t=='star')S.yuz+=pr.v;else if(pr.t=='luck')S.luck=(S.luck||0)+pr.v;else if(pr.t=='free')S.free=(S.free||0)+pr.v;else if(pr.t=='ton')S.ton=r3((S.ton||0)+pr.v);
 if(pr.t=='gift')giveGift(randGiftType());led('Колесо фортуны');tq('wheel');
 var delta=(((-k*st-prev)%360)+360)%360+360*5,tgt=prev+delta+(Math.random()*st*.6-st*.3);S.wrot=((tgt%360)+360)%360;save();
 return{k:k,tgt:tgt,prize:prizeText(pr)}}
function listLot(p){p=p||{};var c=S.coll.filter(function(x){return x.u==p.u})[0];if(!c)return{err:'item'};var price=+p.price,dur=+p.dur,cc=p.cc=='ton'?'ton':'star';
 if(!(price>0)||!(dur>=30&&dur<=3600))return{err:'arg'};if(cc=='ton'&&ti(c.tier)<3)return{err:'ton'};
 price=cc=='ton'?r3(price):Math.max(1,Math.round(price));S.coll=S.coll.filter(function(x){return x!==c});
 S.lots.push({id:Date.now()+''+ri(100,999),u:c.u,tier:c.tier,base:c.base,cc:cc,seller:'ты',mine:1,fx:p.fx?1:0,to:null,price:price,bidder:null,endsAt:Date.now()+dur*1000});
 tq('list1');save();toast('Лот выставлен');return{ok:1}}
function tickNow(){auTick();return{ok:1}}
function takeForSend(kind,id){var rec=null;
 if(kind=='nick'){rec=S.coll.filter(function(x){return x.u==id})[0];if(!rec)return null;S.coll=S.coll.filter(function(x){return x!==rec})}
 else if(kind=='gift'){rec=(S.gifts||[]).filter(function(x){return x.id==id})[0];if(!rec)return null;S.gifts=S.gifts.filter(function(x){return x!==rec})}
 return rec}
function sendDone(kind,rec,to){glog('Отправлено другу @'+to+': '+(kind=='nick'?'@'+rec.u:gname(rec)));toast('Подарок отправлен @'+to)}
function inboxReceive(items){items.forEach(function(it){var p=it.p;
 if(it.k=='nick'){S.coll.unshift(p);noteBest(p);glog('Получен ник @'+p.u+' от @'+it.from);toast('Подарок от @'+it.from+': ник @'+p.u)}
 else{S.gifts=S.gifts||[];p.from=it.from;S.gifts.unshift(p);glog('Получен подарок «'+gname(p)+'» от @'+it.from);toast('Подарок от @'+it.from+': «'+gname(p)+'»')}})}

// Деньги и продажа: звёзды, TON, продажа ников
function money(n){return fmt(Math.round(n))+' ⭐'}
function cash(v,c){return c=='ton'?tonF(v)+' TON':money(v)}
function fS(n){return abbr(n)}
function fT(n){var s=tonF(Math.max(0,r3(n))),i=s.indexOf(',');return i<0?s:s.slice(0,i)+'<span class="dec">'+s.slice(i)+'</span>'}
function balHtml(){return SI(16)+' '+fS(S.yuz)+((S.ton||0)>0?' &nbsp; '+TI(16)+' '+tonF(S.ton):'')}
function keepPending(){var pk=S.pending;if(!pk)return;if(!S.coll.some(function(x){return x.u==pk.u}))S.coll.unshift(pk);tq('keep3');S.pending=null;cur=null;save();paintHome(1)}
function bulkList(){return S.coll.filter(function(c){return ti(c.tier)<=1&&mult(c.u).m<=1&&c.u!=S.main})}
function sellPending(){var sc=S.pending;if(!sc)return;var g=worth(sc);S.yuz+=g;led('Продажа @'+sc.u);tq('sell5');S.pending=null;cur=null;save();hap({type:'impact',impact_style:'light'});toast('💰 Продано @'+sc.u+' · +'+money(g));paintHome(1)}
function sellOne(u){var c=S.coll.filter(function(x){return x.u==u})[0];if(!c)return;var g=worth(c);S.yuz+=g;led('Продажа @'+u);tq('sell5');S.coll=S.coll.filter(function(x){return x.u!=u});save();hap({type:'impact',impact_style:'light'});draw()}
function sellBulk(){var bl=bulkList();if(!bl.length)return;var tot=bl.reduce(function(a,c){return a+worth(c)},0);S.coll=S.coll.filter(function(c){return bl.indexOf(c)<0});S.yuz+=tot;led('Массовая продажа ('+bl.length+')');tq('sell5',bl.length);save();hap({type:'impact',impact_style:'medium'});draw()}

// Журнал операций, график баланса, статистика за сутки
function led(r){S.ledger=S.ledger||[];var b=S.bl||{y:S.yuz,t:S.ton||0},now=Date.now(),dy=S.yuz-b.y,dt2=r3((S.ton||0)-b.t);
 if(dy)S.ledger.unshift({t:now,d:dy,c:'star',r:r});
 if(dt2)S.ledger.unshift({t:now,d:dt2,c:'ton',r:r});
 if(S.ledger.length>80)S.ledger.length=80;
 if(dy){S.bh=S.bh||[];S.bh.push({t:now,y:S.yuz});if(S.bh.length>40)S.bh.shift()}
 S.bl={y:S.yuz,t:S.ton||0}}
function spark(){var a=(S.bh||[]).slice(-30);
 if(a.length<2)return '<div class="empty" style="padding:22px 0">График появится после первых операций</div>';
 var ys=a.map(function(p){return p.y}),mn=Math.min.apply(null,ys),mx=Math.max.apply(null,ys),rg=mx-mn||1,
 pts=a.map(function(p,i){return (i*(300/(a.length-1))).toFixed(1)+','+(70-((p.y-mn)/rg)*60).toFixed(1)}).join(' ');
 return '<svg class="spark" viewBox="0 0 300 80" preserveAspectRatio="none"><defs><linearGradient id="sg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2AABEE" stop-opacity=".45"/><stop offset="1" stop-color="#2AABEE" stop-opacity="0"/></linearGradient></defs><polygon points="0,80 '+pts+' 300,80" fill="url(#sg)"/><polyline points="'+pts+'" fill="none" stroke="#2AABEE" stroke-width="2.4" stroke-linejoin="round" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>'}
function dayStats(){var from=Date.now()-864e5,i=0,o=0;(S.ledger||[]).forEach(function(e){if(e.t>=from&&e.c=='star'){if(e.d>0)i+=e.d;else o-=e.d}});return{i:i,o:o}}
function txHtml(n){var L=(S.ledger||[]).slice(0,n||15);
 if(!L.length)return '<div class="empty" style="padding:24px 0">Операций пока нет</div>';
 return '<div class="grp">'+L.map(function(e){var up=e.d>0;
  return '<div class="tx"><div class="txi '+(up?'up':'dn')+'">'+(up?'↗':'↘')+'</div><div class="txm"><b>'+esc(e.r)+'</b><small>'+dt(e.t)+'</small></div><div class="txa '+(up?'up':'dn')+'">'+(up?'+':'−')+(e.c=='ton'?tonF(Math.abs(e.d))+' TON':abbr(Math.abs(e.d))+' ⭐')+'</div></div>'}).join('')+'</div>'}

// Задания: ежедневные и недельные, бонус дня
function wkKey(){var d=new Date(),x=new Date(d);x.setDate(d.getDate()-((d.getDay()+6)%7));return dk(x)}
function tqE(){var k=dk(new Date());if(!S.tq||S.tq.day!=k)S.tq={day:k,p:{},c:{}};var w=wkKey();if(!S.tw||S.tw.wk!=w)S.tw={wk:w,p:{},c:{}}}
function tdone(t){hap({type:'notification',notification_type:'success'});if(scr!='coll')toast('Задание выполнено: '+t.title)}
function tq(id,n){tqE();var t=TASKS.filter(function(x){return x.id==id})[0];
 if(t){var b=S.tq.p[id]||0;S.tq.p[id]=Math.min(t.goal,b+(n||1));if(b<t.goal&&S.tq.p[id]>=t.goal)tdone(t)}
 WTASKS.forEach(function(w){if(w.ev==id){var b=S.tw.p[w.id]||0;S.tw.p[w.id]=Math.min(w.goal,b+(n||1));if(b<w.goal&&S.tw.p[w.id]>=w.goal)tdone(w)}});save()}
function allClaimed(){return TASKS.every(function(t){return S.tq.c[t.id]})}
function claimable(){tqE();var n=0;TASKS.forEach(function(t){if((S.tq.p[t.id]||0)>=t.goal&&!S.tq.c[t.id])n++});WTASKS.forEach(function(t){if((S.tw.p[t.id]||0)>=t.goal&&!S.tw.c[t.id])n++});if(allClaimed()&&!S.tq.c.chest)n++;return n}
function chestInfo(){var y=new Date();y.setDate(y.getDate()-1);var n=(S.lastChest==dk(y))?(S.streak||0)+1:1;return{n:n,rew:200+50*(Math.min(n,7)-1)}}
function streakNow(){var y=new Date();y.setDate(y.getDate()-1);return(S.lastChest==dk(new Date())||S.lastChest==dk(y))?(S.streak||0):0}
function dayLeft(){var n=new Date(),m=new Date(n);m.setHours(24,0,0,0);var t=Math.floor((m-n)/60000);return Math.floor(t/60)+' ч '+(t%60)+' мин'}
function weekLeft(){var n=new Date(),dow=(n.getDay()+6)%7,m=new Date(n.getFullYear(),n.getMonth(),n.getDate()+7-dow),mn=Math.max(0,Math.floor((m-n)/60000)),d=Math.floor(mn/1440),h=Math.floor(mn%1440/60);return d+' д '+h+' ч'}
function claimTask(id){tqE();var t=TASKS.filter(function(x){return x.id==id})[0],st=S.tq;if(!t){t=WTASKS.filter(function(x){return x.id==id})[0];st=S.tw}
 if(!t||st.c[id]||(st.p[id]||0)<t.goal)return;st.c[id]=1;S.yuz+=t.rew;led('Награда: '+t.title);save();hap({type:'notification',notification_type:'success'});toast('Награда +'+money(t.rew)+' · '+t.title);draw()}
var TCOL=['#5ac8fa','#34c759','#ff9500','#a259f7','#ff5d8f','#4f9bff','#ffb020'];
function tasksHtml(){tqE();var tb=S.tt||'d',L=tb=='d'?TASKS:WTASKS,st=tb=='d'?S.tq:S.tw,dn=0;L.forEach(function(t){if(st.c[t.id])dn++});
 var pc=dn/L.length,C=2*Math.PI*30,ci=chestInfo(),sn=streakNow(),ready=allClaimed();
 var hero='<div class="thero"><div class="tring"><svg viewBox="0 0 72 72"><circle cx="36" cy="36" r="30" fill="none" stroke="var(--sep)" stroke-width="7"/><circle cx="36" cy="36" r="30" fill="none" stroke="#5ac8fa" stroke-width="7" stroke-linecap="round" stroke-dasharray="'+C.toFixed(1)+'" stroke-dashoffset="'+(C*(1-pc)).toFixed(1)+'" transform="rotate(-90 36 36)"/></svg><b>'+dn+'/'+L.length+'</b></div><div class="tinfo"><b>'+(tb=='d'?'Задания дня':'Задания недели')+'</b><small>Обновятся через '+(tb=='d'?dayLeft():weekLeft())+'</small></div></div>';
 var tabs='<div class="seg"><button class="'+(tb=='d'?'on':'')+'" data-tk="d">Ежедневные</button><button class="'+(tb=='w'?'on':'')+'" data-tk="w">Недельные</button></div>';
 var list='<div class="tlist">'+L.map(function(t,i){var p=Math.min(t.goal,st.p[t.id]||0),cl=!!st.c[t.id],ok=p>=t.goal,col=TCOL[i%TCOL.length];
  return '<div class="tcard'+(cl?' dn':'')+'"><div class="tic" style="background:'+col+'">'+IC[t.ic]+'</div><div class="tmid"><b>'+t.title+'</b><div class="bar"><i style="width:'+Math.round(p/t.goal*100)+'%;background:'+col+'"></i></div><small>'+p+' / '+t.goal+'</small></div><div class="tact">'+(cl?'<span class="tdone">Получено</span>':ok?'<button class="pbtn sm" data-claim="'+t.id+'">+'+abbr(t.rew)+' ⭐</button>':'<span class="trew">+'+abbr(t.rew)+' ⭐</span>')+'</div></div>'}).join('')+'</div>';
 var chest='';
 if(tb=='d'){var dots='';for(var i=1;i<=7;i++)dots+='<i class="'+(i<=sn?'on':'')+'"></i>';
  chest='<div class="chest"><div class="chead"><div class="tic" style="background:#ff9f0a">'+IC.gift+'</div><div><b>Бонус дня</b><small>Выполни все задания · серия '+sn+' из 7</small></div></div><div class="cdots">'+dots+'</div>'+(S.tq.c.chest?'<div class="tdone" style="text-align:center">Получено</div>':'<button class="pbtn" style="width:100%;'+(ready?'':'opacity:.45')+'" data-act="chest">Забрать '+money(ci.rew)+'</button>')+'</div>'}
 return hero+tabs+list+chest}

// Авто-продажа: правила для каждой редкости (продать / оставить / спросить), признаки, лимиты
var TAGS=['короткий','имя','слово','зеркало','красивые цифры','топ-слово'];
function keepTags(){return S.autoTags||TAGS}
function autoRules(){if(S.arules)return S.arules;var m=S.autoMax||0;return TIERS.map(function(t,i){return i<=m?'sell':'ask'})}
function autoAction(r){if(!S.auto)return 'ask';var a=autoRules()[ti(r.tier)]||'ask';if(a!='sell')return a;
 var tg=mult(r.u).tags,kt=keepTags();for(var i=0;i<tg.length;i++)if(kt.indexOf(tg[i])>=0)return S.autoTagAct||'ask';
 if(S.autoCap&&worth(r)>=S.autoCap)return S.autoCapAct||'ask';return 'sell'}
function willAuto(r){return autoAction(r)!='ask'}
function autoToast(m){if(S.autoNotify)toast(m)}
function logAuto(r,g,a){S.autoLog=S.autoLog||[];S.autoLog.unshift({u:r.u,tier:r.tier,g:g,a:a,t:Date.now()});if(S.autoLog.length>30)S.autoLog.pop()}
function autoHandle(r){var a=autoAction(r);if(a=='ask')return;
 setTimeout(function(){var p=S.pending;if(!p||p.u!=r.u||p.ts!=r.ts)return;autoResolve()},1200)}
function applyPreset(i){var P=[{r:['sell','ask','ask','ask','ask','ask','ask'],tag:'ask'},{r:['sell','sell','ask','ask','ask','ask','ask'],tag:'ask'},{r:['sell','sell','keep','keep','keep','keep','keep'],tag:'keep'},{r:['sell','sell','sell','sell','ask','ask','ask'],tag:'sell'}][i];
 S.arules=P.r;S.autoTagAct=P.tag;S.autoCap=0;S.autoTags=undefined;S.auto=true;save()}
var RACTL={sell:'Продать',keep:'Оставить',ask:'Спросить'};
function segAct(cur,attr,vals){return '<div class="seg3">'+vals.map(function(v){return '<button class="'+(cur==v?'on':'')+'" data-'+attr+'="'+v+'">'+RACTL[v]+'</button>'}).join('')+'</div>'}
function autoHtml(){var dim=S.auto?'':'opacity:.5',kt=keepTags(),ru=autoRules(),log=(S.autoLog||[]).slice(0,6);
 return '<div class="grp">'+tgRow('💰','#ff9500','Авто-продажа','auto')+'</div>'+
  '<div class="sec">Быстрые режимы</div><div class="seg"><button data-ap="0">Осторожно</button><button data-ap="1">Баланс</button><button data-ap="2">Коллекционер</button><button data-ap="3">Агрессивно</button></div>'+
  '<div class="foot" style="margin-top:6px">«Коллекционер» продаёт дешёвое, а редкое сохраняет сам, автопрокрут не останавливается.</div>'+
  '<div class="sec">Что делать с каждой редкостью</div><div class="grp" style="'+dim+'">'+TIERS.map(function(t,i){return '<div class="rule"><span class="rdt" style="background:'+t.color+'"></span><b>'+t.name+'</b>'+segAct(ru[i],'ru-'+i,['sell','keep','ask'])+'</div>'}).join('')+'</div>'+
  '<div class="sec">Не продавать дороже</div><div class="seg" style="'+dim+'">'+[[0,'Без лимита'],[100,'100'],[500,'500'],[2000,'2к'],[10000,'10к']].map(function(x){return '<button class="'+((S.autoCap||0)==x[0]?'on':'')+'" data-ac="'+x[0]+'">'+x[1]+'</button>'}).join('')+'</div>'+
  ((S.autoCap||0)?'<div class="rule" style="margin-top:8px"><b style="flex:1">Если дороже лимита</b>'+segAct(S.autoCapAct||'ask','ca',['keep','ask'])+'</div>':'')+
  '<div class="sec">Ники с признаками</div><div class="grp" style="'+dim+'">'+TAGS.map(function(x){return '<button class="go" data-at="'+x+'"><span style="text-transform:capitalize">'+x+'</span><span class="sw'+(kt.indexOf(x)>=0?' on':'')+'"></span></button>'}).join('')+'</div>'+
  '<div class="rule" style="margin-top:8px"><b style="flex:1">Что делать с ними</b>'+segAct(S.autoTagAct||'ask','ta',['sell','keep','ask'])+'</div>'+
  '<div class="sec">Автопрокрут</div><div class="grp"><div class="go"><span>Резерв баланса (не тратить ниже)</span></div></div><div class="seg">'+[[0,'Нет'],[500,'500'],[2000,'2к'],[10000,'10к']].map(function(x){return '<button class="'+((S.asMin||0)==x[0]?'on':'')+'" data-ar="'+x[0]+'">'+x[1]+'</button>'}).join('')+'</div>'+
  '<div class="grp" style="margin-top:10px"><div class="go"><span>Лимит прокруток за запуск</span></div></div><div class="seg">'+[[0,'Без лимита'],[50,'50'],[200,'200'],[500,'500']].map(function(x){return '<button class="'+((S.asLimit||0)==x[0]?'on':'')+'" data-al="'+x[0]+'">'+x[1]+'</button>'}).join('')+'</div>'+
  '<div class="grp" style="margin-top:14px">'+tgRow('✨','#5ac8fa','Уведомления об авто-действиях','autoNotify')+'</div>'+
  '<div class="stats3" style="margin-top:14px"><div class="stat"><b>'+(S.autoN||0)+'</b><small>продано</small></div><div class="stat"><b>'+(S.autoKept||0)+'</b><small>сохранено</small></div><div class="stat"><b>'+abbr(S.autoSum||0)+'</b><small>заработано ⭐</small></div></div>'+
  (log.length?'<div class="sec">Последние действия</div><div class="grp">'+log.map(function(e){var t=tier(e.tier);return '<div class="go it" style="border-color:'+t.color+'"><b>@'+e.u+'</b><small>'+(e.a=='keep'?'сохранён':'+'+money(e.g))+'</small></div>'}).join('')+'</div>':'')+
  '<div class="foot">После прокрутки ник показывается 1–2 секунды, потом срабатывает правило. «Спросить» значит, что решение за тобой, автопрокрут на этом остановится.</div>'}

// Колесо фортуны: попытки копятся (1 за 5 часов, до лимита), купленные не сгорают
var WBUSY=false,WA_=null;
function wcap(){return isPrem()?5:3}
function wheelSync(){if(S.wt===undefined){S.wt=(Date.now()-(S.wheelAt||0)>=wheelMs())?1:0;S.wl=S.wt?Date.now():(S.wheelAt||Date.now())}
 var ms=wheelMs(),now=Date.now(),cap=wcap();
 if(S.wt>=cap){S.wl=now;return}
 var k=Math.floor((now-S.wl)/ms);if(k>0){S.wt=Math.min(cap,S.wt+k);S.wl+=k*ms;if(S.wt>=cap)S.wl=now}}
function wheelReady(){wheelSync();return S.wt>0}
function wheelLeft(){wheelSync();if(S.wt>=wcap())return '';var t=Math.max(0,Math.ceil((wheelMs()-(Date.now()-S.wl))/60000));return Math.floor(t/60)+' ч '+(t%60)+' мин'}
function prizeText(p){return p.t=='star'?money(p.v):p.t=='luck'?'удача ×3 на '+p.v+' прокруток':p.t=='free'?'бесплатная прокрутка':p.t=='gift'?'случайный NFT-подарок':tonF(p.v)+' TON'}
function prizeChance(p){var tot=WHEEL.reduce(function(a,b){return a+b.w},0),v=p.w/tot*100;return (v<10?String(Math.round(v*10)/10):String(Math.round(v))).replace('.',',')+'%'}
var WG={luck:'<circle cx="9" cy="9" r="3.4"/><circle cx="15" cy="9" r="3.4"/><circle cx="9" cy="14.6" r="3.4"/><circle cx="15" cy="14.6" r="3.4"/>',
 free:'<path d="M3 8h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z"/>',
 gift:'<rect x="3" y="9" width="18" height="12" rx="1.5"/><rect x="2" y="6" width="20" height="4" rx="1"/><path d="M12 6c-2-4-6-3-5 0M12 6c2-4 6-3 5 0" fill="none" stroke="#fff" stroke-width="2"/>',
 ton:'<path d="M6 5h12l4 6-10 11L2 11z"/>'};
function wheelSvg(){var n=WHEEL.length,st=360/n,p='',tx='';
 for(var i=0;i<n;i++){var a=-90+i*st,s=(a-st/2)*Math.PI/180,e=(a+st/2)*Math.PI/180,x1=100+96*Math.cos(s),y1=100+96*Math.sin(s),x2=100+96*Math.cos(e),y2=100+96*Math.sin(e),mx=100+64*Math.cos(a*Math.PI/180),my=100+64*Math.sin(a*Math.PI/180),pr=WHEEL[i];
  p+='<path d="M100 100L'+x1.toFixed(2)+' '+y1.toFixed(2)+'A96 96 0 0 1 '+x2.toFixed(2)+' '+y2.toFixed(2)+'Z" fill="'+pr.c+'" stroke="var(--grp)" stroke-width="2.5"/>';
  tx+=pr.t=='star'?'<text transform="translate('+mx.toFixed(1)+' '+my.toFixed(1)+') rotate('+(a+90)+')" text-anchor="middle" dominant-baseline="middle" font-size="15" font-weight="800" fill="#fff">'+abbr(pr.v)+'</text>':'<g fill="#fff" transform="translate('+mx.toFixed(1)+' '+my.toFixed(1)+') rotate('+(a+90)+') scale(.85) translate(-12 -12)">'+WG[pr.t]+'</g>'}
 return '<div class="wheelwrap"><svg class="wptr" viewBox="0 0 24 24" width="30" height="30"><path d="M4 3h16l-8 17z" fill="var(--text)" stroke="var(--grp)" stroke-width="2" stroke-linejoin="round"/></svg><svg id="wheelsvg" viewBox="0 0 200 200" class="wheel" style="transform:rotate('+(S.wrot||0)+'deg)">'+p+tx+'<circle cx="100" cy="100" r="13" fill="var(--grp)"/><circle cx="100" cy="100" r="5" fill="var(--text)"/></svg></div>'}
function wheelHtml(){wheelSync();var n=S.wt,cap=wcap(),rd=n>0,tot=Math.max(cap,n),pips='';WA_=rd+':'+n;
 for(var i=0;i<tot;i++)pips+='<i class="'+(i<n?'on':'')+'"></i>';
 return '<div class="wtop2"><div class="wpips">'+pips+'</div><div class="wcnt"><b>'+n+'</b><small>'+(n<cap?'попыток · +1 через <span id="wtimer">'+wheelLeft()+'</span>':'попыток · максимум '+cap+' (купленные сверх лимита не сгорают)')+'</small></div></div>'+wheelSvg()+
  '<button class="pbtn" style="width:100%;margin-top:4px;'+(rd?'':'opacity:.5')+'" '+(rd?'data-act="wheel"':'disabled')+'>Крутить</button>'+
  '<div class="sec">Призы</div><div class="grp">'+WHEEL.map(function(p){return '<div class="go"><span style="width:12px;height:12px;border-radius:50%;background:'+p.c+';flex:none"></span><span>'+prizeText(p)+'</span><small>'+prizeChance(p)+'</small></div>'}).join('')+'</div><div class="foot">Одна попытка копится раз в '+(isPrem()?'3 часа (Premium)':'5 часов'+'')+'. Лимит накопления: '+cap+'.</div>'}
function spinWheel(){if(WBUSY||!wheelReady())return;WBUSY=true;
 var p=SRV()?srvRun('wheelRoll',[],{raw:true}):Promise.resolve({res:wheelRoll(),msgs:[]});
 p.then(function(o){var r=o&&o.res;if(!r||r.err){WBUSY=false;if(o&&o.err)toast('Нет связи с сервером');draw();return}
  var w=document.getElementById('wheelsvg');if(w){w.style.transition='transform 4.6s cubic-bezier(.12,.7,.1,1)';w.style.transform='rotate('+r.tgt+'deg)'}
  var tk=setInterval(function(){hap({type:'selection_change'})},260);
  setTimeout(function(){clearInterval(tk);WBUSY=false;hap({type:'notification',notification_type:'success'});toast('Выигрыш: '+r.prize);(o.msgs||[]).forEach(function(m){toast(m)});if(scr=='wheel')draw()},4700)})}

// Магазин и Premium (покупки пока тестовые: настоящая оплата Telegram Stars подключается с сервером)
var PACKS=[{id:'p1',stars:1000,price:50,tag:''},{id:'p2',stars:5500,price:250,tag:'+10%'},{id:'p3',stars:12000,price:500,tag:'+20%'}];
var PREM_PRICE=150,PREM_DAYS=30,WR_PRICE=25;
function isPrem(){return (S.prem||0)>Date.now()}
function premDays(){return Math.max(0,Math.ceil(((S.prem||0)-Date.now())/864e5))}
function feeK(){return isPrem()?.97:.95}
function feeTxt(){return isPrem()?'3% (Premium)':'5%'}
function wheelMs(){return isPrem()?3*3600*1000:WHEEL_MS}
function buyReal(title,price,fn){if(!PAY_LIVE){toast('Оплата Telegram Stars скоро');return}ask('Тестовая покупка: '+title+' за '+price+' Telegram Stars. Списаний нет, настоящая оплата подключится вместе с сервером.','Купить',function(){S.spent=(S.spent||0)+price;hap({type:'notification',notification_type:'success'});fn()})}
function buyPack(id){var p=PACKS.filter(function(x){return x.id==id})[0];if(!p)return;buyReal(fmt(p.stars)+' ⭐',p.price,function(){S.yuz+=p.stars;led('Пакет '+abbr(p.stars)+' ⭐');save();toast('🎁 +'+money(p.stars));draw()})}
function buyPrem(){buyReal('Premium на '+PREM_DAYS+' дней',PREM_PRICE,function(){S.prem=Math.max(Date.now(),S.prem||0)+PREM_DAYS*864e5;save();toast('✨ Premium активен ещё '+premDays()+' дн.');draw()})}
function buyWheelReset(){buyReal('попытка колеса (копится)',WR_PRICE,function(){wheelSync();S.wt=(S.wt||0)+1;save();toast('Попытка колеса добавлена: '+S.wt);draw()})}
function shopHtml(){var pr=isPrem();
 return '<div class="premc"><div class="premt"><span class="premi">'+IC.crown+'</span><div><b>Premium</b><small>'+(pr?'Активен · осталось '+premDays()+' дн.':PREM_DAYS+' дней')+'</small></div></div>'+
  '<ul class="premp"><li>Колесо фортуны каждые 3 часа вместо 5</li><li>Комиссия маркета 3% вместо 5%</li><li>+1 бесплатная прокрутка каждый день</li><li>Значок Premium в профиле</li></ul>'+
  '<button class="premb" data-act="buyprem">'+(PAY_LIVE?(pr?'Продлить':'Подключить')+' · '+PREM_PRICE+' Stars':'Оплата скоро')+'</button></div>'+
  '<div class="sec">Пакеты звёзд</div><div class="grp">'+PACKS.map(function(p){return '<button class="go" data-bp="'+p.id+'"><span class="ic" style="background:#ffb020">'+SI(22)+'</span><div>'+fmt(p.stars)+' ⭐'+(p.tag?' <span class="badge sm" style="background:#34c759">'+p.tag+'</span>':'')+'</div><small style="margin-left:auto;color:var(--blue)">'+p.price+' Stars</small></button>'}).join('')+'</div>'+
  '<div class="sec">Ускорители</div><div class="grp"><button class="go" data-act="luck"><span class="ic" style="background:#34c759">'+ei('🍀')+'</span><div>Удача ×3<br><small style="margin:0">на 10 прокруток</small></div><small style="margin-left:auto;color:var(--blue)">'+money(100)+'</small></button>'+
  '<button class="go" data-act="buywr"><span class="ic" style="background:#ff9f0a">'+ei('🎡')+'</span><div>Ещё одна попытка колеса<br><small style="margin:0">копится, не сгорает</small></div><small style="margin-left:auto;color:var(--blue)">'+WR_PRICE+' Stars</small></button></div>'+
  '<div class="sec">Скоро</div><div class="grp"><div class="go"><span class="ic" style="background:#a259f7">'+ei('🏆')+'</span><div>Battle Pass<br><small style="margin:0">награды за прокрутки</small></div><small style="margin-left:auto">скоро</small></div><div class="go"><span class="ic" style="background:#ff5d8f">'+ei('🎨')+'</span><div>Рамки и темы профиля</div><small style="margin-left:auto">скоро</small></div></div>'+
  '<div class="foot">Оплата будет через Telegram Stars (XTR). Пока она не подключена, покупки за Stars недоступны.</div>'}

// Админ-меню (скрыто за паролем; защита только от случайного входа, не настоящая безопасность)
var ADM=false,ADM_FAIL=0,ADM_LOCK=0,ADM_H=-1989635603;
function hh(s){var h=5381;for(var i=0;i<s.length;i++)h=((h<<5)+h+s.charCodeAt(i))|0;return h}
function askPass(){if(ADM){go('admin');return}
 if(Date.now()<ADM_LOCK){toast('Слишком много попыток. Подожди минуту');return}
 var o=document.createElement('div');o.className='ov';
 o.innerHTML='<div class="sh"><p>Админ-меню<br><span style="font-size:14px;color:var(--sub);font-weight:400">Введи пароль</span></p><input id="admp" class="inp" type="password" inputmode="numeric" autocomplete="off" maxlength="12" placeholder="Пароль" style="text-align:center;letter-spacing:6px"><div class="row2" style="margin-top:14px"><button class="act" data-x="0">Отмена</button><button class="pbtn" style="flex:1" data-x="1">Войти</button></div></div>';
 o.addEventListener('click',function(e){var b=e.target.closest('[data-x]');if(b||e.target===o){var i=document.getElementById('admp'),v=i?i.value:'',ok=b&&b.getAttribute('data-x')=='1';o.remove();if(ok)admTry(v)}});
 document.body.appendChild(o);setTimeout(function(){var i=document.getElementById('admp');if(i)i.focus()},60)}
function admTry(v){if(hh(String(v).trim()+'rl')===ADM_H){ADM=true;ADM_FAIL=0;go('admin')}else{ADM_FAIL++;if(ADM_FAIL>=5){ADM_LOCK=Date.now()+60000;ADM_FAIL=0}toast('Неверный пароль')}}
function admGrant(s){var p=s.split(':'),v=parseFloat(p[1]);if(!ADM||!(v>0)||v>1e12)return;
 if(p[0]=='ton')S.ton=r3((S.ton||0)+v);else S.yuz+=Math.round(v);
 led('Админ: выдача');save();hap({type:'notification',notification_type:'success'});toast('Выдано +'+(p[0]=='ton'?tonF(v)+' TON':money(Math.round(v))));draw()}
function admCustom(c){var i=document.getElementById('admn');admGrant(c+':'+(i?i.value:'0'))}
function adminHtml(){if(!ADM)return '<div class="empty">Нет доступа</div>';
 var gv=function(l,v){return '<button class="act" data-adm="'+v+'">'+l+'</button>'};
 return '<div class="stats3" style="grid-template-columns:1fr 1fr;margin-top:4px"><div class="stat"><small>Звёзды</small><b>'+money(S.yuz)+'</b></div><div class="stat"><small>TON</small><b>'+tonF(S.ton||0)+'</b></div></div>'+
  '<div class="sec">Выдача звёзд</div><div class="row2">'+gv('+1 000','star:1000')+gv('+10 000','star:10000')+gv('+100 000','star:100000')+'</div>'+
  '<div class="sec">Выдача TON</div><div class="row2">'+gv('+0,1','ton:0.1')+gv('+0,5','ton:0.5')+gv('+5','ton:5')+'</div>'+
  '<div class="sec">Своя сумма</div><input id="admn" class="inp" type="number" inputmode="decimal" placeholder="Сумма"><div class="row2" style="margin-top:10px"><button class="act" data-act="admgs">Выдать ⭐</button><button class="act" data-act="admgt">Выдать TON</button></div>'+
  maintHtml()+'<div class="sec">Диагностика Telegram</div><div class="grp">'+[['Запуск из Telegram',TG?'да':'нет'],['ID пользователя',TG&&TG.id?TG.id:'не передан'],['Имя пользователя',TG&&TG.username?'@'+esc(TG.username):'не передано'],['Фото профиля',TG&&TG.photo_url?'есть':'не передано'],['Облако',cloudStatus()]].map(function(x){return '<div class="go"><span>'+x[0]+'</span><small>'+x[1]+'</small></div>'}).join('')+'</div>'+
  '<button class="pbtn gray" style="width:100%;margin-top:18px" data-act="admout">Выйти из админ-меню</button>'}

// Подарки в стиле NFT-подарков Telegram (оригинальные коллекционные предметы игры)
var GT_=[{id:'candy',n:'Candy Cane',e:'🍭',base:50,sup:320622,estP:1},{id:'vice',n:'Vice Cream',e:'🍦',base:75,sup:500000},{id:'snoop',n:'Snoop Dogg',e:'🐶',base:200,sup:600000},{id:'mood',n:'Mood Pack',e:'🎒',base:500,sup:100000,estP:1,estS:1},{id:'cigar',n:'Snoop Cigar',e:'🚬',base:1000,sup:120000}];
var GOLD={plush:'vice',cap:'candy',heart:'mood',rocket:'snoop',crown:'snoop',orb:'mood',gem:'cigar',dragon:'cigar'};
var GRN=['Обычный','Редкий','Эпический','Легендарный','Мифический'],GRC=['#9e9e9e','#3b82f6','#a855f7','#ff9500','#ff3b30'],GRB=[0,.3,.8,2,6];
var GMOD=[['Классика'],['Золотой','Серебряный'],['Неон','Хром'],['Кристалл','Лавовый'],['Призрачный']];
var GBD=[[['Серый туман','#6b7a8f','#2d3647'],['Графит','#4a4f5c','#1f232b'],['Platinum','#9aa7b8','#4a5568']],[['Небо','#4aa3ff','#1b4fa8'],['Мята','#3ed6a4','#128a6a'],['Pine Green','#2f7d5b','#12392b'],['Feldgrau','#6f7f76','#2f3a35']],[['Закат','#ff8a5c','#b0306b'],['Орхидея','#c26bff','#5a2aa8'],['Sapphire','#2f6bff','#0b2a7a']],[['Рубин','#ff4d6d','#7a0f2b'],['Янтарь','#ffb347','#a85a00']],[['Северное сияние','#5affd6','#3b1fa8'],['Electric Purple','#a63bff','#3a0f7a']]];
var GSY=[['⭐','🌙'],['❄️','🍀'],['🔥','⚡'],['💫','🌸'],['👾']];
var GV=null,GTO='',GPOS=[[10,12],[72,10],[84,46],[14,70],[66,78],[42,6]];
function GT(id){return GT_.filter(function(t){return t.id==id})[0]}
function findGift(id){return (S.gifts||[]).filter(function(g){return g.id==id})[0]}
function rollR(){var r=Math.random()*100,w=[55,25,12,6,2],i=0;for(;i<4;i++){r-=w[i];if(r<=0)break}return i}
function randGiftType(){var w=[34,28,20,12,6],r=Math.random()*100,i=0;for(;i<w.length-1;i++){r-=w[i];if(r<=0)break}return GT_[i].id}
function giftMigrate(){(S.gifts||[]).forEach(function(x){if(!GT(x.type))x.type=GOLD[x.type]||GT_[0].id;if(x.up&&x.ser>GT(x.type).sup)x.ser=ri(1,GT(x.type).sup)})}
function glog(x){S.glog=S.glog||[];S.glog.unshift({t:Date.now(),x:x});if(S.glog.length>40)S.glog.pop()}
function gname(g){var t=GT(g.type);return g.up?g.md[0]+' '+t.n+' #'+g.ser:t.n}
function giftWorth(g){var t=GT(g.type);if(!g.up)return t.base;var b=GRB[g.md[1]]+GRB[g.bd[3]]+GRB[g.sy[1]],sb=g.ser<=10?2:g.ser<=100?.5:g.ser<=1000?.2:0;return Math.round(t.base*(1+b+sb))}
function giftRar(g){return g.up?Math.max(g.md[1],g.bd[3],g.sy[1]):0}
function giveGift(type,from){S.gifts=S.gifts||[];var g={id:Date.now()+''+ri(100,999),type:type,up:0,ts:Date.now(),from:from||null};S.gifts.unshift(g);glog('Получен подарок «'+GT(type).n+'»'+(from?' от @'+from:''));save();return g}
function buyGift(type){var t=GT(type);if(!t)return;if(!pay('star',t.base,'Подарок «'+t.n+'»'))return toast('Не хватает звёзд');giveGift(type);hap({type:'notification',notification_type:'success'});toast('🎁 «'+t.n+'» в твоих подарках');draw()}
function mkNft(g,boost){var t=GT(g.type),k=boost||0,mr=Math.min(4,rollR()+k),br=Math.min(4,rollR()+k),sr=Math.min(4,rollR()+k),b=rnd(GBD[br]);g.md=[rnd(GMOD[mr]),mr];g.bd=[b[0],b[1],b[2],br];g.sy=[rnd(GSY[sr]),sr];g.ser=ri(1,t.sup);g.up=1}
function upgradeGift(id){var g=findGift(id);if(!g||g.up)return;var t=GT(g.type),cost=Math.round(t.base*.4);
 if(!pay('star',cost,'Улучшение подарка'))return toast('Не хватает звёзд');
 mkNft(g,0);
 glog('Улучшен до NFT: '+gname(g));save();hap({type:'notification',notification_type:'success'});toast('✨ NFT создан: '+gname(g));draw()}
function sellGift(id){var g=findGift(id);if(!g)return;var p=Math.round(giftWorth(g)*.7);S.gifts=S.gifts.filter(function(x){return x!==g});gain('star',p,'Продажа подарка');glog('Продан «'+gname(g)+'» за '+abbr(p)+' ⭐');save();toast('💰 Продано «'+gname(g)+'» · +'+money(p));back()}
function sendGiftGo(){var g=findGift(GV);if(!g){back();return}
 if(!/^[a-z0-9_]{5,32}$/.test(GTO)){toast('Введи username: от 5 символов, буквы, цифры, _');return}
 if(TG&&TG.username&&TG.username.toLowerCase()==GTO){toast('Нельзя отправить самому себе');return}
 S.gifts=S.gifts.filter(function(x){return x!==g});glog('Отправлен «'+gname(g)+'» → @'+GTO);save();hap({type:'notification',notification_type:'success'});toast('🎁 Подарок отправлен @'+GTO);GTO='';back()}
function giftTick(){if(!S.gifts)S.gifts=[];if(S.gifts.length<60&&Math.random()<.002){giveGift(randGiftType(),rnd(BOTN))}}
function gAct(s){var i=s.indexOf(':'),v=s.slice(0,i),a=s.slice(i+1);
 if(v=='case'){CV=a;go('case')}else if(v=='copen')openCase(a);else if(v=='open'){GV=a;go('gift')}else if(v=='tab'){S.gt=a;save();draw()}else if(v=='buy')buyGift(a);else if(v=='up')upgradeGift(a);
 else if(v=='send'){FG={k:'gift',id:a};go('fgift')}
 else if(v=='sell'){var g=findGift(a);if(g)ask('Продать «'+gname(g)+'» за '+money(Math.round(giftWorth(g)*.7))+'?','Продать',function(){sellGift(a)})}}
function giftArt(g,big){var t=GT(g.type),c1='#3a4a68',c2='#1f2a40',pat='';
 if(g.up){c1=g.bd[1];c2=g.bd[2];pat=GPOS.map(function(p){return '<span class="gsy" style="left:'+p[0]+'%;top:'+p[1]+'%">'+g.sy[0]+'</span>'}).join('')}
 return '<div class="gart'+(big?' big':'')+'" style="background:linear-gradient(145deg,'+c1+','+c2+')">'+pat+'<span class="ge">'+t.e+'</span></div>'}
function giftCard(g){var r=giftRar(g);return '<button class="gcard" data-g="open:'+g.id+'">'+giftArt(g)+'<b>'+GT(g.type).n+'</b><small>'+(g.up?'#'+g.ser+' · '+g.md[0]:'Обычный подарок')+'</small><span class="gb" style="background:'+(g.up?GRC[r]:'var(--sep)')+';color:'+(g.up?'#fff':'var(--sub)')+'">'+(g.up?GRN[r]:'можно улучшить')+'</span></button>'}
function giftsMini(){var L=(S.gifts||[]).slice(0,6);
 return (L.length?'<div class="ggrid">'+L.map(giftCard).join('')+'</div>':'<div class="empty">Подарков пока нет<br>Их можно получить в колесе фортуны или купить</div>')+'<button class="pbtn" style="width:100%;margin-top:12px" data-go="gifts">Все подарки</button>'}
function giftsHtml(){var tb=S.gt||'mine',n=(S.gifts||[]).length,body='';if(tb=='cases')tb='mine';
 if(tb=='mine')body=n?'<div class="ggrid">'+S.gifts.map(giftCard).join('')+'</div>':emp('gift','Подарков пока нет<br>Получай их в колесе фортуны или покупай в каталоге',40);
 else if(tb=='shop')body='<div class="grp">'+GT_.map(function(t){return '<button class="go" data-g="buy:'+t.id+'"><span class="gmini" style="background:linear-gradient(145deg,#3a4a68,#1f2a40)">'+t.e+'</span><div>'+t.n+'<br><small style="margin:0">тираж '+(t.estS?'≈ ':'')+fmt(t.sup)+'</small></div><small style="margin-left:auto;color:var(--blue)">'+(t.estP?'≈ ':'')+money(t.base)+'</small></button>'}).join('')+'</div><div class="foot">Подарок можно улучшить до NFT: у него появятся уникальные модель, фон, символ и номер. Значок «≈» значит, что цена или тираж пока приблизительные. Картинки пока заменены эмодзи.</div>';
 else body=(S.glog||[]).length?'<div class="grp">'+S.glog.slice(0,25).map(function(e){return '<div class="tx"><div class="txm"><b>'+esc(e.x)+'</b><small>'+dt(e.t)+'</small></div></div>'}).join('')+'</div>':'<div class="empty">Событий пока нет</div>';
 return balBar(1,'gst','gtn')+'<div class="devb">Раздел в разработке: возможны изменения</div><div class="seg" style="margin-top:12px">'+[['mine','Мои · '+n],['shop','Каталог'],['log','История']].map(function(x){return '<button class="'+(tb==x[0]?'on':'')+'" data-g="tab:'+x[0]+'">'+x[1]+'</button>'}).join('')+'</div><div style="margin-top:12px">'+body+'</div>'}
function giftDetail(){var g=findGift(GV);if(!g)return '<div class="empty">Подарок не найден</div>';var t=GT(g.type),r=giftRar(g),w=giftWorth(g);
 return '<div style="text-align:center">'+giftArt(g,1)+'<div style="font-size:22px;font-weight:800;margin-top:12px">'+gname(g)+'</div>'+(g.up?'<span class="gb" style="background:'+GRC[r]+';color:#fff;font-size:13px">'+GRN[r]+'</span>':'<div class="ls" style="margin-top:4px">Обычный подарок</div>')+'</div>'+
  (g.up?'<div class="grp" style="margin-top:16px">'+[['Модель',g.md[0],g.md[1]],['Фон',g.bd[0],g.bd[3]],['Символ',g.sy[0],g.sy[1]]].map(function(a){return '<div class="go"><span>'+a[0]+'</span><small style="color:'+GRC[a[2]]+'">'+a[1]+' · '+GRN[a[2]]+'</small></div>'}).join('')+'<div class="go"><span>Номер</span><small>#'+g.ser+' из '+fmt(t.sup)+'</small></div></div>':'')+
  '<div class="grp" style="margin-top:12px"><div class="go"><span>Оценка</span><small>'+money(w)+'</small></div>'+(g.from?'<div class="go"><span>От кого</span><small>@'+esc(g.from)+'</small></div>':'')+'</div>'+
  '<div class="row2" style="margin-top:16px">'+(g.up?'':'<button class="pbtn" style="flex:1" data-g="up:'+g.id+'">Улучшить · '+money(Math.round(t.base*.4))+'</button>')+'<button class="pbtn" style="flex:1" data-g="send:'+g.id+'">Подарить другу</button></div>'+
  '<button class="pbtn gray" style="width:100%;margin-top:10px" data-g="sell:'+g.id+'">Продать · '+money(Math.round(w*.7))+'</button>'}
function giftSendHtml(){var g=findGift(GV);if(!g)return '<div class="empty">Подарок не найден</div>';
 return '<div style="text-align:center">'+giftArt(g,1)+'<div style="font-size:20px;font-weight:800;margin-top:12px">'+gname(g)+'</div></div><div class="sec">Кому (username в Telegram)</div><input id="gto" class="inp" placeholder="@username" value="'+esc(GTO)+'" maxlength="33" autocapitalize="off" autocomplete="off" spellcheck="false"><button class="act m" style="width:100%;margin-top:18px" data-act="gsendgo">Отправить подарок</button><div class="foot">Демо: настоящая отправка другому игроку появится вместе с сервером.</div>'}

// Рефералы: приглашай друзей по ссылке и получай награды (подсчёт ведёт сервер)
var TITLES={amb:'Амбассадор',leg:'Легенда Юзерка'};
var REFM=[{n:1,star:2500,ton:0.5,t:'2 500 ⭐ и 0,5 TON'},{n:10,nick:1,t:'случайный мифический или легендарный юзернейм'},{n:25,title:'amb',star:10000,t:'титул «Амбассадор» и 10 000 ⭐'},{n:100,title:'leg',ton:25,star:100000,t:'титул «Легенда Юзерка», 25 TON и 100 000 ⭐'}];
var REF_WELCOME=300,REF_NEED=3,RF=null,RBOT='';
function titleChip(){var T=S.titles||[];if(!T.length)return '';var k=T.indexOf('leg')>=0?'leg':T[T.length-1];return ' <span class="ttl '+k+'">'+TITLES[k]+'</span>'}
function refLink(){return RBOT&&TG&&TG.id?'https://t.me/'+RBOT+'?start=ref_'+TG.id:''}
function refsInfo(){if(RBOT||!cloudOn())return;cpost('/api/info',{}).then(function(r){if(r&&r.ok&&r.bot){RBOT=r.bot;if(scr=='friends')draw()}}).catch(function(){})}
function refsLoad(){if(!cloudOn()||!CL.loaded)return;refsInfo();
 cpost('/api/refs',{initData:cInit()}).then(function(r){if(!r||!r.ok)return;RF=r;if(r.patch){srvApply(r);(r.msgs||[]).forEach(function(m){toast(m)});if(scr=='home')paintHome()}else refsApply(r);if(scr=='friends')draw()}).catch(function(){})}
function refsApply(r){var act=r.act||0,paid=S.refPaid||0,ch=false,msgs=[];
 if(r.inviter&&!S.refWelcome){S.refWelcome=1;S.yuz+=REF_WELCOME;ch=true;msgs.push('Бонус приглашённого: +'+money(REF_WELCOME))}
 if(act>paid){REFM.forEach(function(m){if(paid<m.n&&act>=m.n){ch=true;if(m.star)S.yuz+=m.star;if(m.ton)S.ton=r3((S.ton||0)+m.ton);
   if(m.nick){var tt=Math.random()<.7?'legend':'mythic',nk={u:build(tt),tier:tt,base:baseFor(tt),ts:Date.now()};nk.odds=oddsOf(tier(tt));S.coll.unshift(nk);noteBest(nk);msgs.push('Реферальный ник: @'+nk.u)}
   if(m.title){S.titles=S.titles||[];if(S.titles.indexOf(m.title)<0)S.titles.push(m.title);msgs.push('Титул: '+TITLES[m.title])}
   msgs.push(m.n+' друзей: '+m.t)}});S.refPaid=act}
 if(ch){led('Реферальная программа');save();msgs.forEach(function(x){toast(x)});if(scr=='home')paintHome()}}
function refCopy(){var l=refLink();if(!l)return toast('Ссылка ещё загружается');
 function fb(){var a=document.createElement('textarea');a.value=l;document.body.appendChild(a);a.select();try{document.execCommand('copy');toast('Ссылка скопирована')}catch(e){toast(l)}document.body.removeChild(a)}
 try{navigator.clipboard.writeText(l).then(function(){toast('Ссылка скопирована')},fb)}catch(e){fb()}}
function refShare(){var l=refLink();if(!l)return toast('Ссылка ещё загружается');
 var u='https://t.me/share/url?url='+encodeURIComponent(l)+'&text='+encodeURIComponent('Залетай в «Юзерок: Рулетка»: крути рулетку, находи редкие юзернеймы и получай подарки. Держи бонус по моей ссылке 👇'),w=window.Telegram&&window.Telegram.WebApp;
 try{if(w&&w.openTelegramLink)w.openTelegramLink(u);else window.open(u,'_blank')}catch(e){window.open(u,'_blank')}}
function friendsHtml(){if(!cloudOn())return emp('users','Приглашения работают внутри Telegram',50);
 var d=RF||{},act=d.act||0,tot=d.total||0,l=refLink();
 return '<div class="refc"><div class="refh">Приглашай друзей</div><div class="refp">Друг считается активным, когда зарегистрируется и сделает <b>'+REF_NEED+' прокрутки</b>. За каждый рубеж ты получаешь награду, а другу в подарок <b>+'+money(REF_WELCOME)+'</b>.</div></div>'+
  (l?'<div class="reflink">'+esc(l)+'</div><div class="row2" style="margin-top:10px"><button class="act" data-act="refcopy">Копировать</button><button class="pbtn" style="flex:1" data-act="refshare">Поделиться</button></div>':'<div class="empty" style="padding:18px 0">Загружаем ссылку…</div>')+
  '<div class="stats3" style="grid-template-columns:1fr 1fr;margin-top:14px"><div class="stat"><b>'+tot+'</b><small>приглашено</small></div><div class="stat"><b>'+act+'</b><small>активных</small></div></div>'+
  '<div class="sec">Награды за друзей</div><div class="grp">'+REFM.map(function(m){var ok=act>=m.n;return '<div class="go"><span style="width:12px;height:12px;border-radius:50%;background:'+(ok?'#34c759':'var(--sep)')+';flex:none"></span><span>'+m.n+' друзей</span><small style="color:'+(ok?'#34c759':'var(--sub)')+'">'+(ok?'✓ ':'')+m.t+'</small></div>'}).join('')+'</div>'+
  ((d.list||[]).length?'<div class="sec">Твои друзья</div><div class="grp">'+d.list.map(function(f){var a=f.spins>=REF_NEED;return '<div class="go"><span>'+esc(f.name||'Игрок')+'</span><small style="color:'+(a?'#34c759':'var(--sub)')+'">'+(a?'активен ✓':'прокрутки '+Math.min(f.spins,REF_NEED)+'/'+REF_NEED)+'</small></div>'}).join('')+'</div>':'')+
  '<div class="foot">Ссылка работает для тех, кто ещё не играл. Награды за рубежи выдаются один раз.</div>'}

// Маркет: аукцион, продажа, продажа пользователю, предложения
function defPrice(){var w=worth({u:LU,tier:LT,base:LB}),k=LM=='auc'?1.5:1.2;return LC=='ton'?Math.max(.002,r3(w/RATE*k)):Math.max(2,Math.round(w*k))}
function minBid(l){if(l.cc=='ton')return l.bidder?r3(l.price+Math.max(.001,l.price*.1)):l.price;return l.bidder?l.price+Math.max(1,Math.ceil(l.price*.1)):l.price}
function avatar(u,t,ix){return '<div class="mav" style="background:linear-gradient(135deg,'+t.color+','+t.color+'99)'+(ix>=3?';box-shadow:0 0 14px '+t.color+'88':'')+'">'+esc(u.charAt(0).toUpperCase())+'</div>'}
function starVal(l){return l.cc=='ton'?l.price*RATE:l.price}
function lotsFiltered(mode){var f=S.mf||{},q=(S.mq||'').toLowerCase(),L=(S.lots||[]).filter(function(x){return mode=='mine'?!!x.mine:(!x.mine&&(mode=='fix')==!!x.fx)});
 if(q)L=L.filter(function(l){return l.u.indexOf(q)>=0});
 if(mode!='mine'){if(f.cc&&f.cc!='all')L=L.filter(function(l){return l.cc==f.cc});if(f.t>=0)L=L.filter(function(l){return ti(l.tier)==f.t})}
 var so=f.s||'end';return L.sort(function(a,b){return so=='asc'?starVal(a)-starVal(b):so=='desc'?starVal(b)-starVal(a):a.endsAt-b.endsAt})}
var SRCI='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/></svg>';
function mFilters(){var f=S.mf||{},cc=f.cc||'all',t=f.t===undefined?-1:f.t,so=f.s||'end',SL={end:'Скоро закончатся',asc:'Сначала дешёвые',desc:'Сначала дорогие'},md=S.mt||'auc',
 base=(S.lots||[]).filter(function(x){return !x.mine&&(md=='fix')==!!x.fx}),cnt={};base.forEach(function(l){var k=ti(l.tier);cnt[k]=(cnt[k]||0)+1});
 var act=cc!='all'||t>=0||!!S.mq;
 return '<div class="msearch">'+SRCI+'<input id="msq" placeholder="Поиск ника" value="'+esc(S.mq||'')+'" autocomplete="off" autocapitalize="off" spellcheck="false"></div>'+
  '<div class="fchips"><button class="fc'+(cc=='all'?' on':'')+'" data-mf="cc:all">Все</button><button class="fc'+(cc=='star'?' on':'')+'" data-mf="cc:star">'+SI(16)+'</button><button class="fc'+(cc=='ton'?' on':'')+'" data-mf="cc:ton">'+TI(16)+'</button>'+
  TIERS.map(function(tr,i){return '<button class="fc rc'+(t==i?' on':'')+'" data-mf="t:'+(t==i?-1:i)+'"><i class="rdt" style="background:'+tr.color+'"></i>'+(cnt[i]||0)+'</button>'}).join('')+
  '<button class="fc" data-ms="1">'+SL[so]+'</button>'+(act?'<button class="fc" data-mf="reset:1">Сбросить</button>':'')+'</div>'}
function lotRow(l){var t=tier(l.tier),m=mult(l.u),ix=ti(l.tier),left=l.endsAt-Date.now(),st='',b='';
 if(l.mine){st=l.fx?(l.to?'ждёт @'+esc(l.to):'ждёт покупателя'):(l.bidder?'есть ставка':'нет ставок');if(!l.bidder)b='<button class="pbtn sm" data-cancel="'+l.id+'">Снять</button>'}
 else if(l.fx){b='<button class="pbtn sm" data-buy="'+l.id+'">Купить</button>'}
 else{st=l.bidder=='me'?'✓ твоя ставка':(l.bidder?'ставка есть':'');if(l.bidder!='me')b='<button class="pbtn sm" data-bid="'+l.id+'">Ставка · '+cash(minBid(l),l.cc)+'</button>'}
 return '<div class="mrow"><div class="mleft">'+avatar(l.u,t,ix)+'<div class="mmid"><b>@'+l.u+'</b><div class="msub">'+t.icon+' '+t.name+(m.m>1?' · ×'+fm(m.m):'')+'</div><div class="mtags"><span class="tm'+(left<30000?' hot':'')+'" data-end="'+l.endsAt+'">'+tleft(left)+'</span>'+(l.cc=='ton'?'<span class="cb" style="background:#4f9bff">TON</span>':'')+(l.to?'<span class="cb" style="background:#a259f7">для @'+esc(l.to)+'</span>':'')+'</div><div class="msub">'+(l.mine?'твой лот':'@'+esc(l.seller))+'</div></div></div>'+
  '<div class="mright"><div class="mprice">'+cash(l.price,l.cc)+'</div><div class="mst">'+(l.fx?'цена':(l.bidder?'ставка':'старт'))+(st?' · '+st:'')+'</div>'+b+'</div></div>'}
function lotsHtml(mode){var L=lotsFiltered(mode);
 if(!L.length)return '<div class="empty">'+(mode=='mine'?'У тебя пока нет лотов<br>Выставь ник из коллекции':'Ничего не найдено<br>Измени фильтры или поиск')+'</div>';
 return '<div class="msum">'+L.length+' '+(L.length==1?'лот':'лотов')+'</div><div class="grp mlist">'+L.map(lotRow).join('')+'</div>'}
function offersHtml(){var O=S.offers||[];if(!O.length)return '';
 return '<div class="sec">Предложения тебе</div><div class="grp mlist">'+O.map(function(o){var t=tier(o.tier),m=mult(o.u),ix=ti(o.tier),left=o.endsAt-Date.now();
  return '<div class="mrow"><div class="mleft">'+avatar(o.u,t,ix)+'<div class="mmid"><b>@'+o.u+'</b><div class="msub">'+t.icon+' '+t.name+(m.m>1?' · ×'+fm(m.m):'')+'</div><div class="mtags"><span class="tm" data-end="'+o.endsAt+'">'+tleft(left)+'</span>'+(o.cc=='ton'?'<span class="cb" style="background:#4f9bff">TON</span>':'')+'</div><div class="msub">от @'+esc(o.from)+' · лично тебе</div></div></div><div class="mright"><div class="mprice">'+cash(o.price,o.cc)+'</div><div class="mbt"><button class="pbtn sm" data-oacc="'+o.id+'">Принять</button><button class="pbtn sm gray" data-orej="'+o.id+'">Нет</button></div></div></div>'}).join('')+'</div>'}
function newLot(fx){var t=TIERS[rnd([0,1,1,2,2,3,4])],u=build(t.id),bs=baseFor(t.id),w=worth({u:u,tier:t.id,base:bs}),tn=ti(t.id)>=3&&Math.random()<.4,k=fx?1.3:1.5;
 return{id:Date.now()+''+ri(100,999),u:u,tier:t.id,base:bs,cc:tn?'ton':'star',fx:fx?1:0,seller:rnd(BOTN),price:tn?Math.max(.002,r3(w/RATE*k)):Math.max(2,Math.round(w*k)),bidder:null,endsAt:Date.now()+(fx?ri(180,600):ri(60,300))*1000}}
function offerNew(){var t=TIERS[rnd([1,2,2,3,3,4])],u=build(t.id),bs=baseFor(t.id),w=worth({u:u,tier:t.id,base:bs}),tn=ti(t.id)>=3&&Math.random()<.3;
 return{id:Date.now()+''+ri(100,999),from:rnd(BOTN),u:u,tier:t.id,base:bs,cc:tn?'ton':'star',price:tn?Math.max(.002,r3(w/RATE*.9)):Math.max(2,Math.round(w*.9)),endsAt:Date.now()+ri(180,360)*1000}}
function findLot(id){return (S.lots||[]).filter(function(x){return x.id==id})[0]}
function pay(cc,v,r){if(cc=='ton'){if((S.ton||0)<v)return false;S.ton=r3((S.ton||0)-v)}else{if(S.yuz<v)return false;S.yuz-=v}led(r||'Покупка');return true}
function gain(cc,v,r){if(cc=='ton')S.ton=r3((S.ton||0)+v);else S.yuz+=v;led(r||'Доход')}
function bid(id){var l=findLot(id);if(!l||l.mine||l.fx||l.bidder=='me')return;var mb=minBid(l);
 if(!pay(l.cc,mb,'Ставка на @'+l.u))return toast('Не хватает '+(l.cc=='ton'?'TON':'звёзд'));
 l.price=mb;l.bidder='me';tq('bid1');save();hap({type:'impact',impact_style:'light'});toast('Ставка принята: '+cash(mb,l.cc));draw()}
function buyLot(id){var l=findLot(id);if(!l||l.mine||!l.fx)return;
 if(!pay(l.cc,l.price,'Покупка @'+l.u))return toast('Не хватает '+(l.cc=='ton'?'TON':'звёзд'));
 S.lots=S.lots.filter(function(x){return x!==l});var rec={u:l.u,tier:l.tier,base:l.base,odds:oddsOf(tier(l.tier)),ts:Date.now()};S.coll.unshift(rec);noteBest(rec);
 save();hap({type:'notification',notification_type:'success'});toast('🛒 Куплено @'+l.u+' · −'+cash(l.price,l.cc));draw()}
function cancelLot(id){var l=findLot(id);if(!l||!l.mine||l.bidder)return;
 S.lots=S.lots.filter(function(x){return x!==l});S.coll.unshift({u:l.u,tier:l.tier,base:l.base,odds:oddsOf(tier(l.tier))});save();toast('Лот снят, ник вернулся в коллекцию');draw()}
function acceptOffer(id){var o=(S.offers||[]).filter(function(x){return x.id==id})[0];if(!o)return;
 if(!pay(o.cc,o.price,'Покупка @'+o.u))return toast('Не хватает '+(o.cc=='ton'?'TON':'звёзд'));
 S.offers=S.offers.filter(function(x){return x!==o});var rec={u:o.u,tier:o.tier,base:o.base,odds:oddsOf(tier(o.tier)),ts:Date.now()};S.coll.unshift(rec);noteBest(rec);
 save();hap({type:'notification',notification_type:'success'});toast('🤝 Принято: @'+o.u+' · −'+cash(o.price,o.cc));draw()}
function rejectOffer(id){S.offers=(S.offers||[]).filter(function(x){return x.id!=id});save();draw()}
function auTick(){var now=Date.now(),ch=false;S.lots=S.lots||[];S.offers=S.offers||[];
 S.lots=S.lots.filter(function(l){if(l.endsAt>now)return true;ch=true;var rec={u:l.u,tier:l.tier,base:l.base,odds:oddsOf(tier(l.tier))};
  if(l.mine){if(l.bidder){var g=l.cc=='ton'?r3(l.price*feeK()):Math.floor(l.price*feeK());gain(l.cc,g,'Продан лот @'+l.u);toast('💰 Лот продан: @'+l.u+' · +'+cash(g,l.cc))}else{S.coll.unshift(rec);toast('@'+l.u+' не продан, вернулся в коллекцию')}}
  else if(l.bidder=='me'){S.coll.unshift(rec);noteBest(rec);toast('🏆 Ты выиграл @'+l.u)}
  return false});
 S.lots.forEach(function(l){
  if(l.mine&&l.fx){var cap=(l.cc=='ton'?worth(l)/RATE+.001:worth(l)+2)*(l.to?2:1.6);
   if(l.price<=cap&&Math.random()<(l.to?.025:.04)){l.sold=1;var g2=l.cc=='ton'?r3(l.price*feeK()):Math.floor(l.price*feeK());gain(l.cc,g2,'Продан @'+l.u);toast('💰 '+(l.to?'@'+l.to:'Покупатель')+' купил @'+l.u+' · +'+cash(g2,l.cc));ch=true}return}
  if(l.fx)return;
  if(l.mine){if(Math.random()<.07&&l.price<(l.cc=='ton'?worth(l)/RATE*1.3+.001:worth(l)*4+4)){l.price=minBid(l);l.bidder='bot';ch=true}}
  else if(Math.random()<.03){var mb=minBid(l);if(l.bidder=='me'){gain(l.cc,l.price,'Возврат ставки @'+l.u);toast('Тебя перебили: @'+l.u)}l.price=mb;l.bidder='bot';ch=true}});
 S.lots=S.lots.filter(function(l){return !l.sold});
 led('Операция');giftTick();if(isPrem()&&S.freeDay!==dk(new Date())){S.freeDay=dk(new Date());S.free=(S.free||0)+1;toast('✨ Premium: бесплатная прокрутка дня');ch=true}
 var no=S.offers.length;S.offers=S.offers.filter(function(o){return o.endsAt>now});if(S.offers.length!=no)ch=true;
 if(S.offers.length<2&&Math.random()<.015){var o=offerNew();S.offers.push(o);ch=true}
 var nA=S.lots.filter(function(x){return !x.mine&&!x.fx}).length,nF=S.lots.filter(function(x){return !x.mine&&x.fx}).length;
 while(nA<4){S.lots.push(newLot(0));nA++;ch=true}while(nF<4){S.lots.push(newLot(1));nF++;ch=true}
 if(ch){save();if(scr=='market')draw();else if(scr=='home'&&!busy)paintHome()}
 tickTimers()}
function tickTimers(){var now=Date.now();
 if(scr=='wheel'&&!WBUSY){var rdy=wheelReady()+':'+S.wt;if(WA_!==rdy){WA_=rdy;draw()}else{var wt=document.getElementById('wtimer');if(wt)wt.textContent=wheelLeft()}}
 if(scr=='market'){var q=document.querySelectorAll('[data-end]');for(var i=0;i<q.length;i++){var lf=q[i].getAttribute('data-end')-now;q[i].textContent=tleft(lf);q[i].classList.toggle('hot',lf<30000)}}}

// Ядро генератора: сборка ника и прокрутка
function build(id){switch(id){
 case 'common':var k=ri(0,2);if(k==0)return rnd(NAMES)+'_'+rnd(SURN)+'_'+ri(10,99);if(k==1)return pron(ri(6,9))+ri(100,9999);return rnd(SHORTN)+'_'+rnd(WORDS)+ri(1,999);
 case 'norm':return Math.random()<.5?pron(ri(8,12)):rnd(NAMES)+rnd(WORDS);
 case 'rare':return Math.random()<.7?rnd(NAMES):pron(ri(6,7));
 case 'epic':return Math.random()<.7?rnd(SHORTN):pron(ri(4,5));
 case 'legend':return Math.random()<.75?rnd(FRAG_L.concat(WORDS)):pron(3);
 case 'mythic':return Math.random()<.45?'abcdefghijklmnopqrstuvwxyz'.charAt(ri(0,25)):rnd(FRAG_M);
 default:return rnd(DIVINE)}}
function spin(){if(busy)return;
 if(S.pending)return toast('Сначала реши: продать или оставить');
 var fr=S.free>0;if(!fr&&S.yuz<COST)return toast('Не хватает звёзд: прокрутка стоит '+money(COST));
 busy=true;var P=SRV()?srvRun('spinRoll',[],{raw:true}):null;
 var D=S.anim===false?[70]:[55,60,68,80,96,116,140,170,205,245],n=0;
 function done(o){var rr=o&&o.res;busy=false;var he=$('huname');if(he)he.style.opacity='1';
  if(!rr||rr.err||!rr.r){paintHome();if(o&&o.err)toast('Нет связи с сервером');return}
  var r=rr.r;cur=r;paintHome(1);buzzEnd(r);(o.msgs||[]).forEach(function(m){toast(m)});autoHandle(r)}
 function finish(){if(P)P.then(done);else done({res:spinRoll(),msgs:[]})}
 function step(){hap({type:'selection_change'});var he=$('huname');if(he){he.textContent='@'+pron(ri(5,9));he.style.opacity='.45';$('hrar').textContent='…';$('hrar').style.color='var(--sub)'}
  if(++n>=D.length)finish();else setTimeout(step,D[n])}
 setTimeout(step,D[0])}
var AS=false,ASN=0,ASt=null;
function autoLoop(){if(!AS)return;
 if(busy){ASt=setTimeout(autoLoop,300);return}
 if(S.pending){if(willAuto(S.pending)){ASt=setTimeout(autoLoop,300);return}stopAuto('⏸ Автопрокрутка: выпал @'+S.pending.u+' — реши, продать или оставить');return}
 if(S.free<=0&&S.yuz<COST){stopAuto('⏹ Не хватает звёзд для прокрутки');return}
 if(S.free<=0&&S.yuz-COST<(S.asMin||0)){stopAuto('⏹ Достигнут резерв баланса');return}
 if(S.asLimit&&ASN>=S.asLimit){stopAuto('⏹ Лимит прокруток: '+S.asLimit);return}
 spin();ASN++;paintHome();ASt=setTimeout(autoLoop,500)}
function toggleAuto(){if(AS){stopAuto('⏹ Автопрокрутка остановлена');return}
 if(S.pending){toast('Сначала реши: продать или оставить');return}
 if(!S.auto){S.auto=true;S.autoMax=S.autoMax||0;toast('Авто-продажа включена: обычные ники продаются сами')}
 AS=true;ASN=0;paintHome();autoLoop()}
function stopAuto(m){AS=false;clearTimeout(ASt);if(m)toast(m);paintHome()}


toast=function(m){MSGS.push(String(m))};
var BOTN=BOTS.map(function(b){return b[0]});
function giftSend(kind,id,to){var rec=takeForSend(kind,id);if(!rec)return{err:'item'};sendDone(kind,rec,to);return{ok:1,rec:rec}}
function giftRefund(kind,rec){if(kind=='nick')S.coll.unshift(rec);else S.gifts.unshift(rec);return{ok:1}}
var ACT={keepPending:keepPending,sellPending:sellPending,sellOne:sellOne,sellBulk:sellBulk,claimTask:claimTask,claimChest:claimChest,buyLuck:buyLuck,exchangeTon:exchangeTon,buyGift:buyGift,upgradeGift:upgradeGift,sellGift:sellGift,bid:bid,buyLot:buyLot,cancelLot:cancelLot,acceptOffer:acceptOffer,rejectOffer:rejectOffer,listLot:listLot,autoResolve:autoResolve,admGrant:admGrant,tickNow:tickNow,resetAll:resetAll,spinRoll:spinRoll,wheelRoll:wheelRoll};
var INTERNAL={refsApply:refsApply,giftSend:giftSend,giftRefund:giftRefund};
function catchUp(){var now=Date.now(),last=S.tkAt||now,n=Math.min(120,Math.floor((now-last)/1000));S.tkAt=now;for(var i=0;i<n;i++)auTick();if(!n)auTick()}
return{
 PREFK:PREFK,
 allowed:function(fn){return Object.prototype.hasOwnProperty.call(ACT,fn)},
 fresh:function(){S=defState();initState();return S},
 run:function(state,fn,args,ctx){ctx=ctx||{};S=state;MSGS=[];ADM=!!ctx.adm;cur=null;initState();
  if(ctx.inbox&&ctx.inbox.length)inboxReceive(ctx.inbox);
  catchUp();var res=null;
  if(fn!=='__load'&&fn!=='__noop'){var f=ctx.internal?INTERNAL[fn]:ACT[fn];if(!f)throw new Error('bad fn');res=f.apply(null,args||[])}
  return{S:S,msgs:MSGS.slice(0,8),res:res}}
};
}
