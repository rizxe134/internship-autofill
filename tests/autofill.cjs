const {chromium}=require('playwright');
const fs=require('fs');const path=require('path');const assert=require('assert/strict');
const base=path.resolve(__dirname,'..');
(async()=>{
 const browser=await chromium.launch({headless:true,...(process.env.TEST_BROWSER?{channel:process.env.TEST_BROWSER}:{})});
 try{
 const page=await browser.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await page.setContent(fs.readFileSync(path.join(base,'demo.html'),'utf8'));
 await page.addScriptTag({path:path.join(base,'demo.js')});
 await page.addScriptTag({path:path.join(base,'chromium/engine.js')});
 const profile={firstName:'Alex',lastName:'Rivera',email:'alex@example.com',phone:'5551234567',school:'Example University',major:'Computer Science',state:'New York',graduation:'2027-05',linkedin:'https://linkedin.com/in/example',city:'Boston',answers:[{question:'Why are you interested in this internship?',answer:'I enjoy building useful software.'}]};
 let result=await page.evaluate(p=>InternshipAutofill.run('scan',p),profile);assert.equal(result.items.filter(x=>!x.reason).length,9);
 assert.equal(await page.locator('[name=first_name]').inputValue(),'');
 result=await page.evaluate(p=>InternshipAutofill.run('fill',p,true),profile);assert.match(result.message,/Filled 9/);
 assert.equal(await page.locator('[name=first_name]').inputValue(),'Alex');assert.equal(await page.locator('[name=state]').inputValue(),'New York');
 assert.equal(await page.locator('[name=city]').inputValue(),'Keep this answer');assert.equal(await page.locator('[name=unfamiliar]').inputValue(),'');
 await page.locator('#reveal').click();await page.waitForFunction(()=>document.querySelector('textarea')?.value==='I enjoy building useful software.');
 await page.locator('[name=first_name]').fill('User edit');
 result=await page.evaluate(()=>InternshipAutofill.run('undo'));assert.match(result.message,/Undid 9/);
 assert.equal(await page.locator('[name=first_name]').inputValue(),'User edit');assert.equal(await page.locator('textarea').inputValue(),'');
 await page.evaluate(()=>{const label=document.createElement('label');label.textContent='Email address';label.innerHTML+='<input id="hidden" style="display:none">';document.body.append(label);});
 result=await page.evaluate(p=>InternshipAutofill.run('fill',p),profile);assert.equal(await page.locator('#hidden').inputValue(),'');
 await page.evaluate(()=>InternshipAutofill.run('undo'));
 await page.evaluate(()=>{document.querySelector('[name=state]').innerHTML='<option value="">Choose</option><option>Unknown</option>';});
 result=await page.evaluate(p=>InternshipAutofill.run('scan',p),profile);assert.ok(result.items.find(x=>x.label==='State').reason.includes('No unique'));
 // Native input events, accessible shadow DOM, and same-origin frames.
 await page.evaluate(()=>{
  window.inputEvents=0;document.querySelector('[name=last_name]').addEventListener('input',()=>window.inputEvents++);
  const host=document.createElement('section');document.body.append(host);host.attachShadow({mode:'open'}).innerHTML='<label>GitHub URL<input name="github"></label>';
  const frame=document.createElement('iframe');frame.srcdoc='<label>Email address<input type="email"></label>';document.body.append(frame);
 });
 await page.waitForFunction(()=>document.querySelector('iframe').contentDocument?.querySelector('input'));
 await page.evaluate(p=>InternshipAutofill.run('fill',p),{...profile,github:'https://github.com/example'});
 assert.equal(await page.evaluate(()=>window.inputEvents),1);
 assert.equal(await page.locator('section input').inputValue(),'https://github.com/example');
 assert.equal(await page.frameLocator('iframe').locator('input').inputValue(),'alex@example.com');
 // Stop really prevents future automatic writes.
 await page.evaluate(()=>InternshipAutofill.run('undo'));
 await page.evaluate(p=>InternshipAutofill.run('fill',p,true),profile);
 await page.evaluate(()=>InternshipAutofill.run('stop'));
 await page.evaluate(()=>{const label=document.createElement('label');label.textContent='City';label.innerHTML+='<input id="later">';document.body.append(label);});
  await page.waitForTimeout(600);assert.equal(await page.locator('#later').inputValue(),'');
 await page.evaluate(()=>{
  const label=document.createElement('label');label.textContent='Previous employer name';label.innerHTML+='<input name="name" id="employer">';document.body.append(label);
  const selectLabel=document.createElement('label');selectLabel.textContent='Are you authorized to work?';selectLabel.innerHTML+='<select id="authorization"><option value="">Choose</option><option value="Y">Yes</option><option value="N">No</option></select>';document.body.append(selectLabel);
 });
 await page.evaluate(p=>InternshipAutofill.run('fill',p),{...profile,answers:[{question:'Are you authorized to work?',answer:'Yes'}]});
 assert.equal(await page.locator('#employer').inputValue(),'');assert.equal(await page.locator('#authorization').inputValue(),'Y');
 assert.deepEqual(errors,[]);
 // Profile editor with browser storage API stub; save/reload and inert stored strings.
 await page.addInitScript(()=>{globalThis.chrome={storage:{local:{get:async()=>({profile:JSON.parse(localStorage.getItem('profile')||'{}')}),set:async x=>localStorage.setItem('profile',JSON.stringify(x.profile)),remove:async()=>localStorage.removeItem('profile')}}};});
 await page.goto('file:///'+path.join(base,'chromium/profile.html').replaceAll('\\','/'));
 await page.locator('#firstName').fill('Alex');await page.locator('#add').click();
 await page.locator('.question').fill('Why this role?');await page.locator('.value').fill('<script>bad()</script>');
 await page.locator('button[type=submit]').click();await page.waitForFunction(()=>document.querySelector('#status').textContent.includes('saved'));
 await page.reload();assert.equal(await page.locator('#firstName').inputValue(),'Alex');assert.equal(await page.locator('.value').inputValue(),'<script>bad()</script>');
 await page.locator('.value').fill('I enjoy building useful software and learning from experienced engineers.');
 await page.screenshot({path:path.join(base,'tests','profile-preview.png'),fullPage:true});
 assert.deepEqual(errors,[]);
 console.log('PASS: scan, fill, event dispatch, preserve existing values, unknown/hidden fields, dropdown mismatch, dynamic autofill, undo preserving edits, stop, shadow roots, frames, profile save/reload.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

