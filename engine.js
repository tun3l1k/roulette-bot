// Серверный движок игры. ФАЙЛ СОЗДАЁТСЯ АВТОМАТИЧЕСКИ из тех же модулей, что и игра. Не редактировать вручную.
export function createEngine(){
var NOOP=new Proxy(function(){},{get:function(){return NOOP},apply:function(){return NOOP},set:function(){return true}});
var document=NOOP,window=NOOP,navigator=NOOP,location=NOOP,localStorage=NOOP,sessionStorage=NOOP;
var S=null,TG=null,cur=null,busy=false,scr='home',MSGS=[];
function hap(){}function draw(){}function paintHome(){}function go(){}function back(){}function ask(){}function save(){}function SRV(){return false}
// Настройки игры: редкости, словари, диапазоны, курс, задания
var APP_VER='2.2.0';
var NEWS_URL='https://t.me/UsernameRouletteNews',SUPPORT_URL='https://t.me/TUN3L';
var PAY_LIVE=false; // true, когда подключена настоящая оплата Telegram Stars
var TIERS=[
 {id:'common',name:'обычный',icon:'⚪',color:'#9e9e9e',bd:['#8794a8','#3b4658'],w:52,pts:3},
 {id:'norm',name:'необычный',icon:'🟢',color:'#34c759',bd:['#46c27d','#17673f'],w:25,pts:9},
 {id:'rare',name:'редкий',icon:'🔵',color:'#3b82f6',bd:['#5a9bff','#1d3f99'],w:12.5,pts:21},
 {id:'epic',name:'эпический',icon:'🟣',color:'#a855f7',bd:['#b57bff','#4f2196'],w:6.5,pts:36},
 {id:'legend',name:'легендарный',icon:'🟠',color:'#ff9500',bd:['#ffb04a','#b24a0c'],w:3,pts:66},
 {id:'mythic',name:'мифический',icon:'🔴',color:'#ff3b30',bd:['#ff6a5c','#8f1515'],w:0.8,pts:135},
 {id:'divine',name:'божественный',icon:'🌟',color:'#ffd700',bd:['#ffd75a','#b8560a'],w:0.2,pts:520}
];
var BOTS=[['crypto_king',4200],['neo_wolf',1800],['dubai_boss',900],['lena_star',350],['max_ivanov_99',60]];
var RATE=50000;
var RNG={common:[2,5],norm:[5,15],rare:[11,36],epic:[18,61],legend:[33,112],mythic:[68,230],divine:[260,884]};
var TASKS=[{id:'spin10',title:'Сделай 10 прокруток',goal:10,rew:50,ic:'repeat'},{id:'keep3',title:'Оставь 3 ника в коллекции',goal:3,rew:40,ic:'plus'},{id:'sell5',title:'Продай 5 ников',goal:5,rew:40,ic:'tag'},{id:'rare1',title:'Выбей редкий ник',goal:1,rew:150,ic:'star'},{id:'bid1',title:'Сделай ставку на аукционе',goal:1,rew:30,ic:'hammer'},{id:'list1',title:'Выставь ник на маркет',goal:1,rew:30,ic:'list'},{id:'wheel',title:'Крутани колесо фортуны',goal:1,rew:60,ic:'wheel'}];
var WTASKS=[{id:'w_spin',ev:'spin10',title:'Сделай 100 прокруток',goal:100,rew:600,ic:'repeat'},{id:'w_rare',ev:'rare1',title:'Выбей 5 редких ников',goal:5,rew:1000,ic:'star'},{id:'w_sell',ev:'sell5',title:'Продай 30 ников',goal:30,rew:700,ic:'tag'},{id:'w_bid',ev:'bid1',title:'Сделай 5 ставок',goal:5,rew:500,ic:'hammer'},{id:'w_wheel',ev:'wheel',title:'Крутани колесо 3 раза',goal:3,rew:500,ic:'wheel'}];
var COST=100,COLL_MAX=50; // COLL_MAX: сколько ников помещается в коллекции
var LUCK_F=1.5,LUCK_COST=300; // удача: множитель шанса редких и цена за 10 прокруток (подобрано так, чтобы не окупаться)
var WHEEL_MS=5*3600*1000;
var WHEEL=[
 {id:'s50',c:'#5ac8fa',w:28,t:'star',v:50},
 {id:'s150',c:'#34c759',w:27,t:'star',v:150},
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
function tleft(ms){var t=Math.max(0,Math.ceil(ms/1000));if(t>=86400)return Math.floor(t/86400)+' д '+Math.floor(t%86400/3600)+' ч';if(t>=3600)return Math.floor(t/3600)+' ч '+Math.floor(t%3600/60)+' мин';return Math.floor(t/60)+':'+('0'+t%60).slice(-2)}

// Словари ников. Чем короче и «дороже» слово, тем выше редкость, в которой оно выпадает.
var NW=function(s){return s.split(' ')};
// длинные имена (редкие)
var NAMES=NW('alexander dmitry sergey andrew michael nikolay vladimir natalia svetlana victoria daniel kirill eugene maxim artem olivia sophia natasha anastasia ekaterina elizabeth katherine christina alexandra benjamin jonathan nicholas matthew william jennifer jessica michelle stephanie samantha isabella charlotte penelope valentina carolina gabriela adriana federico francesco giovanni leonardo massimo roberto stefano antonio fernando santiago sebastian mauricio patricio ricardo eduardo emanuel konstantin aleksandr aleksey anatoly arkady bogdan boris denis egor evgeny gennady gleb igor ilya leonid lev matvey mikhail miroslav nikita pavel rodion roman ruslan semyon stepan taras timur valery vasily vitaly vlad vyacheslav yaroslav yuri zakhar alina daria diana elena galina irina julia karina larisa liliya lyudmila margarita marina milana nadezhda oksana polina regina rimma sofia tamara tatiana ulyana veronika viktoria vera yana zoya');
// короткие имена (эпические)
var SHORTN=NW('max alex anna ivan oleg lena dima mike sam nick kate john olga ben tom tim jim joe leo ian dan ann eva eve ada ava amy zoe mia lia kim liz meg sue pat ray roy rob bob bill dave mark paul peter steve kevin brian chris david james jack luke adam noah liam owen ryan evan sean seth neil carl hugo igor egor gleb lev ilya kira vera yana dasha masha sasha misha pasha kolya vanya petya nina nika mila lara lina lisa rita rose ruby emma ella elsa iris ivy jade june lily lola luna maya nora rina sara tina vika alla zina');
var SURN=NW('ivanov petrov smirnov volkov kuznetsov popov sokolov morozov lebedev kozlov novikov fedorov mikhailov belov orlov egorov zaitsev pavlov semenov golubev vinogradov bogdanov vorobyov filippov komarov davydov belyaev gerasimov bogomolov osipov sidorov grigoriev romanov zhukov medvedev nikitin sobolev kiselyov ilyin gusev titov kuzmin kudryavtsev baranov kulikov alekseev stepanov yakovlev sorokin sergeev romanenko tarasov smith johnson brown miller davis wilson moore taylor clark lewis walker hall young king wright green baker');
var ADJ=NW('happy lucky sunny wild cool crazy fast lazy brave calm dark light silent shiny golden silver frozen hidden secret magic cosmic electric neon turbo mega super ultra hyper royal cyber atomic mystic noble rapid sneaky swift clever gentle fierce funky grumpy jolly witty sleepy dizzy bold epic cute tiny big little fluffy spicy sweet salty cold hot rusty velvet crystal lunar solar stormy');
var NOUN=NW('cat dog fox wolf bear lion tiger panda koala otter eagle hawk raven owl shark whale dolphin dragon phoenix knight wizard ninja pirate samurai robot rocket comet planet star moon sun cloud storm river ocean forest mountain desert island castle tower bridge garden coffee pizza cookie donut waffle muffin taco sushi ramen pepper lemon cherry peach mango banana');
// слова (3–6 букв): «слово» ×2 к цене
var WORDS=NW('fox sun moon lion star fire ice cat god zen sky wave gold ace boss sea air sand rain snow wind cloud leaf tree rock stone wood iron steel glass paper cube dice card king queen jack joker wolf bear hawk eagle shark tiger panda zebra koala otter horse snake frog crab bee ant bat owl duck swan crow dove river lake ocean beach coast field hill peak cave island storm flash spark blaze flame frost shadow light night dawn dusk day week year hour time space orbit comet star nova pulse beat tune song note drum bass jazz rock punk pop disco dance game play win run jump fly swim race goal score level boss quest magic spell charm luck fate hope dream wish love heart soul mind spirit ghost angel demon hero legend myth tale story book page word line dot point arrow bolt shield sword blade armor crown throne castle tower gate door key lock chain ring gem pearl ruby opal jade amber coral');
// сильные слова в стиле каталога Fragment (легендарные)
var FRAG_L=NW('cash gold bank love game king queen money trade wallet poker vip luck rich boss lion tiger wolf storm fire magic pixel robot ninja pirate rocket diamond silver lucky royal power force glory honor chief prime elite alpha omega delta sigma gamma nexus vertex matrix vector cyber quantum atom proton neutron photon plasma fusion turbo nitro rapid swift flash bolt thunder lightning blizzard volcano meteor galaxy cosmos nebula pulsar quasar orbit rocket falcon raptor viper cobra python panther jaguar cougar phoenix dragon titan giant legend mythic oracle wizard sorcer hunter archer knight paladin templar ranger rogue bandit outlaw sheriff captain admiral general major sergeant master expert genius wisdom sage guru coach mentor trader broker dealer banker miner farmer builder maker creator founder leader winner champ hero star ace pro vault safe coin token chain block ledger stake yield swap bridge forge craft studio label brand agency market store shop deal offer bonus prize jackpot lotto casino bingo domino chess poker bet odds');
// короткие (мифические): 1–3 символа и аббревиатуры
var FRAG_M=NW('ton nft vip btc eth usd ai tg id ok go me win pay art ace xyz abc one two six ten top max pro new hot big low run fly sky sun ice fox cat dog bot app web net dev ops api sdk gpu cpu ram ssd hub lab gem key box bit hex bin dex dao eur gbp cny jpy rub uah kzt aed idx fed ecb imf wto');
// топ-слова (божественные): города, деньги, крипта, бренды-понятия
var DIVINE=NW('dubai moscow london paris bitcoin crypto tokyo casino miami vegas berlin rome madrid istanbul bali telegram wallet invest bank money gold trade bet poker jackpot billion million dollar euro rouble yuan yen franc cash credit capital equity asset profit income salary bonus reward prize luxury premium royal empire kingdom palace castle diamond platinum emerald sapphire crystal ethereum solana ripple dogecoin litecoin stellar cardano polkadot avalanche uniswap chainlink binance coinbase kraken ledger metaverse blockchain airdrop staking mining hodl whale moon rocket lambo yacht jet island paradise heaven olympus atlantis eden zeus apollo athena poseidon odin thor loki titan genesis infinity eternity universe cosmos galaxy sydney toronto singapore hongkong shanghai beijing seoul bangkok monaco geneva zurich vienna prague warsaw kyiv minsk tbilisi baku almaty tashkent');
function uniqW(a){var o={},r=[];a.forEach(function(x){if(!o[x]){o[x]=1;r.push(x)}});return r}
var _sn=NAMES.filter(function(x){return x.length<6});NAMES=NAMES.filter(function(x){return x.length>=6});SHORTN=SHORTN.concat(_sn);DIVINE=DIVINE.filter(function(x){return x.length>=4});
NAMES=uniqW(NAMES);SHORTN=uniqW(SHORTN);SURN=uniqW(SURN);WORDS=uniqW(WORDS);FRAG_L=uniqW(FRAG_L);FRAG_M=uniqW(FRAG_M);DIVINE=uniqW(DIVINE);
// быстрый поиск для множителей
var NSET={d:{},w:{},n:{}};
DIVINE.forEach(function(x){NSET.d[x]=1});WORDS.concat(FRAG_L).forEach(function(x){NSET.w[x]=1});NAMES.concat(SHORTN).forEach(function(x){NSET.n[x]=1});

// ---- Настройки из бота: шансы, цены, шанс крафта, стоимость прокрутки, пополнение словарей ----
// Хранятся на сервере (таблица config, ключ game). Клиент получает их при запуске, сервер — перед каждым действием.
// Формат: {w:{rare:12}, rng:{rare:[20,80]}, cost:100, craft:{rare:.5}, add:{words:['neo']}, del:{words:['cat']}}
var POOLN=['names','surn','short','words','legend','mythic','divine','adj','noun'];
function poolRef(k){return k=='names'?NAMES:k=='surn'?SURN:k=='short'?SHORTN:k=='words'?WORDS:k=='legend'?FRAG_L:k=='mythic'?FRAG_M:k=='divine'?DIVINE:k=='adj'?ADJ:k=='noun'?NOUN:null}
var GC0=null;
function gcBase(){if(GC0)return;GC0={w:TIERS.map(function(t){return t.w}),rng:JSON.parse(JSON.stringify(RNG)),cost:COST,craft:CRAFT_P.slice(),pools:{}};POOLN.forEach(function(k){GC0.pools[k]=poolRef(k).slice()})}
function nsetBuild(){NSET.d={};NSET.w={};NSET.n={};DIVINE.forEach(function(x){NSET.d[x]=1});WORDS.concat(FRAG_L).forEach(function(x){NSET.w[x]=1});NAMES.concat(SHORTN).forEach(function(x){NSET.n[x]=1})}
function gcWord(x){return typeof x=='string'&&/^[a-z0-9_]{1,32}$/.test(x)}
function applyGameCfg(c){gcBase();
 TIERS.forEach(function(t,i){t.w=GC0.w[i]});Object.keys(GC0.rng).forEach(function(k){RNG[k]=GC0.rng[k].slice()});COST=GC0.cost;CRAFT_P=GC0.craft.slice();
 POOLN.forEach(function(k){var a=poolRef(k);a.length=0;GC0.pools[k].forEach(function(x){a.push(x)})});
 if(c&&typeof c=='object'){
  TIERS.forEach(function(t,i){var v=c.w&&+c.w[t.id];if(v>=.001&&v<=1000)t.w=v;var r=c.rng&&c.rng[t.id];if(r&&+r[0]>=1&&+r[1]>=+r[0]&&+r[1]<=1e7)RNG[t.id]=[Math.round(r[0]),Math.round(r[1])];var p=c.craft&&c.craft[t.id];if(p!==undefined&&+p>=0&&+p<=1&&i<CRAFT_P.length)CRAFT_P[i]=+p});
  if(+c.cost>=1&&+c.cost<=1e5)COST=Math.round(c.cost);
  POOLN.forEach(function(k){var a=poolRef(k),d=c.del&&c.del[k],ad=c.add&&c.add[k];
   if(Array.isArray(d))d.forEach(function(x){var j=a.indexOf(x);if(j>=0&&a.length>3)a.splice(j,1)});
   if(Array.isArray(ad))ad.forEach(function(x){if(gcWord(x)&&a.indexOf(x)<0&&a.length<3000)a.push(x)})})}
 nsetBuild()}
function cfgInfo(){var tot=0,i;TIERS.forEach(function(t){tot+=t.w});
 return{tiers:TIERS.map(function(t,i){return{id:t.id,name:t.name,w:t.w,pct:t.w/tot*100,rng:RNG[t.id].slice(),craft:CRAFT_P[i]||0}}),cost:COST,pools:POOLN.map(function(k){return[k,poolRef(k).length]})}}

// Математика редкости и цены: шансы, множители, оценка ника
function tier(id){return TIERS.filter(function(t){return t.id==id})[0]}
function ti(id){return TIERS.indexOf(tier(id))}
function level(){return Math.floor(Math.sqrt(S.xp/25))+1}
function lf(){return Math.max(S.luck>0?LUCK_F:1,S.pity||1)}
function noteBest(r){if(!r)return;if(!S.best||worth(r)>worth(S.best))S.best={u:r.u,tier:r.tier,base:r.base,k:r.k,odds:r.odds,ts:r.ts||Date.now()}}
function pickTier(){var w=TIERS.map(function(t,i){return t.w*(i>=2?lf():1)}),sum=w.reduce(function(a,b){return a+b},0),r=Math.random()*sum;for(var i=0;i<w.length;i++){r-=w[i];if(r<=0)return TIERS[i]}return TIERS[0]}
function oddsOf(t){var w=TIERS.map(function(x,i){return x.w*(i>=2?lf():1)}),sum=w.reduce(function(a,b){return a+b},0);return Math.round(sum/(t.w*(TIERS.indexOf(t)>=2?lf():1)))}
function baseFor(id){var g=RNG[id];return Math.round(g[0]+Math.pow(Math.random(),1.4)*(g[1]-g[0]))}
function mult(u){var m=1,tg=[],pr=[],n=u.length;
 function add(x,lb){m*=x;tg.push(lb);pr.push([lb,x])}
 if(NSET.d[u])add(5,'топ-слово');else if(NSET.w[u])add(2,'слово');else if(NSET.n[u])add(1.5,'имя');
 if(n<=3)add(3,'короткий');else if(n==4)add(2,'короткий');
 if(n>=3&&u===u.split('').reverse().join(''))add(2,'зеркало');
 if(/(777|888|999|000|007|123|321)/.test(u))add(2,'красивые цифры');
 else if(/(\d)\1{2,}/.test(u))add(1.5,'ровные цифры');
 if(n==1)add(5,'одна буква');else if(/^([a-z])\1+$/.test(u))add(3,'повтор буквы');else if(n>=4&&/^(..)\1+$/.test(u))add(1.5,'ритм');
 if(/(19|20)\d\d$/.test(u))add(1.5,'год');
 return{m:m,tags:tg,parts:pr}}
// Бонус прокрутки: после того как выпал ник, выпадает множитель, на который умножается его цена
var BONUS=[{k:1,w:46},{k:1.5,w:22},{k:2,w:15},{k:3,w:9},{k:5,w:4.5},{k:10,w:2.2},{k:25,w:1},{k:100,w:.3}];
function rollBonus(){var s=0,r,i;BONUS.forEach(function(b){s+=b.w});r=Math.random()*s;for(i=0;i<BONUS.length;i++){r-=BONUS[i].w;if(r<=0)return BONUS[i].k}return 1}
function bonusOf(r){return r&&r.k>1?r.k:1}
function bonusColor(k){return k>=100?'#ffd700':k>=25?'#ff3b30':k>=10?'#ff9500':k>=5?'#a855f7':k>=2?'#3b82f6':k>1?'#34c759':'#8e8e93'}
function worthNoBonus(r){return Math.max(1,Math.round((r.base!=null?r.base:tier(r.tier).pts)*mult(r.u).m))}
function worth(r){return Math.max(1,Math.round((r.base!=null?r.base:tier(r.tier).pts)*mult(r.u).m*bonusOf(r)))}
function multText(r){var x=mult(r.u),b=r.base!=null?r.base:tier(r.tier).pts,k=bonusOf(r),pp=x.parts.slice();if(k>1)pp.push(['бонус',k]);if(!pp.length)return 'Цена: '+money(b);return 'Цена: '+money(b)+' '+pp.map(function(p){return '× '+fm(p[1])+' '+p[0]}).join(' ')+' = '+money(worth(r))}
function mxParts(r){var p=mult(r.u).parts.slice(),k=bonusOf(r);if(k>1)p.push(['бонус',k]);return p}
function mxTotal(r){return mult(r.u).m*bonusOf(r)}
// Панель множителей под ником: каждый фактор отдельной плашкой, внизу итог (всё перемножается)
function mxHtml(r,anim){if(!r)return '';var p=mxParts(r),tot=mxTotal(r),col=bonusColor(tot);
 if(!p.length)return '<div class="mxe">без множителей</div>';
 return '<div class="mxrow">'+p.map(function(x,i){var b=x[0]=='бонус';return '<span class="mxc'+(b?' bn':'')+(anim?' in':'')+'" style="'+(b?'color:'+bonusColor(x[1])+';':'')+(anim?'animation-delay:'+(i*120)+'ms':'')+'"><i>'+x[0]+'</i><b>×'+fm(x[1])+'</b></span>'}).join('')+'</div>'+
  '<div class="mxt'+(anim?' in':'')+(tot>=10?' hot':'')+'" style="color:'+col+(anim?';animation-delay:'+(p.length*120)+'ms':'')+'"><small>общий множитель</small><b>×'+fm(tot)+'</b></div>'}
function mx(u){var m=mult(u).m;return m>1?' · ×'+fm(m):''}

// Действия экономики. Этот код выполняется на сервере (источник правды) и локально, если сервера нет
var PREFK=['theme','bsize','haptic','anim','confirm','auto','arules','autoMax','autoKeep','autoTags','autoTagAct','autoCap','autoCapAct','autoNotify','asMin','asLimit','mf','mq','cf','cs','cq','hf','rc','tt','pm','mt'];
function defState(){return {coll:[],hist:[],spins:0,yuz:1500,g1:1,g2:1,g3:1,xp:0,luck:0,theme:'auto'}}
// Подарки убраны из игры: то, что осталось у игроков, один раз переводим в звёзды по цене продажи (70% оценки)
var LGB={candy:50,vice:75,snoop:200,mood:500,cigar:1000},LGR=[0,.3,.8,2,6];
function legacyGiftValue(g){var b=LGB[g.type]||50;if(g.up&&g.md&&g.bd&&g.sy){var s=g.ser<=10?2:g.ser<=100?.5:g.ser<=1000?.2:0;b=b*(1+LGR[g.md[1]]+LGR[g.bd[3]]+LGR[g.sy[1]]+s)}return Math.round(b*.7)}
function giftsToStars(){var L=S.gifts,sum=0;
 if(Array.isArray(L)&&L.length){L.forEach(function(g){sum+=legacyGiftValue(g)});S.yuz+=sum;led('Подарки заменены звёздами');toast('Подарки убраны из игры: вместо них '+money(sum))}
 delete S.gifts;delete S.glog;delete S.cl;delete S.gt}
function initState(){S.coll=S.coll||[];S.hist=S.hist||[];S.since=S.since||Date.now();S.rare=S.rare||S.hist.filter(function(c){return ti(c.tier)>=2});giftsToStars();
 if(!S.best){var b=null;S.coll.concat(S.rare,S.hist).forEach(function(c){if(!b||worth(c)>worth(b))b=c});if(b)noteBest(b)}
 if(S.autoKeep===false&&!S.autoTags)S.autoTags=[];if(!S.bl)S.bl={y:S.yuz,t:S.ton||0}}
function resetAll(){if(!ADM)return{err:'forbidden'};var keep={};PREFK.forEach(function(k){if(S[k]!==undefined)keep[k]=S[k]});S=defState();Object.keys(keep).forEach(function(k){S[k]=keep[k]});initState();cur=null;return{ok:1}}
function resetMe(){var keep={};PREFK.concat(['prem','lg','freeDay']).forEach(function(k){if(S[k]!==undefined)keep[k]=S[k]});S=defState();Object.keys(keep).forEach(function(k){S[k]=keep[k]});initState();cur=null;save();return{ok:1}}
function spinRoll(){if(S.pending)return{err:'pending'};var fr=S.free>0;if(!fr&&S.yuz<COST)return{err:'poor'};
 if(fr)S.free--;else{S.yuz-=COST;led('Прокрутка')}
 var t=pickTier(),r={u:build(t.id),tier:t.id,base:baseFor(t.id),k:rollBonus(),odds:oddsOf(t),ts:Date.now()};
 S.pending=r;noteBest(r);S.spins++;S.xp+=XPT[t.id];if(S.luck>0)S.luck--;
 levelCheck();S.pity=0;if(S.spins%150==0)S.pity=50;else if(S.spins%50==0)S.pity=2;if(S.pity)toast('Гарант! Следующая прокрутка: удача ×'+S.pity);
 S.hist.unshift(r);if(S.hist.length>50)S.hist.pop();if(ti(r.tier)>=2){S.rare.unshift(r);if(S.rare.length>100)S.rare.pop()}
 tq('spin10');if(ti(r.tier)>=2)tq('rare1');
 if(Math.random()<.002){var tf=r3(.01+Math.random()*.04);S.ton=r3((S.ton||0)+tf);led('Находка TON');toast('Находка! +'+tonF(tf)+' TON')}
 save();return{r:r}}
function autoResolve(){var r=S.pending;if(!r)return{err:'none'};var a=autoAction(r);if(a=='ask')return{err:'ask'};if(a=='keep'&&collFull())a='sell';
 if(a=='sell'){var g=worth(r);S.yuz+=g;led('Авто-продажа @'+r.u);logAuto(r,g,'sell');S.autoN=(S.autoN||0)+1;S.autoSum=(S.autoSum||0)+g;tq('sell5');S.pending=null;cur=null;save();autoToast('Авто-продажа @'+r.u+' · +'+money(g));paintHome(1)}
 else{logAuto(r,0,'keep');S.autoKept=(S.autoKept||0)+1;keepPending();autoToast('Авто-сохранение @'+r.u)}
 return{ok:1,a:a}}
function claimChest(){tqE();if(!allClaimed()||S.tq.c.chest)return{err:'no'};var cj=chestInfo();S.yuz+=cj.rew;if(cj.n>=7){S.ton=r3((S.ton||0)+.01)}
 S.streak=cj.n;S.lastChest=dk(new Date());S.tq.c.chest=1;led('Бонус дня');save();hap({type:'notification',notification_type:'success'});toast('Бонус дня +'+money(cj.rew));draw();return{ok:1}}
function buyLuck(){if(S.yuz<LUCK_COST){toast('Не хватает баланса');return{err:'poor'}}S.yuz-=LUCK_COST;S.luck=(S.luck||0)+10;led('Удача ×1,5');save();toast('Удача на 10 прокруток');draw();return{ok:1}}
function exchangeTon(t){t=r3(+t);if(!(t>=.001)||t>1000)return{err:'arg'};var cst=Math.ceil(t*RATE*1.1);if(S.yuz<cst){toast('Не хватает звёзд');return{err:'poor'}}
 S.yuz-=cst;S.ton=r3((S.ton||0)+t);led('Обмен ⭐ → TON');save();hap({type:'notification',notification_type:'success'});toast('+'+tonF(t)+' TON');draw();return{ok:1}}
function wheelRoll(){wheelSync();if(S.wt<=0)return{err:'no'};var tot=WHEEL.reduce(function(a,b){return a+b.w},0),r=Math.random()*tot,k=0;
 for(var i=0;i<WHEEL.length;i++){r-=WHEEL[i].w;if(r<=0){k=i;break}}
 if(S.wt>=wcap())S.wl=Date.now();S.wt--;
 var pr=WHEEL[k],st=360/WHEEL.length,prev=S.wrot||0;S.wheelAt=Date.now();
 if(pr.t=='star')S.yuz+=pr.v;else if(pr.t=='luck')S.luck=(S.luck||0)+pr.v;else if(pr.t=='free')S.free=(S.free||0)+pr.v;else if(pr.t=='ton')S.ton=r3((S.ton||0)+pr.v);
 led('Колесо фортуны');tq('wheel');
 var delta=(((-k*st-prev)%360)+360)%360+360*5,tgt=prev+delta+(Math.random()*st*.6-st*.3);S.wrot=((tgt%360)+360)%360;save();
 return{k:k,tgt:tgt,prize:prizeText(pr)}}
function tickNow(){auTick();return{ok:1}}
function takeForSend(kind,id){var rec=null;
 if(kind=='gift'){rec=(S.gf||[]).filter(function(x){return x.n==id})[0];if(!rec)return null;S.gf=S.gf.filter(function(x){return x!==rec});return rec}
 if(kind=='nick'){rec=S.coll.filter(function(x){return x.u==id})[0];if(!rec)return null;S.coll=S.coll.filter(function(x){return x!==rec})}
 return rec}
function sendDone(kind,rec,to){var gi=kind=='gift'?gInfo(rec.g):null;toast((gi?'Подарок '+gi.name:'Ник @'+rec.u)+' отправлен @'+to+'. Ждём, пока друг примет его в боте')}
function inboxReceive(items){items.forEach(function(it){var p=it.p;
 if(it.k=='nick'){S.coll.unshift(p);noteBest(p);toast(p.note||('Подарок от @'+it.from+': ник @'+p.u));delete p.note}
  else if(it.k=='gift'){S.gf=S.gf||[];S.gf.unshift({g:p.g,n:p.n,ts:p.ts||Date.now()});var gi=gInfo(p.g);toast(p.note||('Подарок от @'+it.from+(gi?': '+gi.name:'')))}
  else if(it.k=='shop'){shopGrant(p.id)}
  else if(it.k=='cash'){var a=Math.round(+p.amount)||0;if(a>0&&a<1e10){if(p.cc=='ton')S.ton=r3((S.ton||0)+a/1000);else S.yuz+=a;led(p.note||'Сделка с игроком');toast(p.note||('+'+(p.cc=='ton'?tonF(a/1000)+' TON':money(a))))}}})}

// Деньги и продажа: звёзды, TON, продажа ников
function money(n){return fmt(Math.round(n))+' ⭐'}
function cash(v,c){return c=='ton'?tonF(v)+' TON':money(v)}
function fS(n){return abbr(n)}
function fT(n){var s=tonF(Math.max(0,r3(n))),i=s.indexOf(',');return i<0?s:s.slice(0,i)+'<span class="dec">'+s.slice(i)+'</span>'}
function balHtml(){return SI(16)+' '+fS(S.yuz)+((S.ton||0)>0?' &nbsp; '+TI(16)+' '+tonF(S.ton):'')}
function collFull(){return S.coll.length>=COLL_MAX}
function keepPending(){var pk=S.pending;if(!pk)return;if(collFull()){toast('Коллекция заполнена: '+COLL_MAX+'/'+COLL_MAX+'. Продай или скрафти лишние ники');return{err:'full'}}if(!S.coll.some(function(x){return x.u==pk.u}))S.coll.unshift(pk);tq('keep3');S.pending=null;cur=null;save();paintHome(1)}
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
var TAGS=['короткий','имя','слово','зеркало','красивые цифры','ровные цифры','одна буква','повтор буквы','ритм','год','топ-слово'];
function keepTags(){return S.autoTags||TAGS}
function autoRules(){if(S.arules)return S.arules;var m=S.autoMax||0;return TIERS.map(function(t,i){return i<=m?'sell':'ask'})}
function autoAction(r){if(!S.auto)return 'ask';var a=autoRules()[ti(r.tier)]||'ask';if(a!='sell')return a;
 var tg=mult(r.u).tags,kt=keepTags();for(var i=0;i<tg.length;i++)if(kt.indexOf(tg[i])>=0)return S.autoTagAct||'ask';
 if(S.autoCap&&worth(r)>=S.autoCap)return S.autoCapAct||'ask';return 'sell'}
function willAuto(r){return autoAction(r)!='ask'}
function autoToast(m){if(S.autoNotify)toast(m)}
function logAuto(r,g,a){S.autoLog=S.autoLog||[];S.autoLog.unshift({u:r.u,tier:r.tier,g:g,a:a,t:Date.now()});if(S.autoLog.length>30)S.autoLog.pop()}
function autoHandle(r){var a=autoAction(r);if(a=='ask')return;
 setTimeout(function(){var p=S.pending;if(!p||p.u!=r.u||p.ts!=r.ts||REVL)return;autoResolve()},1800)}
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
function prizeText(p){return p.t=='star'?money(p.v):p.t=='luck'?'удача ×1,5 на '+p.v+' прокруток':p.t=='free'?'бесплатная прокрутка':tonF(p.v)+' TON'}
function prizeChance(p){var tot=WHEEL.reduce(function(a,b){return a+b.w},0),v=p.w/tot*100;return (v<10?String(Math.round(v*10)/10):String(Math.round(v))).replace('.',',')+'%'}
var WG={luck:'<circle cx="9" cy="9" r="3.4"/><circle cx="15" cy="9" r="3.4"/><circle cx="9" cy="14.6" r="3.4"/><circle cx="15" cy="14.6" r="3.4"/>',
 free:'<path d="M3 8h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z"/>',
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
// Настоящая оплата Telegram Stars: счёт создаёт сервер, покупку выдаёт тоже сервер после подтверждения платежа (через inbox)
function shopItem(id){var p=PACKS.filter(function(x){return x.id==id})[0];
 if(p)return{id:id,title:fmt(p.stars)+' звёзд',desc:'Пакет игровых звёзд: '+fmt(p.stars)+' ⭐',price:p.price};
 if(id=='prem')return{id:id,title:'Premium на '+PREM_DAYS+' дней',desc:'Колесо каждые 3 часа, комиссия маркета 3%, +1 бесплатная прокрутка в день',price:PREM_PRICE};
 if(id=='wr')return{id:id,title:'Попытка колеса фортуны',desc:'Дополнительная попытка колеса, копится и не сгорает',price:WR_PRICE};
 return null}
function shopGrant(id){var it=shopItem(id);if(!it)return;var p=PACKS.filter(function(x){return x.id==id})[0];S.spent=(S.spent||0)+it.price;
 if(p){S.yuz+=p.stars;led('Пакет '+abbr(p.stars)+' ⭐');toast('🎁 Покупка: +'+money(p.stars))}
 else if(id=='prem'){S.prem=Math.max(Date.now(),S.prem||0)+PREM_DAYS*864e5;toast('✨ Premium активен ещё '+premDays()+' дн.')}
 else if(id=='wr'){wheelSync();S.wt=(S.wt||0)+1;toast('🎡 Попытка колеса добавлена: '+S.wt)}
 save()}
var PAYB=0;
function payOn(){var w=window.Telegram&&window.Telegram.WebApp;return !!(typeof cloudOn=='function'&&cloudOn()&&w&&typeof w.openInvoice=='function')}
function payPoll(s0,n){if(!SRV())return;srvRun('tickNow',[]).then(function(){if((S.spent||0)>s0){hap({type:'notification',notification_type:'success'});if(scr=='home')paintHome();else draw();return}
 if(n<8)setTimeout(function(){payPoll(s0,n+1)},1500);else toast('Платёж обрабатывается, покупка придёт в течение минуты')})}
function payStars(id){if(!payOn()){toast('Оплата Telegram Stars работает внутри Telegram');return}if(PAYB)return;PAYB=1;
 cpost('/api/invoice',{initData:cInit(),id:id}).then(function(r){
  if(!r||!r.ok||!r.link){PAYB=0;toast(r&&r.err=='maint'?'Сейчас технический перерыв':'Не удалось создать счёт, попробуй позже');return}
  var s0=S.spent||0;window.Telegram.WebApp.openInvoice(r.link,function(st){PAYB=0;if(st=='paid'){toast('Платёж прошёл, зачисляем…');payPoll(s0,0)}else if(st=='failed')toast('Оплата не прошла')})
 }).catch(function(){PAYB=0;toast('Нет связи с сервером')})}
function buyPack(id){payStars(id)}
function buyPrem(){payStars('prem')}
function buyWheelReset(){payStars('wr')}
function shopHtml(){var pr=isPrem();
 return '<div class="premc"><div class="premt"><span class="premi">'+IC.crown+'</span><div><b>Premium</b><small>'+(pr?'Активен · осталось '+premDays()+' дн.':PREM_DAYS+' дней')+'</small></div></div>'+
  '<ul class="premp"><li>Колесо фортуны каждые 3 часа вместо 5</li><li>Комиссия маркета 3% вместо 5%</li><li>+1 бесплатная прокрутка каждый день</li><li>Значок Premium в профиле</li></ul>'+
  '<button class="premb" data-act="buyprem">'+(payOn()?(pr?'Продлить':'Подключить')+' · '+PREM_PRICE+' ⭐ Stars':'Только в Telegram')+'</button></div>'+
  '<div class="sec">Пакеты звёзд</div><div class="grp">'+PACKS.map(function(p){return '<button class="go" data-bp="'+p.id+'"><span class="ic" style="background:#ffb020">'+SI(22)+'</span><div>'+fmt(p.stars)+' ⭐'+(p.tag?' <span class="badge sm" style="background:#34c759">'+p.tag+'</span>':'')+'</div><small style="margin-left:auto;color:var(--blue)">'+p.price+' Stars</small></button>'}).join('')+'</div>'+
  '<div class="sec">Ускорители</div><div class="grp"><button class="go" data-act="luck"><span class="ic" style="background:#34c759">'+ei('🍀')+'</span><div>Удача ×1,5<br><small style="margin:0">на 10 прокруток</small></div><small style="margin-left:auto;color:var(--blue)">'+money(LUCK_COST)+'</small></button>'+
  '<button class="go" data-act="buywr"><span class="ic" style="background:#ff9f0a">'+ei('🎡')+'</span><div>Ещё одна попытка колеса<br><small style="margin:0">копится, не сгорает</small></div><small style="margin-left:auto;color:var(--blue)">'+WR_PRICE+' Stars</small></button></div>'+
  '<div class="sec">Скоро</div><div class="grp"><div class="go"><span class="ic" style="background:#a259f7">'+ei('🏆')+'</span><div>Battle Pass<br><small style="margin:0">награды за прокрутки</small></div><small style="margin-left:auto">скоро</small></div><div class="go"><span class="ic" style="background:#ff5d8f">'+ei('🎨')+'</span><div>Рамки и темы профиля</div><small style="margin-left:auto">скоро</small></div></div>'+
  '<div class="foot">Оплата через Telegram Stars. Покупка зачисляется сразу после платежа. Вопросы по оплате: команда /paysupport в боте.</div>'}

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
function admTake(s){var p=String(s).split(':'),v=parseFloat(p[1]);if(!ADM||!(v>0)||v>1e12)return{err:'forbidden'};
 if(p[0]=='ton')S.ton=Math.max(0,r3((S.ton||0)-v));else S.yuz=Math.max(0,S.yuz-Math.round(v));led('Админ: списание');save();return{ok:1}}
function admFree(n){n=Math.round(+n);if(!ADM||!(n>0)||n>10000)return{err:'forbidden'};S.free=(S.free||0)+n;save();return{ok:1}}
function admNick(p){p=p||{};if(!ADM)return{err:'forbidden'};var t=tier(p.tier),u=String(p.u||'').toLowerCase();if(!t||!/^[a-z0-9_]{1,32}$/.test(u))return{err:'arg'};if(S.coll.some(function(x){return x.u==u}))return{err:'dup'};
 var k=+p.k>=1&&+p.k<=100?+p.k:rollBonus(),r={u:u,tier:t.id,base:baseFor(t.id),k:k,odds:oddsOf(t),ts:Date.now()};S.coll.unshift(r);noteBest(r);save();return{ok:1,r:r}}
function admCustom(c){var i=document.getElementById('admn');admGrant(c+':'+(i?i.value:'0'))}
function adminHtml(){if(!ADM)return '<div class="empty">Нет доступа</div>';
 var gv=function(l,v){return '<button class="act" data-adm="'+v+'">'+l+'</button>'};
 return '<div class="stats3" style="grid-template-columns:1fr 1fr;margin-top:4px"><div class="stat"><small>Звёзды</small><b>'+money(S.yuz)+'</b></div><div class="stat"><small>TON</small><b>'+tonF(S.ton||0)+'</b></div></div>'+
  '<div class="sec">Выдача звёзд</div><div class="row2">'+gv('+1 000','star:1000')+gv('+10 000','star:10000')+gv('+100 000','star:100000')+'</div>'+
  '<div class="sec">Выдача TON</div><div class="row2">'+gv('+0,1','ton:0.1')+gv('+0,5','ton:0.5')+gv('+5','ton:5')+'</div>'+
  '<div class="sec">Своя сумма</div><input id="admn" class="inp" type="number" inputmode="decimal" placeholder="Сумма"><div class="row2" style="margin-top:10px"><button class="act" data-act="admgs">Выдать ⭐</button><button class="act" data-act="admgt">Выдать TON</button></div>'+
  maintHtml()+'<div class="sec">Диагностика Telegram</div><div class="grp">'+[['Запуск из Telegram',TG?'да':'нет'],['ID пользователя',TG&&TG.id?TG.id:'не передан'],['Имя пользователя',TG&&TG.username?'@'+esc(TG.username):'не передано'],['Фото профиля',TG&&TG.photo_url?'есть':'не передано'],['Облако',cloudStatus()]].map(function(x){return '<div class="go"><span>'+x[0]+'</span><small>'+x[1]+'</small></div>'}).join('')+'</div>'+
  '<div class="sec">Опасная зона</div><div class="grp"><button class="go" data-act="reset" style="color:#ff3b30">Сбросить мой прогресс</button></div>'+
  '<button class="pbtn gray" style="width:100%;margin-top:18px" data-act="admout">Выйти из админ-меню</button>'}

// Рефералы: приглашай друзей по ссылке и получай награды (подсчёт ведёт сервер)
var TITLES={amb:'Амбассадор',leg:'Легенда Юзерка'};
var REFM=[{n:1,star:1500,free:5,t:'1 500 ⭐ и 5 бесплатных прокруток'},{n:3,nick:'epic',t:'эпический ник'},{n:5,star:5000,free:10,t:'5 000 ⭐ и 10 прокруток'},{n:10,nick:'legend',t:'легендарный ник'},{n:25,title:'amb',nick:'mythic',star:15000,t:'титул «Амбассадор», мифический ник и 15 000 ⭐'},{n:50,star:40000,free:50,t:'40 000 ⭐ и 50 прокруток'},{n:100,title:'leg',nick:'divine',star:100000,t:'титул «Легенда Юзерка», божественный ник и 100 000 ⭐'}];
var REF_WELCOME=500,REF_FREE=3,REF_NEED=3,RF=null,RBOT='';
function titleChip(){var T=S.titles||[];if(!T.length)return '';var k=T.indexOf('leg')>=0?'leg':T[T.length-1];return ' <span class="ttl '+k+'">'+TITLES[k]+'</span>'}
function refLink(){return RBOT&&TG&&TG.id?'https://t.me/'+RBOT+'?start=ref_'+TG.id:''}
function refsInfo(){if(RBOT||!cloudOn())return;cpost('/api/info',{}).then(function(r){if(r&&r.ok&&r.bot){RBOT=r.bot;if(scr=='friends')draw()}}).catch(function(){})}
function refsLoad(){if(!cloudOn()||!CL.loaded)return;refsInfo();
 cpost('/api/refs',{initData:cInit()}).then(function(r){if(!r||!r.ok)return;RF=r;if(r.patch){srvApply(r);(r.msgs||[]).forEach(function(m){toast(m)});if(scr=='home')paintHome()}else refsApply(r);if(scr=='friends')draw()}).catch(function(){})}
function refsApply(r){var act=r.act||0,paid=S.refPaid||0,ch=false,msgs=[];
 if(r.inviter&&!S.refWelcome){S.refWelcome=1;S.yuz+=REF_WELCOME;S.free=(S.free||0)+REF_FREE;ch=true;msgs.push('Бонус приглашённого: +'+money(REF_WELCOME)+' и '+REF_FREE+' прокрутки')}
 if(act>paid){REFM.forEach(function(m){if(paid<m.n&&act>=m.n){ch=true;if(m.star)S.yuz+=m.star;if(m.free)S.free=(S.free||0)+m.free;
   if(m.nick){var tt=m.nick,nk={u:build(tt),tier:tt,base:baseFor(tt),k:rollBonus(),ts:Date.now()};nk.odds=oddsOf(tier(tt));S.coll.unshift(nk);noteBest(nk);msgs.push('Реферальный ник: @'+nk.u)}
   if(m.title){S.titles=S.titles||[];if(S.titles.indexOf(m.title)<0)S.titles.push(m.title);msgs.push('Титул: '+TITLES[m.title])}
   msgs.push(m.n+' друзей: '+m.t)}});S.refPaid=act}
 if(ch){led('Реферальная программа');save();msgs.forEach(function(x){toast(x)});if(scr=='home')paintHome()}}
function refCopy(){var l=refLink();if(!l)return toast('Ссылка ещё загружается');
 function fb(){var a=document.createElement('textarea');a.value=l;document.body.appendChild(a);a.select();try{document.execCommand('copy');toast('Ссылка скопирована')}catch(e){toast(l)}document.body.removeChild(a)}
 try{navigator.clipboard.writeText(l).then(function(){toast('Ссылка скопирована')},fb)}catch(e){fb()}}
function refShare(){var l=refLink();if(!l)return toast('Ссылка ещё загружается');
 var u='https://t.me/share/url?url='+encodeURIComponent(l)+'&text='+encodeURIComponent('Залетай в «Юзерок: Рулетка»: крути рулетку, находи редкие юзернеймы и собирай коллекцию. Держи бонус по моей ссылке 👇'),w=window.Telegram&&window.Telegram.WebApp;
 try{if(w&&w.openTelegramLink)w.openTelegramLink(u);else window.open(u,'_blank')}catch(e){window.open(u,'_blank')}}
function friendsHtml(){if(!cloudOn())return emp('users','Приглашения работают внутри Telegram',50);
 var d=RF||{},act=d.act||0,tot=d.total||0,l=refLink();
 return '<div class="refc"><div class="refh">Приглашай друзей</div><div class="refp">Друг считается активным, когда зарегистрируется и сделает <b>'+REF_NEED+' прокрутки</b>. За каждый рубеж ты получаешь награду, а другу в подарок <b>+'+money(REF_WELCOME)+'</b> и <b>'+REF_FREE+' прокрутки</b>.</div></div>'+
  (l?'<div class="reflink">'+esc(l)+'</div><div class="row2" style="margin-top:10px"><button class="act" data-act="refcopy">Копировать</button><button class="pbtn" style="flex:1" data-act="refshare">Поделиться</button></div>':'<div class="empty" style="padding:18px 0">Загружаем ссылку…</div>')+
  '<div class="stats3" style="grid-template-columns:1fr 1fr;margin-top:14px"><div class="stat"><b>'+tot+'</b><small>приглашено</small></div><div class="stat"><b>'+act+'</b><small>активных</small></div></div>'+
  '<div class="sec">Награды за активных друзей</div><div class="grp">'+REFM.map(function(m){var ok=act>=m.n;return '<div class="go"><span style="width:12px;height:12px;border-radius:50%;background:'+(ok?'#34c759':'var(--sep)')+';flex:none"></span><span>'+m.n+' друзей</span><small style="color:'+(ok?'#34c759':'var(--sub)')+'">'+(ok?'✓ ':'')+m.t+'</small></div>'}).join('')+'</div>'+
  ((d.list||[]).length?'<div class="sec">Твои друзья</div><div class="grp">'+d.list.map(function(f){var a=f.spins>=REF_NEED;return '<div class="go"><span>'+esc(f.name||'Игрок')+'</span><small style="color:'+(a?'#34c759':'var(--sub)')+'">'+(a?'активен ✓':'прокрутки '+Math.min(f.spins,REF_NEED)+'/'+REF_NEED)+'</small></div>'}).join('')+'</div>':'')+
  '<div class="foot">Ссылка работает для тех, кто ещё не играл. Награды за рубежи выдаются один раз.</div>'}

// Маркет: только реальные игроки (см. p2p.js). Здесь остались общие таймеры и переезд старых симулированных лотов.
var SRCI='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l5 5"/></svg>';
function marketMigrate(){if(!S.lots&&!S.offers)return false;
 (S.lots||[]).forEach(function(l){if(l.mine){S.coll.unshift({u:l.u,tier:l.tier,base:l.base,k:l.k,odds:oddsOf(tier(l.tier))});if(l.bidder&&l.cc=='star')S.yuz+=0}
  else if(l.bidder=='me'){if(l.cc=='ton')S.ton=r3((S.ton||0)+l.price);else S.yuz+=l.price}});
 delete S.lots;delete S.offers;delete S.mf;delete S.mq;save();return true}
function auTick(){var ch=marketMigrate();
 if(isPrem()&&S.freeDay!==dk(new Date())){S.freeDay=dk(new Date());S.free=(S.free||0)+1;toast('✨ Premium: бесплатная прокрутка дня');ch=true}
 if(ch){save();if(scr=='home'&&!busy)paintHome()}
 tickTimers()}
function tickTimers(){var now=Date.now();
 if(scr=='wheel'&&!WBUSY){var rdy=wheelReady()+':'+S.wt;if(WA_!==rdy){WA_=rdy;draw()}else{var wt=document.getElementById('wtimer');if(wt)wt.textContent=wheelLeft()}}
 if(scr=='market'||scr=='gifts'){var q=document.querySelectorAll('[data-end]');for(var i=0;i<q.length;i++){var lf=q[i].getAttribute('data-end')-now;q[i].textContent=tleft(lf);q[i].classList.toggle('hot',lf<30000)}}}

// Ядро генератора: сборка ника и прокрутка
function build(id){var r=Math.random();switch(id){
 case 'common':
  if(r<.22)return rnd(NAMES)+'_'+rnd(SURN)+'_'+ri(10,99);
  if(r<.42)return pron(ri(6,9))+ri(100,9999);
  if(r<.62)return rnd(SHORTN)+'_'+rnd(WORDS)+ri(1,999);
  if(r<.82)return rnd(ADJ)+'_'+rnd(NOUN)+'_'+ri(10,9999);
  return rnd(SURN)+rnd(SHORTN)+ri(1,99)+'_'+pron(ri(2,3));
 case 'norm':
  if(r<.3)return pron(ri(8,12));
  if(r<.55)return rnd(NAMES)+rnd(WORDS);
  if(r<.8)return rnd(ADJ)+rnd(NOUN);
  return rnd(SHORTN)+'_'+rnd(SURN);
 case 'rare':
  if(r<.7)return rnd(NAMES);
  if(r<.85)return pron(ri(6,7));
  return rnd(ADJ)+rnd(SHORTN);
 case 'epic':
  if(r<.62)return rnd(SHORTN);
  if(r<.88)return pron(ri(4,5));
  return rnd(WORDS.filter(function(w){return w.length>=5}));
 case 'legend':
  if(r<.78)return rnd(FRAG_L.concat(WORDS.filter(function(w){return w.length<=4})));
  return pron(3);
 case 'mythic':
  if(r<.3)return 'abcdefghijklmnopqrstuvwxyz'.charAt(ri(0,25));
  if(r<.5)return pron(2);
  return rnd(FRAG_M);
 default:return rnd(DIVINE)}}
// Бонус прокрутки: после ника крутится «барабан» множителей, цена ника умножается на выпавший
var REVL=false,SKIP=false,STm=0,RTm=0,SPF=null;
function skipNow(){if(SKIP)return;SKIP=true;if(STm){clearTimeout(STm);STm=0;if(SPF)SPF()}else if(REVL&&RVT){RVT()}}
var RVT=null;
function countPrice(from,to,ms,cb){var el=$('hprice'),t0=Date.now();if(!el){cb();return}
 (function f(){var p=SKIP?1:Math.min(1,(Date.now()-t0)/ms),e=1-Math.pow(1-p,3);el.textContent='+'+money(from+(to-from)*e);if(p<1)requestAnimationFrame(f);else cb()})()}
// Множитель показывается сразу готовым (без «барабана»), затем цена плавно дорастает до итоговой
function reveal(r,cb){var hb=$('hbonus');if(!hb||S.anim===false){cb();return}
 var k=bonusOf(r),from=worthNoBonus(r),to=worth(r),big=mxTotal(r);
 hb.className='mxp';hb.innerHTML=SKIP?mxHtml(r,false):mxHtml(r,true);
 if(k>=5||big>=10)hap({type:'notification',notification_type:'success'});
 countPrice(from,to,SKIP?260:(big>1?900:150),function(){var d=SKIP?(big>1?650:120):(big>1?600:250);
  RVT=function(){clearTimeout(RTm);RTm=0;RVT=null;cb()};RTm=setTimeout(function(){RTm=0;RVT=null;cb()},d)})}
function spin(){if(busy)return;
 if(S.pending)return toast('Сначала реши: продать или оставить');
 var fr=S.free>0;if(!fr&&S.yuz<COST)return toast('Не хватает звёзд: прокрутка стоит '+money(COST));
 SKIP=false;busy=true;paintHome();var P=SRV()?srvRun('spinRoll',[],{raw:true}):null;
 var D=S.anim===false?[70]:[55,60,68,80,96,116,140,170,205,245],n=0;
 function done(o){var rr=o&&o.res;var he=$('huname');if(he)he.style.opacity='1';
  if(!rr||rr.err||!rr.r){busy=false;paintHome();if(o&&o.err)toast('Нет связи с сервером');return}
  var r=rr.r;SKIP=false;cur=r;REVL=S.anim!==false;paintHome(1);buzzEnd(r);(o.msgs||[]).forEach(function(m){toast(m)});
  reveal(r,function(){REVL=false;busy=false;paintHome();autoHandle(r)})}
 function finish(){STm=0;SPF=null;if(P)P.then(done);else done({res:spinRoll(),msgs:[]})}
 SPF=finish;
 function step(){hap({type:'selection_change'});var he=$('huname');if(he){he.textContent='@'+pron(ri(5,9));he.style.opacity='.45';$('hrar').textContent='…';$('hrar').style.color='var(--sub)'}
  if(SKIP||++n>=D.length)finish();else STm=setTimeout(step,D[n])}
 STm=setTimeout(step,D[0])}
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

// Подарки за TON (картинки из репозитория nft-grade). Хранятся в S.gf = [{g, n, ts}], продаются игрокам на маркете.
var GF_MAX=60,GF_SELL=.7,GIFTS_BUY=false; // покупка подарков закрыта: раздел в разработке (админ может покупать для проверки)
var GIFTS=[['candy-cane','Candy Cane',.05],['jelly-bunny','Jelly Bunny',.06],['fresh-socks','Fresh Socks',.08],['ginger-cookie','Ginger Cookie',.1],['astral-shard','Astral Shard',.15],['love-potion','Love Potion',.2],['chill-flame','Chill Flame',.25],['spy-agaric','Spy Agaric',.3],['scared-cat','Scared Cat',.35],['durovs-cap','Durov’s Cap',.6],['witch-hat','Witch Hat',.8],['ion-gem','Ion Gem',1],['hex-pot','Hex Pot',1.2],['loot-bag','Loot Bag',2],['mini-oscar','Mini Oscar',3],['plush-pepe','Plush Pepe',5],['heroic-helmet','Heroic Helmet',8]];
function gInfo(id){for(var i=0;i<GIFTS.length;i++)if(GIFTS[i][0]==id)return{id:id,name:GIFTS[i][1],ton:GIFTS[i][2],ix:i};return null}
function gColor(ix){return ix>=14?'#ffd54a':ix>=9?'#a78bfa':ix>=4?'#2aabee':'#7f91a4'}
function gfFull(){return (S.gf||[]).length>=GF_MAX}
function gfNew(id){return{g:id,n:Date.now().toString(36)+Math.random().toString(36).slice(2,7),ts:Date.now()}}
function buyGift(id){if(!GIFTS_BUY&&!ADM){toast('Покупка подарков временно недоступна');return{err:'closed'}}var g=gInfo(id);if(!g)return{err:'item'};if(gfFull()){toast('Слишком много подарков: '+GF_MAX+'/'+GF_MAX);return{err:'full'}}
 if((S.ton||0)<g.ton){toast('Не хватает TON');return{err:'poor'}}
 S.ton=r3((S.ton||0)-g.ton);S.gf=S.gf||[];S.gf.unshift(gfNew(id));led('Подарок '+g.name);save();toast('🎁 '+g.name+' куплен');return{ok:1}}
function sellGift(n){var it=(S.gf||[]).filter(function(x){return x.n==n})[0];if(!it)return{err:'item'};var g=gInfo(it.g);if(!g)return{err:'item'};
 var v=r3(g.ton*GF_SELL);S.gf=S.gf.filter(function(x){return x!==it});S.ton=r3((S.ton||0)+v);led('Продан подарок '+g.name);save();toast('Продано: '+g.name+' · +'+tonF(v)+' TON');return{ok:1,v:v}}

// Ежедневный вход (серия 7 дней) и награда за новый уровень
var LOGIN_R=[{s:200},{s:300,f:1},{s:500},{s:700,f:2},{s:1000},{s:1500,f:3},{s:3000,f:5,l:20}];
function dayNum(tz){var o=Math.max(-840,Math.min(840,Math.round(+tz)||0));return Math.floor((Date.now()-o*60000)/86400000)}
function loginInfo(tz){var lg=S.lg||{d:-9,n:0,at:0},t=dayNum(tz);
 return{done:lg.d==t,n:lg.d==t?lg.n:(lg.d==t-1?lg.n:0),next:(lg.d==t?lg.n:(lg.d==t-1?lg.n:0))+(lg.d==t?0:1),lost:lg.d<t-1&&lg.n>0}}
function claimLogin(tz){var t=dayNum(tz),lg=S.lg;
 if(lg&&(lg.d>=t||Date.now()-(lg.at||0)<20*3600e3))return{err:'done'};
 var n=lg&&lg.d==t-1?lg.n+1:1,r=LOGIN_R[(n-1)%LOGIN_R.length];
 S.yuz+=r.s;if(r.f)S.free=(S.free||0)+r.f;if(r.l)S.luck=(S.luck||0)+r.l;
 S.lg={d:t,n:n,at:Date.now(),t:((lg&&lg.t)||0)+1};led('Ежедневный вход');save();
 hap({type:'notification',notification_type:'success'});toast('День '+n+': +'+money(r.s)+(r.f?' и '+r.f+' прокр.':'')+(r.l?' · удача на '+r.l:''));draw();return{ok:1,n:n}}
function loginRewardText(r){return money(r.s)+(r.f?' · '+r.f+' прокр.':'')+(r.l?' · удача ×1,5':'')}
// Окно ежедневной награды: появляется само при входе в игру, пока награда за сегодня не получена
var DLYS=false;
function dailyBody(){var i=loginInfo(new Date().getTimezoneOffset()),cyc=LOGIN_R.length,cur=(i.next-1)%cyc,day=cur+1;
 var cells=LOGIN_R.map(function(r,k){var got=k<cur,now=k==cur;
  return '<div class="dc'+(got?' got':'')+(now?' now':'')+(k==cyc-1?' last':'')+'"><small>День '+(k+1)+'</small><b>'+(got?'✓':SI(18))+'</b><span>'+fmt(r.s)+'</span>'+(r.f?'<em>+'+r.f+' прокр.</em>':'')+(r.l?'<em>удача ×1,5</em>':'')+'</div>'}).join('');
 return '<div class="dhead"><div class="dico">'+IC.medal+'</div><h3>Ежедневная награда</h3><p>'+(i.lost?'Серия прервалась, начинаем заново.':i.n>0?'Серия: '+i.n+' '+(i.n==1?'день':i.n<5?'дня':'дней')+' подряд. Не пропускай!':'Заходи каждый день: награды растут до 7-го дня.')+'</p></div>'+
  '<div class="dgrid">'+cells+'</div><button class="pbtn" style="width:100%;margin-top:16px" data-dl="go">Забрать · '+loginRewardText(LOGIN_R[cur])+'</button><button class="plainbtn" data-dl="x">Позже</button>'}
function dailyPop(){if(document.querySelector('.ov.dly'))return;var o=document.createElement('div');o.className='ov dly';
 o.innerHTML='<div class="sh dsh">'+dailyBody()+'</div>';
 o.addEventListener('click',function(e){var b=e.target.closest('[data-dl]');if(!b&&e.target!==o)return;
  if(b&&b.getAttribute('data-dl')=='go'){b.disabled=true;Promise.resolve(claimLogin(new Date().getTimezoneOffset())).then(function(){o.remove()},function(){o.remove()})}else o.remove()});
 document.body.appendChild(o)}
function dailyAuto(){if(DLYS)return;DLYS=true;if(loginInfo(new Date().getTimezoneOffset()).done)return;setTimeout(dailyPop,500)}
function levelCheck(){var L=level();if(S.lvR===undefined){S.lvR=L;return}
 while(S.lvR<L&&S.lvR<500){S.lvR++;var st=50*S.lvR+50,fr=S.lvR%5==0?5:0;S.yuz+=st;if(fr)S.free=(S.free||0)+fr;led('Уровень '+S.lvR);toast('Уровень '+S.lvR+'! +'+money(st)+(fr?' и '+fr+' прокруток':''))}}
// Сделки между игроками: деньги уходят в залог на сервере (p2pPay), возвращаются через p2pRefund или входящие «cash»
function p2pPay(a,slot,cc){a=Math.round(+a);if(!(a>0)||a>1e10)return{err:'arg'};if(slot=='gift'?gfFull():(slot&&collFull()))return{err:'full'};
 if(cc=='ton'){if((S.ton||0)<a/1000-1e-9)return{err:'poor'};S.ton=r3((S.ton||0)-a/1000)}else{if(S.yuz<a)return{err:'poor'};S.yuz-=a}led('Сделка с игроком');save();return{ok:1}}
function p2pRefund(a,cc){a=Math.round(+a);if(a>0&&a<1e10){if(cc=='ton')S.ton=r3((S.ton||0)+a/1000);else S.yuz+=a;led('Возврат по сделке');save()}return{ok:1}}

// Крафт: 3 ника одной редкости → шанс получить ник редкостью выше
var CRAFT_P=[.6,.55,.5,.45,.35,.25]; // шанс успеха для обычных…мифических; божественные не крафтятся
var CF={t:null,sel:[]};
function craftChance(i){return CRAFT_P[i]||0}
function craftRoll(us){
 if(!Array.isArray(us)||us.length!=3)return{err:'arg'};
 var u3=us.map(String);if(u3[0]==u3[1]||u3[0]==u3[2]||u3[1]==u3[2])return{err:'arg'};
 var items=u3.map(function(u){return S.coll.filter(function(x){return x.u==u})[0]});
 if(items.some(function(x){return !x}))return{err:'item'};
 if(items.some(function(x){return x.tier!=items[0].tier}))return{err:'tier'};
 var i0=ti(items[0].tier),p=craftChance(i0);if(!(p>0))return{err:'max'};
 var win=Math.random()<p,nt=TIERS[win?i0+1:i0];
 S.coll=S.coll.filter(function(x){return u3.indexOf(x.u)<0});
 var u,k=0;do{u=build(nt.id);k++}while(k<30&&(S.coll.some(function(x){return x.u==u})||(S.pending&&S.pending.u==u)));
 var r={u:u,tier:nt.id,base:baseFor(nt.id),k:rollBonus(),odds:oddsOf(nt),ts:Date.now()};
 S.coll.unshift(r);noteBest(r);S.xp+=XPT[nt.id];levelCheck();S.crafts=(S.crafts||0)+1;if(win)S.craftWins=(S.craftWins||0)+1;
 led('Крафт: '+u3.map(function(x){return '@'+x}).join(', ')+' → @'+u);save();
 return{ok:1,win:win,r:r,p:p,from:u3.map(function(x,i){return items[i]})}}
function craftTiers(){var c={};S.coll.forEach(function(x){c[ti(x.tier)]=(c[ti(x.tier)]||0)+1});return c}
function craftHtml(){var c=craftTiers(),can=TIERS.map(function(t,i){return c[i]>=3&&craftChance(i)>0?i:-1}).filter(function(i){return i>=0});
 if(!can.length)return emp('sparkle','Для крафта нужно 3 ника одной редкости<br>Оставляй ники в коллекции — лишние можно сплавить в более редкий',60);
 if(CF.t===null||can.indexOf(CF.t)<0){CF.t=can[0];CF.sel=[]}
 var i=CF.t,t=TIERS[i],nt=TIERS[i+1],p=Math.round(craftChance(i)*100);
 var L=S.coll.filter(function(x){return ti(x.tier)==i}).sort(function(a,b){return worth(a)-worth(b)}),sum=0;
 CF.sel=CF.sel.filter(function(u){return L.some(function(x){return x.u==u})});
 CF.sel.forEach(function(u){sum+=worth(L.filter(function(x){return x.u==u})[0])});
 var chips='<div class="fchips">'+TIERS.map(function(x,j){return c[j]>=3&&craftChance(j)>0?'<button class="fc rc'+(j==i?' on':'')+'" data-ct="'+j+'"><i class="rdt" style="background:'+x.color+'"></i>'+c[j]+'</button>':''}).join('')+'</div>';
 var info='<div class="crinfo"><div class="crt"><span style="color:'+t.color+'">'+t.name+'</span><i>→</i><span style="color:'+nt.color+'">'+nt.name+'</span></div><div class="crp"><b>'+p+'%</b><small>шанс успеха</small></div></div>'+
  '<div class="crnote">Нужно выбрать 3 ника. Не повезло — получишь один новый ник прежней редкости, два других сгорят.</div>';
 var rows='<div class="grp">'+L.map(function(c2){var m=mult(c2.u),on=CF.sel.indexOf(c2.u)>=0;
  return '<button class="go hrw'+(on?' sel':'')+'" data-cp="'+c2.u+'"><div class="hav" style="'+bdVars(t)+'"><span>'+esc(c2.u.charAt(0))+'</span></div><div class="hm"><b class="mono">@'+esc(c2.u)+'</b><small>'+(m.m>1?'×'+fm(m.m):'без множителей')+'</small></div><div class="hr"><b>'+money(worth(c2))+'</b><small>'+(on?'✓ выбран':'')+'</small></div></button>'}).join('')+'</div>';
 var n=CF.sel.length;
 return chips+info+rows+'<div class="crbar"><button class="pbtn" style="width:100%" data-act="craftgo"'+(n==3?'':' disabled')+'>'+(n==3?'Скрафтить · сгорит '+money(sum):'Выбрано '+n+' из 3')+'</button></div>'}
function craftResult(o){var r=o.r,t=tier(r.tier),ov=document.createElement('div');ov.className='ov';
 ov.innerHTML='<div class="sh" style="text-align:left"><div class="crres '+(o.win?'win':'lose')+'">'+(o.win?'Получилось!':'Не повезло')+'</div>'+nickHero(r,1)+
  '<div class="crnote" style="text-align:center">'+(o.win?'Новая редкость: '+t.name:'Шанс был '+Math.round(o.p*100)+'%. Взамен — ник той же редкости')+'</div><button class="pbtn" style="width:100%;margin-top:12px" data-nx="close">Отлично</button></div>';
 ov.addEventListener('click',function(e){if(e.target===ov||e.target.closest('[data-nx]'))ov.remove()});document.body.appendChild(ov);
 hap(o.win?{type:'notification',notification_type:'success'}:{type:'impact',impact_style:'medium'})}
function craftGo(){if(CF.sel.length!=3)return;var us=CF.sel.slice();CF.sel=[];
 Promise.resolve(craftRoll(us)).then(function(x){var o=x&&x.res?x.res:x;if(!o||o.err||!o.r){toast('Не получилось: выбери ники заново');draw();return}craftResult(o);draw()})}


toast=function(m){MSGS.push(String(m))};
var BOTN=BOTS.map(function(b){return b[0]});
function giftSend(kind,id,to){if(kind!='nick'&&kind!='gift')return{err:'item'};var rec=takeForSend(kind,id);if(!rec)return{err:'item'};sendDone(kind,rec,to);return{ok:1,rec:rec}}
function p2pTake(u,kind){kind=kind=='gift'?'gift':'nick';var rec=takeForSend(kind,String(u));return rec?{ok:1,rec:rec}:{err:'item'}}
function giftRefund(kind,rec){if(kind=='nick')S.coll.unshift(rec);else if(kind=='gift'){S.gf=S.gf||[];S.gf.unshift(rec)}return{ok:1}}
var ACT={keepPending:keepPending,sellPending:sellPending,sellOne:sellOne,sellBulk:sellBulk,claimTask:claimTask,claimChest:claimChest,buyLuck:buyLuck,exchangeTon:exchangeTon,buyGift:buyGift,sellGift:sellGift,autoResolve:autoResolve,admGrant:admGrant,admTake:admTake,admFree:admFree,admNick:admNick,tickNow:tickNow,resetAll:resetAll,resetMe:resetMe,craftRoll:craftRoll,claimLogin:claimLogin,spinRoll:spinRoll,wheelRoll:wheelRoll};
var INTERNAL={refsApply:refsApply,giftSend:giftSend,giftRefund:giftRefund,p2pTake:p2pTake,p2pPay:p2pPay,p2pRefund:p2pRefund};
function catchUp(){var now=Date.now(),last=S.tkAt||now,n=Math.min(120,Math.floor((now-last)/1000));S.tkAt=now;for(var i=0;i<n;i++)auTick();if(!n)auTick()}
return{
 PREFK:PREFK,
 setConfig:function(c){applyGameCfg(c)},
 cfgInfo:cfgInfo,
 poolWords:function(k){var a=poolRef(k);return a?a.slice():[]},
 stats:function(state){S=state;var col=0;(S.coll||[]).forEach(function(x){col+=worth(x)});return{lvl:level(),bal:Math.round(S.yuz+(S.ton||0)*RATE),col:col,spn:S.spins||0,rar:(S.rare||[]).length,bst:S.best?worth(S.best):0}},
 shopItem:function(id){return shopItem(id)},
 giftName:function(id){var g=gInfo(id);return g?g.name:null},
 allowed:function(fn){return Object.prototype.hasOwnProperty.call(ACT,fn)},
 fresh:function(){S=defState();initState();return S},
 run:function(state,fn,args,ctx){ctx=ctx||{};S=state;MSGS=[];ADM=!!ctx.adm;cur=null;initState();
  if(ctx.inbox&&ctx.inbox.length)inboxReceive(ctx.inbox);
  catchUp();var res=null;
  if(fn!=='__load'&&fn!=='__noop'){var f=ctx.internal?INTERNAL[fn]:ACT[fn];if(!f)throw new Error('bad fn');res=f.apply(null,args||[])}
  return{S:S,msgs:MSGS.slice(0,8),res:res}}
};
}
