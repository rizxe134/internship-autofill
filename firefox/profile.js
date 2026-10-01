const api = globalThis.browser || chrome;
const fields = document.querySelector('#fields');
const answers = document.querySelector('#answers');
const status = document.querySelector('#status');
for (const [key,label,autocomplete] of ApplicationFields) {
  const wrapper=document.createElement('label'); wrapper.textContent=label;
  const input=document.createElement('input'); input.id=key; input.autocomplete=autocomplete||'off';
  if(key==='email') input.type='email';
  wrapper.append(input); fields.append(wrapper);
}
function addAnswer(question='',answer='') {
  const row=document.createElement('div'); row.className='answer';
  const label=document.createElement('label'); label.textContent='Exact question / field label';
  const q=document.createElement('input'); q.value=question; q.className='question'; label.append(q);
  const al=document.createElement('label'); al.textContent='Your answer';
  const a=document.createElement('textarea'); a.value=answer; a.className='value'; al.append(a);
  const remove=document.createElement('button'); remove.type='button'; remove.textContent='Remove answer'; remove.onclick=()=>row.remove();
  row.append(label,al,remove); answers.append(row);
}
function render(profile={}) {
  for(const [key] of ApplicationFields) document.getElementById(key).value=profile[key]||'';
  answers.replaceChildren(); for(const item of profile.answers||[]) addAnswer(item.question,item.answer);
}
function collect() {
  const profile={}; for(const [key] of ApplicationFields) profile[key]=document.getElementById(key).value.trim();
  profile.answers=[...answers.children].map(row=>({question:row.querySelector('.question').value.trim(),answer:row.querySelector('.value').value.trim()})).filter(x=>x.question&&x.answer);
  return profile;
}
document.querySelector('#add').onclick=()=>addAnswer();
document.querySelector('#profile').onsubmit=async e=>{e.preventDefault();try{await api.storage.local.set({profile:collect()});status.textContent='Profile saved. Open an application and click the extension.';}catch(e){status.textContent=e.message;}};
document.querySelector('#export').onclick=()=>{
  const url=URL.createObjectURL(new Blob([JSON.stringify(collect(),null,2)],{type:'application/json'}));
  const a=document.createElement('a'); a.href=url;a.download='internship-profile.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
document.querySelector('#import').onclick=()=>document.querySelector('#backup').click();
document.querySelector('#backup').onchange=async e=>{try{
  const file=e.target.files[0];if(!file)return;if(file.size>1000000)throw Error('Backup is too large.');
  const data=JSON.parse(await file.text());if(!data||typeof data!=='object'||Array.isArray(data))throw Error('Invalid profile backup.');
  const clean={};for(const [key] of ApplicationFields)if(typeof data[key]==='string')clean[key]=data[key];
  clean.answers=Array.isArray(data.answers)?data.answers.filter(x=>x&&typeof x.question==='string'&&typeof x.answer==='string').slice(0,200):[];
  render(clean);status.textContent='Backup loaded. Click Save profile to keep it.';
}catch(e){status.textContent='Import failed: '+e.message;}finally{e.target.value='';}};
document.querySelector('#clear').onclick=async()=>{if(confirm('Delete the profile and saved answers from this browser?')){await api.storage.local.remove('profile');render();status.textContent='Saved profile deleted.';}};
api.storage.local.get('profile').then(({profile})=>render(profile)).catch(e=>status.textContent=e.message);
