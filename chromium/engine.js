(() => {
  if(globalThis.InternshipAutofill)return;
  const normalize=s=>String(s||'').replace(/([a-z])([A-Z])/g,'$1 $2').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
  const aliases={
    firstName:['first name','given name','fname'],lastName:['last name','family name','surname','lname'],
    fullName:['full name','legal name','name','applicant name'],email:['email','email address','e mail'],
    phone:['phone','phone number','mobile','mobile phone','telephone','contact number'],
    address:['address','street address','address line 1','address 1'],address2:['address line 2','address 2','apartment','unit'],
    city:['city','town'],state:['state','province','state province'],postalCode:['zip','zip code','postal code','postcode'],country:['country','country region'],
    linkedin:['linkedin','linkedin url','linkedin profile','linkedin profile url','linked in','linked in url','linked in profile','linked in profile url'],github:['github','github url','github profile','git hub','git hub url','git hub profile'],
    portfolio:['portfolio','portfolio url','website','personal website','website url'],school:['school','university','college','school name','university name','college university'],
    degree:['degree','degree type'],major:['major','field of study','academic major'],graduation:['graduation date','expected graduation date','graduation'],gpa:['gpa','cumulative gpa']
  };
  const autocomplete={'given-name':'firstName','family-name':'lastName',name:'fullName',email:'email',tel:'phone','street-address':'address','address-line1':'address','address-line2':'address2','address-level2':'city','address-level1':'state','postal-code':'postalCode','country-name':'country'};
  let observer=null, timer=null, generation=0;
  const changes=new Map();
  function stop(){observer?.disconnect();observer=null;clearTimeout(timer);generation++;}
  function roots(){
    const list=[];const seen=new Set();
    function visit(root){if(seen.has(root))return;seen.add(root);list.push(root);
      for(const el of root.querySelectorAll('*')) {
        if(el.shadowRoot)visit(el.shadowRoot);
        if(el.tagName==='IFRAME'&&el.getClientRects().length&&getComputedStyle(el).visibility!=='hidden')try{if(el.contentDocument)visit(el.contentDocument);}catch{}
      }
    }visit(document);return list;
  }
  function labels(el){
    const root=el.getRootNode();
    const labelled=(el.getAttribute('aria-labelledby')||'').split(/\s+/).map(id=>root.getElementById?.(id)?.textContent||'').join(' ').trim();
    const textOfLabel=x=>{const copy=x.cloneNode(true);for(const control of copy.querySelectorAll('input,select,textarea,button'))control.remove();return copy.textContent.trim();};
    return [...new Set([...(el.labels||[])].map(textOfLabel).concat([el.getAttribute('aria-label'),labelled,el.placeholder]).filter(Boolean))];
  }
  function descriptors(el){
    const visibleLabels=labels(el);
    return (visibleLabels.length?visibleLabels:[el.name,el.id]).map(normalize).map(s=>s.replace(/ (required|optional)$/,'')).filter(Boolean);
  }
  function match(el,profile){
    const desc=descriptors(el);
    for(const custom of profile.answers||[])if(normalize(custom.question)&&labels(el).some(label=>normalize(label)===normalize(custom.question)))return {value:custom.answer,source:'Saved answer'};
    const token=(el.autocomplete||'').split(/\s+/).pop();
    let key=autocomplete[token];
    if(!key)for(const [candidate,names] of Object.entries(aliases))if(desc.some(d=>names.includes(d))){key=candidate;break;}
    const value=key==='fullName'?(profile.fullName||[profile.firstName,profile.lastName].filter(Boolean).join(' ')):profile[key];
    return key&&value?{value:String(value),source:key}:null;
  }
  function eligible(el){return !el.disabled&&!el.readOnly&&!el.closest('[inert]')&&el.getClientRects().length>0&&getComputedStyle(el).visibility!=='hidden';}
  function optionFor(el,value){
    const n=normalize(value);
    const matches=[...el.options].filter(o=>!o.disabled&&(normalize(o.textContent)===n||normalize(o.value)===n));
    return matches.length===1?matches[0]:null;
  }
  function empty(el){
    if(el.tagName!=='SELECT')return !el.value.trim();
    const option=el.selectedOptions[0];
    return !el.value||(option&&/^(select|choose|please select|please choose)(\b|$)/i.test(option.textContent.trim()));
  }
  function scan(profile){
    const items=[];
    for(const root of roots())for(const el of root.querySelectorAll('input,textarea,select')) {
      if(!eligible(el))continue;
      const label=labels(el)[0]||el.name||el.id||'Unlabelled field';
      const type=el.type?.toLowerCase();
      if(el.tagName==='INPUT'&&!['text','email','tel','url','number','date','month','search'].includes(type)){
        if(['file','checkbox','radio'].includes(type))items.push({el,label,reason:type==='file'?'Upload manually':'Choose manually'});
        continue;
      }
      if(!empty(el)){items.push({el,label,reason:'Already filled — kept'});continue;}
      const matched=match(el,profile);
      if(!matched){items.push({el,label,reason:'No saved match — fill manually or add a saved answer'});continue;}
      if(el.tagName==='SELECT'){
        const option=optionFor(el,matched.value);
        if(!option){items.push({el,label,reason:'No unique matching dropdown option'});continue;}
        matched.value=option.value;
      }
      if(type==='date'&&!/^\d{4}-\d{2}-\d{2}$/.test(matched.value)||type==='month'&&!/^\d{4}-\d{2}$/.test(matched.value)){
        items.push({el,label,reason:'Date format needs attention'});continue;
      }
      if(type==='number'&&(!Number.isFinite(Number(matched.value))||matched.value.trim()==='')){items.push({el,label,reason:'A number is required'});continue;}
      items.push({el,label,...matched});
    }return items;
  }
  function setValue(el,value){
    const view=el.ownerDocument.defaultView;
    const proto=el.tagName==='SELECT'?view.HTMLSelectElement.prototype:el.tagName==='TEXTAREA'?view.HTMLTextAreaElement.prototype:view.HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto,'value').set.call(el,value);
    el.dispatchEvent(new view.Event('input',{bubbles:true,composed:true}));
    el.dispatchEvent(new view.Event('change',{bubbles:true,composed:true}));
  }
  function fill(profile){
    let count=0;const items=scan(profile);
    for(const item of items)if(!item.reason){
      const original=item.el.value;
      setValue(item.el,item.value);
      if(item.el.value!==item.value){item.reason='Page rejected this value';continue;}
      const previous=changes.get(item.el);
      changes.set(item.el,{before:previous?.before??original,after:item.value});count++;
    }return {count,items};
  }
  function publicItems(items){return items.map(({el,...item})=>item);}
  function start(profile){
    stop();const current=generation;
    observer=new MutationObserver(()=>{
      clearTimeout(timer);timer=setTimeout(()=>{if(current!==generation)return;fill(profile);observe();},350);
    });
    function observe(){if(!observer)return;for(const root of roots())observer.observe(root,{subtree:true,childList:true,attributes:true,attributeFilter:['class','style','hidden','disabled','aria-label','aria-labelledby']});}
    observe();
  }
  globalThis.InternshipAutofill={run(action,profile={},automatic=false){
    if(action==='stop'){stop();return {message:'Automatic filling stopped.'};}
    if(action==='undo'){
      stop();let count=0;
      for(const [el,change] of changes)if(el.isConnected&&el.value===change.after){setValue(el,change.before);count++;}
      changes.clear();return {message:`Undid ${count} field(s). Answers you edited afterward were kept.`};
    }
    if(action==='scan'){
      const items=scan(profile);const count=items.filter(x=>!x.reason).length;
      return {message:`${count} field(s) ready to fill. Review the matches below.`,items:publicItems(items)};
    }
    if(action==='fill'){
      stop();const {count,items}=fill(profile);if(automatic)start(profile);
      return {message:`Filled ${count} field(s). ${automatic?'Auto mode is on for this page until stopped or reloaded. ':''}Review your answers before submitting.`,items:publicItems(items)};
    }
    throw Error('Unknown action');
  }};
})();
