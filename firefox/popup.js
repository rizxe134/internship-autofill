const api=globalThis.browser||chrome;
const status=document.querySelector('#status');
document.querySelector('#profile').onclick=()=>api.runtime.openOptionsPage();
async function run(action) {
  const buttons=[...document.querySelectorAll('button')];buttons.forEach(b=>b.disabled=true);
  try {
    const {profile}=await api.storage.local.get('profile');
    if(!profile&&['scan','fill'].includes(action)){status.textContent='Save your profile first using Edit profile.';return;}
    const [tab]=await api.tabs.query({active:true,currentWindow:true});
    if(!tab?.id||!/^https?:\/\//.test(tab.url||''))throw Error('Open a regular website first. Browser settings and extension pages cannot be filled.');
    await api.scripting.executeScript({target:{tabId:tab.id},files:['engine.js']});
    const results=await api.scripting.executeScript({target:{tabId:tab.id},func:(action,profile,automatic)=>globalThis.InternshipAutofill.run(action,profile,automatic),args:[action,profile||{},document.querySelector('#automatic').checked]});
    const result=results[0].result;status.textContent=result.message;
    const list=document.querySelector('#results');list.replaceChildren();
    for(const item of result.items||[]) {
      const row=document.createElement('div');row.className='result';
      const title=document.createElement('strong');title.textContent=item.label;
      const detail=document.createElement('small');detail.textContent=item.reason||(item.value+' · '+item.source);
      row.append(title,detail);list.append(row);
    }
  }catch(e){status.textContent='Could not access this page. Try reopening the extension on the application page. '+e.message;}
  finally{buttons.forEach(b=>b.disabled=false);}
}
for(const action of ['scan','fill','undo','stop'])document.getElementById(action).onclick=()=>run(action);
