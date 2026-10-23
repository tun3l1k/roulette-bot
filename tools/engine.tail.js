

toast=function(m){MSGS.push(String(m))};
var BOTN=BOTS.map(function(b){return b[0]});
function giftSend(kind,id,to){if(kind!='nick')return{err:'item'};var rec=takeForSend(kind,id);if(!rec)return{err:'item'};sendDone(kind,rec,to);return{ok:1,rec:rec}}
function giftRefund(kind,rec){if(kind=='nick')S.coll.unshift(rec);return{ok:1}}
var ACT={keepPending:keepPending,sellPending:sellPending,sellOne:sellOne,sellBulk:sellBulk,claimTask:claimTask,claimChest:claimChest,buyLuck:buyLuck,exchangeTon:exchangeTon,bid:bid,buyLot:buyLot,cancelLot:cancelLot,acceptOffer:acceptOffer,rejectOffer:rejectOffer,listLot:listLot,autoResolve:autoResolve,admGrant:admGrant,tickNow:tickNow,resetAll:resetAll,craftRoll:craftRoll,spinRoll:spinRoll,wheelRoll:wheelRoll};
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
