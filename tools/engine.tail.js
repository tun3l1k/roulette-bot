

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
 allowed:function(fn){return Object.prototype.hasOwnProperty.call(ACT,fn)},
 fresh:function(){S=defState();initState();return S},
 run:function(state,fn,args,ctx){ctx=ctx||{};S=state;MSGS=[];ADM=!!ctx.adm;cur=null;initState();
  if(ctx.inbox&&ctx.inbox.length)inboxReceive(ctx.inbox);
  catchUp();var res=null;
  if(fn!=='__load'&&fn!=='__noop'){var f=ctx.internal?INTERNAL[fn]:ACT[fn];if(!f)throw new Error('bad fn');res=f.apply(null,args||[])}
  return{S:S,msgs:MSGS.slice(0,8),res:res}}
};
}
