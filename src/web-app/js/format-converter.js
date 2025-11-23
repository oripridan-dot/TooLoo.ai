// @version 2.1.11
(async function(){
  const $ = id => document.getElementById(id);
  $('convert').addEventListener('click', async ()=>{
    const content = $('content').value || '';
    const format = $('format').value || 'markdown';
    try{
      const r = await fetch('/api/v1/responses/convert', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ format, content }) });
      const j = await r.json();
      if (!j) return $('output').textContent = 'No response';
      if (j.ok === false) return $('output').textContent = 'Error: '+ (j.error||JSON.stringify(j));
      // display text property if available
      $('output').textContent = j.text || JSON.stringify(j, null, 2);
    }catch(e){ $('output').textContent = 'Request failed: '+e.message; }
  });
  $('copy').addEventListener('click', ()=>{
    const txt = $('output').textContent || '';
    navigator.clipboard?.writeText(txt).then(()=>alert('Copied to clipboard')).catch(()=>alert('Copy failed'));
  });
})();
