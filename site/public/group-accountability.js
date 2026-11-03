/* Ephemeral group-vote comparison presenter. No persistence or identity data. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;root.GroupAccountability=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
 'use strict';
 function present(event,personalVote,participantAvailable=true){
  if(!event)return null;
  const human=Number(event.human)||0,ai=Number(event.ai)||0;
  const outcome=event.chosen==='human'?'人の案':event.chosen==='ai'?'AIの案':event.chosen==='mixed'?'同数のため保留':event.chosen==='none'?'投票なし':'保留';
  const personal=personalVote==='human'?'人が判断する':personalVote==='ai'?'AIに任せる':participantAvailable?'このタブでの記録なし':'参加者ではありません';
  return {round:event.round,heading:event.heading,personal,outcome,human,ai,tally:`人 ${human}票 / AI ${ai}票`,chosen:event.chosen};
 }
 function list(history,choices,participantAvailable=true){return (history||[]).map(e=>present(e,choices instanceof Map?choices.get(e.round):choices?.[e.round],participantAvailable));}
 return Object.freeze({present,list});
});
