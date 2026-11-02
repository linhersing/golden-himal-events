// Creation-time TEST codes only. This module never stores, transmits or logs them.
export function buildPracticePassBackup(workspaceId,passes){
 const roles=['member-a','member-b','judge-1','judge-2','judge-3','organizer'];
 if(typeof workspaceId!=='string'||!workspaceId||workspaceId.length>100||!Array.isArray(passes)||passes.length!==6)throw Error('private_backup_unavailable');
 const rows=roles.map(role=>{const matches=passes.filter(p=>p.actor_id===role);if(matches.length!==1||!/^[a-f0-9]{64}$/.test(matches[0].pass))throw Error('private_backup_unavailable');return role+': '+matches[0].pass});
 return ['GOLDEN HIMAL VOICE — PRIVATE TEST ONLY',
  'Keep privately. Do not share in meeting notes, chat, screenshots or GitHub.',
  '測試角色碼請私下保存，不放共同紀錄。不是正式會員帳密。',
  'Workspace: '+workspaceId,...rows,'Workspace expires after 30 days; these codes do not reset expiry.'].join('\n');
}
