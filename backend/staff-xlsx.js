import {strToU8,zipSync} from 'fflate';
import {validPerformanceLink} from '../public/performance-link.js';
import {excelCopy} from './staff-xlsx-locale.js';

const header='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>';
const relationships='http://schemas.openxmlformats.org/officeDocument/2006/relationships';
const sheetNs='http://schemas.openxmlformats.org/spreadsheetml/2006/main';
const contentNs='http://schemas.openxmlformats.org/package/2006/content-types';
const xml=value=>String(value??'').replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\uFFFE\uFFFF]/g,'')
 .replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[char]));
const rel=(id,type,target,external=false)=>'<Relationship Id="'+id+'" Type="'+relationships+'/'+type+'" Target="'+xml(target)+'"'+(external?' TargetMode="External"':'')+'/>';
const rels=items=>header+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'+items.join('')+'</Relationships>';
const address=(index,row)=>{
 let name='';
 for(let n=index+1;n;n=Math.floor((n-1)/26))name=String.fromCharCode(65+(n-1)%26)+name;
 return name+row;
};
const styles=header+'<styleSheet xmlns="'+sheetNs+'">'
 +'<fonts count="3"><font><sz val="11"/><name val="Calibri"/></font><font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font><font><u/><color rgb="FF1E5494"/><sz val="11"/><name val="Calibri"/></font></fonts>'
 +'<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FF493421"/><bgColor indexed="64"/></patternFill></fill></fills>'
 +'<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
 +'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
 +'<cellXfs count="4"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="9" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/></cellXfs>'
 +'<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
function sheet(rows,widths,{filter=false,freezeNames=false,linked=[],drawing=false}={}){
 const links=[];
 const items=rows.map((row,index)=>{
  const cells=row.map((data,col)=>{
   const ref=address(col,index+1);
   const r='<c r="'+ref+'"';
   if(data?.formula)return r+(data.percent?' s="3"':'')+'><f>'+xml(data.formula)+'</f><v>'+data.value+'</v></c>';
   if(typeof data==='number'&&Number.isFinite(data))return r+'><v>'+data+'</v></c>';
   const target=data?.target??data;
   const link=index>0&&linked.includes(col)&&validPerformanceLink(target);
   if(link)links.push({ref,target});
   const style=index===0?' s="1"':link?' s="2"':'';
   return r+' t="inlineStr"'+style+'><is><t xml:space="preserve">'+xml(link?data?.label??target:target)+'</t></is></c>';
  });
  return '<row r="'+(index+1)+'">'+cells.join('')+'</row>';
 });
 const cols=widths.map((width,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+width+'" customWidth="1"/>').join('');
 const linkTags=links.map(({ref},i)=>'<hyperlink ref="'+ref+'" r:id="rId'+(i+1)+'"/>').join('');
 return {
  xml:header+'<worksheet xmlns="'+sheetNs+'" xmlns:r="'+relationships+'">'
   +'<sheetViews><sheetView workbookViewId="0">'+(freezeNames?'<pane xSplit="2" ySplit="1" topLeftCell="C2" activePane="bottomRight" state="frozen"/>':
    filter?'<pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/>':'')+'</sheetView></sheetViews>'
   +'<cols>'+cols+'</cols><sheetData>'+items.join('')+'</sheetData>'
   +(filter?'<autoFilter ref="A1:'+address(rows[0].length-1,rows.length)+'"/>':'')
   +(links.length?'<hyperlinks>'+linkTags+'</hyperlinks>':'')+(drawing?'<drawing r:id="rId1"/>':'')+'</worksheet>',
  links:links.map(({target},i)=>rel('rId'+(i+1),'hyperlink',target,true))
 };
}

const activeStates=['Pending review','Awaiting correction','Correction expired','Approved','Unverified'];
const regions=['A','B','Unspecified'];
const scopeNames={organizer:'Review status',reviewer:'Your scoring status'};
const coreFields=[['id','Entry ID',38],['stage_name','Performer / stage name',27],['round_code','Round',14],
 ['phase','Stage',14],['competition_region','Region',14],['export_state','Status',24],['songCount','Songs',12]];
const staffFields=[['full_name','Legal name',24],['contact_phone','Phone',20],['contact_email','Email',30],['contact_handle','Contact account',25],
 ['province','Province of residence',19],['location_basis','Location basis',18],['location_detail','District / town',24],['city','City',20],['street_address','Street / Tol',28],
 ['affiliation','School / occupation',26],['educational_background','Education',32],['short_description','Introduction',38],['musical_training','Music training',36],
 ['eligibility_basis','Eligibility',16],['category','Record category',18],['song_key','Song 1 key',16],['gender','Gender',16],
 ['photo_url_1','Photo 1 URL',32],['photo_url_2','Photo 2 URL',32],['photo_url_3','Photo 3 URL',32],
 ['photoConsentAt','Photo consent (Nepal)',24],['status','Application state',20],['submittedAt','Submitted (Nepal)',25],['supplementAt','Correction deadline (Nepal)',27]];
const reviewFields=[['myScore','Your score',16]];

function nepalTime(unixSeconds){
 return unixSeconds?new Date((Number(unixSeconds)+5*3600+45*60)*1000).toISOString().slice(0,16).replace('T',' '):'';
}
function organizerStatus(row){
 if(row.video_supplement_state==='expired')return activeStates[2];
 if(row.video_supplement_state==='pending')return activeStates[1];
 return row.approval_state==='approved'?activeStates[3]:row.approval_state==='pending'?activeStates[0]:activeStates[4];
}
function reviewerScore(row){
 const parts=row.phase==='demo'?[row.demo_technique,row.demo_interpretation]:
  [row.live_technique,row.live_interpretation,row.stage_presence,row.appearance];
 return parts.every(Number.isFinite)?parts.reduce((sum,point)=>sum+point,0):null;
}
function songsFor(row){
 if(row.demo_entries?.length)return row.demo_entries;
 return row.song_title||row.demo_url?[row]:[];
}
function prepareEntries(entries,role){
 return entries.map(row=>{
  const songs=songsFor(row);
  const region=regions.includes(row.competition_region)?row.competition_region:regions[2];
  const myScore=role==='reviewer'?reviewerScore(row):null;
  return {row:{...row,competition_region:region,myScore,songCount:songs.length,
   export_state:role==='organizer'?organizerStatus(row):myScore!==null||row.demo_entries?.some(song=>song.my_score)?'Scored':'Awaiting score',
   submittedAt:nepalTime(row.created_at),supplementAt:nepalTime(row.video_supplement_deadline),photoConsentAt:nepalTime(row.photo_consent_at)},songs};
 });
}
function chartXml(kind,labels,first,last,values,title){
 const cache=(items,tag)=>'<c:'+tag+'Cache>'+(tag==='num'?'<c:formatCode>General</c:formatCode>':'')+
  '<c:ptCount val="'+items.length+'"/>'+items.map((v,i)=>'<c:pt idx="'+i+'"><c:v>'+xml(v)+'</c:v></c:pt>').join('')+'</c:'+tag+'Cache>';
 const doughnut=kind==='doughnut';
 const colors=doughnut?['B39442','C79355','AE533D','458962','7B718A']:['AC8C42','C3A35E','8E7F67'];
 const points=values.map((_,i)=>'<c:dPt><c:idx val="'+i+'"/><c:spPr><a:solidFill><a:srgbClr val="'+colors[i%colors.length]+'"/></a:solidFill></c:spPr></c:dPt>').join('');
 const series='<c:ser><c:idx val="0"/><c:order val="0"/>'+points+
  '<c:cat><c:strRef><c:f>Overview!$A$'+first+':$A$'+last+'</c:f>'+cache(labels,'str')+'</c:strRef></c:cat>'+
  '<c:val><c:numRef><c:f>Overview!$B$'+first+':$B$'+last+'</c:f>'+cache(values,'num')+'</c:numRef></c:val></c:ser>';
 const axes='<c:catAx><c:axId val="10"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:tickLblPos val="nextTo"/><c:crossAx val="20"/><c:crosses val="autoZero"/><c:auto val="1"/></c:catAx>'
  +'<c:valAx><c:axId val="20"/><c:scaling><c:orientation val="minMax"/><c:min val="0"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:majorGridlines/><c:numFmt formatCode="0" sourceLinked="0"/><c:tickLblPos val="nextTo"/><c:crossAx val="10"/><c:crosses val="autoZero"/><c:crossBetween val="between"/></c:valAx>';
 const plot=doughnut?'<c:doughnutChart><c:varyColors val="1"/>'+series+'<c:holeSize val="60"/></c:doughnutChart>':
  '<c:barChart><c:barDir val="col"/><c:grouping val="clustered"/><c:varyColors val="1"/>'+series+'<c:axId val="10"/><c:axId val="20"/></c:barChart>'+axes;
 return header+'<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main"><c:chart>'
  +'<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:r><a:t>'+xml(title)+'</a:t></a:r></a:p></c:rich></c:tx></c:title>'
  +'<c:plotArea><c:layout/>'+plot+'</c:plotArea>'+(doughnut?'<c:legend><c:legendPos val="r"/><c:layout/></c:legend>':'')
  +'<c:plotVisOnly val="1"/></c:chart></c:chartSpace>';
}
function drawingXml(){
 const marker=(tag,col,row)=>'<xdr:'+tag+'><xdr:col>'+col+'</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>'+row+'</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:'+tag+'>';
 const anchors=[1,2].map((id)=>'<xdr:twoCellAnchor>'+marker('from',4,(id-1)*14)+marker('to',11,id*14)
  +'<xdr:graphicFrame><xdr:nvGraphicFramePr><xdr:cNvPr id="'+id+'" name="Chart '+id+'"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>'
  +'<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rId'+id+'"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>');
 return header+'<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="'+relationships+'">'+anchors.join('')+'</xdr:wsDr>';
}

export function buildStaffWorkbook({role,entries,exportedAt,locale}){
 const t=excelCopy(locale);
 const prepared=prepareEntries(entries,role);
 const fields=role==='organizer'?staffFields:reviewFields;
 const rosterHeaders=coreFields.map(([,label])=>t(label));
 const rosterWidths=coreFields.map(([,,width])=>width);
 const linked=[];
 for(let i=1;i<=5;i++){
  rosterHeaders.push(t('Song')+' '+i,t('Video')+' '+i);rosterWidths.push(24,15);linked.push(rosterHeaders.length-1);
 }
 rosterHeaders.push(...fields.map(([,label])=>t(label)));
 rosterWidths.push(...fields.map(([,,width])=>width));
 const roster=[rosterHeaders,...prepared.map(({row,songs})=>[
  ...coreFields.map(([key])=>['export_state','competition_region'].includes(key)?t(row[key]):row[key]??''),
  ...Array.from({length:5},(_,i)=>[songs[i]?.song_title??'',{target:songs[i]?.demo_url??'',label:t('Watch video')+' '+(i+1)}]).flat(),
  ...fields.map(([key])=>row[key]??'')
 ])];
 const reviewer=role==='reviewer';
 const works=[['Entry ID','Performer','Position','Song','Original artist','Language','Video URL',...(reviewer?['Your per-song score']:[])].map(t),
  ...prepared.flatMap(({row,songs})=>songs.map((song,i)=>{
   const work=[row.id,row.stage_name,song.position??i+1,song.song_title,song.original_artist,song.song_language,song.demo_url];
   if(reviewer)work.push(song.my_score?song.my_score.technique+song.my_score.interpretation:'');
   return work;
  }))];
 const states=role==='organizer'?activeStates:['Awaiting score','Scored'];
 const stateTotals=states.map(label=>prepared.filter(({row})=>row.export_state===label).length);
 const regionTotals=regions.map(label=>prepared.filter(({row})=>row.competition_region===label).length);
 const overview=[['Golden Himal Voice',t('Excel export')],[t('File scope'),t(role==='organizer'?'Restricted · Active entries and their private registration data':'Reviewer · Eligible entries only')],
  [t('Exported (Nepal)'),nepalTime(exportedAt)],[t('Registrations'),{formula:'COUNTA(Entries!$A:$A)-1',value:entries.length}],
  [t('Visible entries'),{formula:'SUBTOTAL(103,Entries!$A:$A)-1',value:entries.length}],
  [t(scopeNames[role]),t('Entries'),t('Share')],
  ...states.map((label,i)=>[t(label),{formula:'COUNTIF(Entries!$F:$F,A'+(7+i)+')',value:stateTotals[i]},
   {formula:'IFERROR(B'+(7+i)+'/$B$4,0)',value:entries.length?stateTotals[i]/entries.length:0,percent:true}]),
  [],[t('Region'),t('Entries')]];
 const regionStart=overview.length+1;
 overview.push(...regions.map((label,i)=>[t(label),{formula:'COUNTIF(Entries!$E:$E,A'+(regionStart+i)+')',value:regionTotals[i]}]));
 overview.push([],[t('How to filter'),t('Use the header arrows in Entries or Songs. Charts summarize the full export.')]);
 const sheets=[sheet(overview,[25,65,12],{drawing:true}),sheet(roster,rosterWidths,{filter:true,freezeNames:true,linked}),sheet(works,[38,27,12,26,25,18,37,...(reviewer?[22]:[])],{filter:true,linked:[6]})];
 const types={ '/xl/workbook.xml':'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml',
  '/xl/styles.xml':'application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml',
  '/xl/drawings/drawing1.xml':'application/vnd.openxmlformats-officedocument.drawing+xml' };
 const files={'_rels/.rels':rels([rel('rId1','officeDocument','xl/workbook.xml')]),
  'xl/styles.xml':styles,
  'xl/workbook.xml':header+'<workbook xmlns="'+sheetNs+'" xmlns:r="'+relationships+'"><sheets>'
   +['Overview','Entries','Songs'].map((name,i)=>'<sheet name="'+name+'" sheetId="'+(i+1)+'" r:id="rId'+(i+1)+'"/>').join('')
   +'</sheets><calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>',
  'xl/_rels/workbook.xml.rels':rels([...sheets.map((_,i)=>rel('rId'+(i+1),'worksheet','worksheets/sheet'+(i+1)+'.xml')),rel('rId4','styles','styles.xml')]),
  'xl/drawings/drawing1.xml':drawingXml(),
  'xl/drawings/_rels/drawing1.xml.rels':rels([rel('rId1','chart','../charts/chart1.xml'),rel('rId2','chart','../charts/chart2.xml')]),
  'xl/worksheets/_rels/sheet1.xml.rels':rels([rel('rId1','drawing','../drawings/drawing1.xml')]),
  'xl/charts/chart1.xml':chartXml('doughnut',states.map(t),7,6+states.length,stateTotals,t(scopeNames[role])),
  'xl/charts/chart2.xml':chartXml('bar',regions.map(t),regionStart,regionStart+2,regionTotals,t('Entries by region'))
 };
 for(const [i,result] of sheets.entries()){
  const path='sheet'+(i+1)+'.xml';
  files['xl/worksheets/'+path]=result.xml;
  types['/xl/worksheets/'+path]='application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml';
  if(result.links.length)files['xl/worksheets/_rels/'+path+'.rels']=rels(result.links);
 }
 for(const i of [1,2])types['/xl/charts/chart'+i+'.xml']='application/vnd.openxmlformats-officedocument.drawingml.chart+xml';
 files['[Content_Types].xml']=header+'<Types xmlns="'+contentNs+'"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/>'
  +Object.entries(types).map(([name,type])=>'<Override PartName="'+name+'" ContentType="'+type+'"/>').join('')+'</Types>';
 return zipSync(Object.fromEntries(Object.entries(files).map(([name,contents])=>[name,strToU8(contents)])),{level:3});
}
