import test from 'node:test';
import assert from 'node:assert/strict';
// This catches accepting a short phone and disagreement between UI and backend.
test('application validation identifies short phone and invalid link without discarding other fields',async()=>{
 const {validatePracticeApplication}=await import('../public/practice-validation.js');
 const good={stage_name:'TEST Singer',round_code:'2027-01',category:'university',province:'bagmati',contact_phone:'+9770000000000',contact_handle:'TEST contact',affiliation:'TEST school',song_language:'Nepali',song_key:'C',song_title:'TEST song',original_artist:'TEST artist',work_url:'https://youtu.be/dQw4w9WgXcQ',synthetic:true,priority_ack:true,media_ack:true};
 assert.deepEqual(validatePracticeApplication(good),{});
 assert.deepEqual(validatePracticeApplication({...good,contact_phone:'0966'}),{contact_phone:'phoneFormat'});
 assert.deepEqual(validatePracticeApplication({...good,work_url:'javascript:alert(1)'}),{work_url:'invalidLink'});
 assert.deepEqual(validatePracticeApplication({...good,stage_name:'  ',media_ack:false}),{stage_name:'fieldRequired',media_ack:'checkRequired'});
 assert.deepEqual(validatePracticeApplication({...good,category:'community',birth_date:'2009-02-01'}),{birth_date:'ageError'});
 assert.deepEqual(validatePracticeApplication({...good,category:'community',birth_date:'2009-01-31'}),{});
});
