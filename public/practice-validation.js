import {validPerformanceLink} from './performance-link.js';
// Same field-level rules in the form and Worker. Never fetch submitted URLs.
export function validatePracticeApplication(values){
 const errors={},clean=k=>typeof values[k]==='string'?values[k].trim():'';
 for(const [key,max] of [['stage_name',60],['contact_handle',100],['affiliation',100],['song_language',40],['song_key',20],['song_title',100],['original_artist',100]]){
  const value=clean(key);if(!value)errors[key]='fieldRequired';else if(value.length>max)errors[key]='fieldTooLong';
 }
 if(!/^[+0-9 ()-]{8,30}$/.test(clean('contact_phone')))errors.contact_phone='phoneFormat';
 if(!validPerformanceLink(clean('work_url'))||clean('work_url').length>1000)errors.work_url='invalidLink';
 for(const [key,allowed] of [['round_code',['2027-01','2027-04']],['category',['university','community']],['province',['bagmati','gandaki']]])if(!allowed.includes(values[key]))errors[key]='fieldRequired';
 if(values.category==='community'){
  const birth=clean('birth_date'),date=new Date(birth+'T00:00:00Z'),cutoff=values.round_code==='2027-01'?'2009-01-31':'2009-04-30';
  if(!/^\d{4}-\d{2}-\d{2}$/.test(birth)||!Number.isFinite(date.valueOf())||date.toISOString().slice(0,10)!==birth||birth>cutoff)errors.birth_date='ageError';
 }
 for(const key of ['synthetic','priority_ack','media_ack'])if(values[key]!==true)errors[key]='checkRequired';
 return errors;
}
