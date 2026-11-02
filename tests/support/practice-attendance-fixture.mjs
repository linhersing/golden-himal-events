import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
import worker from '../../backend/staging-registration-worker.js';
export async function attendanceFixture(t){
 const clock={value:Date.now()};t.mock.method(Date,'now',()=>clock.value);
 const db=new DatabaseSync(':memory:');db.exec('PRAGMA foreign_keys=ON');db.function('unixepoch',()=>Math.floor(clock.value/1000));
 const migration=await readFile(new URL('../../backend/migrations/1002_private_practice_ONLY.sql',import.meta.url),'utf8');db.exec(migration);
 const prepare=sql=>{let args=[];const s={sql,bind(...xs){args=xs;return s},async first(){return db.prepare(sql).get(...args)||null},async all(){return {results:db.prepare(sql).all(...args)}},async run(){return {meta:{changes:Number(db.prepare(sql).run(...args).changes)}}}};return s};
 let queue=Promise.resolve();const env={STAGING_PRACTICE_ENABLED:'true',E2E_DB:{prepare,batch(stmts){const p=queue.then(async()=>{db.exec('BEGIN');try{const out=[];for(const s of stmts)out.push(await s.run());db.exec('COMMIT');return out}catch(e){db.exec('ROLLBACK');throw e}});queue=p.catch(()=>{});return p}}};
 const call=async(path,body,cookie='')=>{const r=await worker.fetch(new Request('https://attendance.example/api/staging/practice/'+path,{method:body===undefined?'GET':'POST',headers:{Origin:'https://attendance.example','Content-Type':'application/json',Cookie:cookie},body:body===undefined?undefined:JSON.stringify(body)}),env);return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]}};
 const made=await call('create',{synthetic:true});const ws=made.data.actor.workspace_id;
 const role=async id=>(await call('login',{pass:made.data.passes.find(p=>p.actor_id===id).pass})).cookie;
 const seed=(count=2,phase='demo',ownerAt=1,tied=false,offset=0)=>{
  const ids=[];for(let i=1+offset;i<=count+offset;i++){
   const actor=i===ownerAt?'member-a':i===(ownerAt===1?2:1)?'member-b':'seed-'+i;
   if(actor.startsWith('seed-'))db.prepare('INSERT INTO ghv_practice_actors VALUES(?,?,?,?)').run(ws,actor,'member',String(i).padStart(64,'0'));
   const id='GHV-TEST-SEED-'+i;ids.push(id);
   db.prepare("INSERT INTO ghv_practice_applications(id,workspace_id,actor_id,stage_name,round_code,category,province,song_title,original_artist,work_url,contact_phone,contact_handle,affiliation,song_language,song_key,priority_ack,media_ack,created_at) VALUES(?,?,?,?,'2027-01','university','bagmati','TEST Song','TEST Artist','https://youtu.be/dQw4w9WgXcQ','+9770000000000','TEST contact','TEST college','Nepali','C',1,1,?)").run(id,ws,actor,'TEST Singer '+i,Math.floor(clock.value/1000));
   const score=p=>{for(let j=1;j<=3;j++)db.prepare('INSERT INTO ghv_practice_scores VALUES(?,?,?,?,?,?,?,?,?,?,?)').run(ws,id,'judge-'+j,p,p==='demo'?60-(tied?0:i):40-(tied?0:i),p==='demo'?30:30,p==='demo'?0:20,p==='demo'?0:10,0,null,Math.floor(clock.value/1000));};
   score('demo');if(phase==='qualifier'){db.prepare("UPDATE ghv_practice_applications SET phase='qualifier' WHERE id=?").run(id);score('qualifier');}
  }return ids;
 };
 const publish=async(source_phase='demo',extra={},cookie)=>call('admission-publish',{source_phase,round_code:'2027-01',category:'university',event_at:Math.floor(clock.value/1000)+30*86400,notified_manually:true,...extra},cookie===undefined?await role('organizer'):cookie);
 t.after(()=>db.close());return {db,clock,env,call,role,ws,seed,publish,migration,worker};
}
