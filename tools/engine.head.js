// Серверный движок игры. ФАЙЛ СОЗДАЁТСЯ АВТОМАТИЧЕСКИ из тех же модулей, что и игра. Не редактировать вручную.
export function createEngine(){
var NOOP=new Proxy(function(){},{get:function(){return NOOP},apply:function(){return NOOP},set:function(){return true}});
var document=NOOP,window=NOOP,navigator=NOOP,location=NOOP,localStorage=NOOP,sessionStorage=NOOP;
var S=null,TG=null,cur=null,busy=false,scr='home',MSGS=[];
function hap(){}function draw(){}function paintHome(){}function go(){}function back(){}function ask(){}function save(){}function SRV(){return false}
