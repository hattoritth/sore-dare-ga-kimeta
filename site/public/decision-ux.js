/* Solo-only presentation records. These labels never enter engine votes or scoring. */
;(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.DecisionUX=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 const strategies=Object.freeze({voices:'現地の声を確かめる',balance:'複数地区の希望を調整する'});
 function label(id){return strategies[id]||null;}
 function record(round,id){if(!Number.isInteger(round)||round<2||round>4||!label(id))return null;return {round,strategy:id};}
 function explanation(item){const text=item&&label(item.strategy);return text?`${text}方針を実施しました。選択に応じて街の指標が変化します。記録はこのタブ内だけにあり、再読み込みで失われます。`:null;}
 return {strategies,label,record,explanation};
});
