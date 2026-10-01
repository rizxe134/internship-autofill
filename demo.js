document.getElementById('reveal').onclick=()=>{
  if(document.querySelector('#extra textarea'))return;
  const label=document.createElement('label');label.textContent='Why are you interested in this internship?';
  label.append(document.createElement('textarea'));document.getElementById('extra').append(label);
};
