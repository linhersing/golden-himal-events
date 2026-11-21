// Called only by the disposable workerd fixture. No remote/brand bootstrap.
export async function seedStageFixture(db,fixtures,panel){
 await db.prepare("INSERT INTO stage_test_scope VALUES('FICTIONAL_STAGE_TEST_ONLY')").run();
 for(const code of ['audition','qualifier_one','qualifier_two','regional_pk','final'])await db.prepare('INSERT INTO stage_test_rounds(code,status,panel,config) VALUES(?,?,?,?)').bind(code,code==='audition'?'open':'locked',JSON.stringify(panel),JSON.stringify({source:'frontline_pending',quotas:{A:null,B:null},maxTeamSize:null})).run();
 for(const f of fixtures)await db.batch([
  db.prepare('INSERT INTO stage_test_units VALUES(?,?,?,?,?)').bind('audition',f.id,f.stageName,f.region,f.demos),
  db.prepare('INSERT INTO stage_test_members VALUES(?,?,?)').bind('audition',f.id,f.id)
 ]);
}
