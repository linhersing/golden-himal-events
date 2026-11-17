import test from 'node:test';
import assert from 'node:assert/strict';
import {validSongLanguage,SUGGESTED_SONG_LANGUAGES} from '../backend/song-language.js';
import {parseFiveDemos} from '../backend/demo-five-2027.js';
import {validPerformanceLink} from '../public/performance-link.js';

test('song-language menu suggestions include regional options without excluding legitimate others',()=>{
 for(const language of ['Nepali','English','Hindi','Tamang','Tharu','Nepal Bhasa','Awadhi','Magar','Gurung','Limbu','Chinese']){
  assert.equal(SUGGESTED_SONG_LANGUAGES.includes(language),true,language);
  assert.equal(validSongLanguage(language),true,language);
 }
 for(const name of ['Korean','French','किराँती','नेपाल भाषा','Português','K’iche','Lao','Japanese']){
  assert.equal(validSongLanguage(name),true,name);
 }
 for(const bad of ['',' ','Other','a','English<script>','hi@attacker.test','C'.repeat(61),'\nFrench']){
  assert.equal(validSongLanguage(bad),false,JSON.stringify(bad));
 }
});

test('each of five Demo songs may have its own entered language; Other alone is not valid',()=>{
 const songs=Array.from({length:5},(_,i)=>({
  song_title:'Song '+(i+1),original_artist:'Test singer',
  song_language:['Nepali','Korean','थारू','French','Nepal Bhasa'][i],
  demo_url:'https://youtu.be/DEMO_TEST_'+(i+1)
 }));
 const payload={...songs[0],demo_entries:songs};
 assert.deepEqual(parseFiveDemos(payload,validPerformanceLink).entries,songs);
 const invalid={...payload,demo_entries:[songs[0],{...songs[1],song_language:'Other'},...songs.slice(2)]};
 assert.equal(parseFiveDemos(invalid,validPerformanceLink).error,'invalid_demo_fields');
});
