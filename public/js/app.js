(function(){
  const form = document.getElementById('form');
  const urlInput = document.getElementById('link');
  const convertBtn = document.getElementById('convert-btn');
  const progressWrap = document.getElementById('progress-wrap');
  const progressBar = document.getElementById('progress');
  const previewWrap = document.getElementById('preview-wrap');
  const previewTitle = document.getElementById('preview-title');
  const previewThumb = document.getElementById('preview-thumb');
  const resultWrap = document.getElementById('result-wrap');
  const resultTitle = document.getElementById('result-title');
  const resultSize = document.getElementById('result-size');
  const resultDownload = document.getElementById('result-download');
  const resultAlert = document.getElementById('result-alert');
  const themeToggle = document.getElementById('theme-toggle');

  function isYouTubeUrl(url){
    const re = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+$/i;
    return re.test(url);
  }

  function animateProgress(durationMs){
    if(!progressWrap || !progressBar) return;
    progressWrap.hidden = false;
    progressBar.style.width = '0%';
    progressBar.setAttribute('aria-valuenow','0');
    let start;
    function step(ts){
      if(!start) start = ts;
      const elapsed = ts - start;
      // ease to 90% max, leave room to complete on finish
      const pct = Math.min(90, Math.round((elapsed / durationMs) * 90));
      progressBar.style.width = pct + '%';
      progressBar.setAttribute('aria-valuenow', String(pct));
      if(pct < 90) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  function completeProgress(){
    if(!progressBar || !progressWrap) return;
    progressBar.style.width = '100%';
    progressBar.setAttribute('aria-valuenow','100');
    setTimeout(()=>{ progressWrap.hidden = true; }, 600);
  }

  async function fetchOEmbed(url){
    if(!isYouTubeUrl(url)) { previewWrap.hidden = true; return; }
    try{
      const endpoint = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const res = await fetch(endpoint, { headers: { 'Accept':'application/json' } });
      if(!res.ok) throw new Error('oEmbed error');
      const data = await res.json();
      previewTitle.textContent = data.title || '';
      previewThumb.src = data.thumbnail_url || '';
      previewThumb.alt = data.title ? `Thumbnail for ${data.title}` : 'Video thumbnail';
      previewWrap.hidden = false;
    }catch(e){
      previewWrap.hidden = true;
    }
  }

  if(urlInput){
    urlInput.addEventListener('input', (e)=>{
      const v = e.target.value.trim();
      fetchOEmbed(v);
    });
  }

  if(form){
    form.addEventListener('submit', async (e)=>{
      e.preventDefault();
      const videoLink = urlInput.value.trim();
      if(!isYouTubeUrl(videoLink)){
        resultAlert.textContent = 'Please enter a valid YouTube link.';
        resultAlert.hidden = false;
        return;
      }
      resultAlert.hidden = true;
      animateProgress(4500);
      convertBtn.disabled = true;
      try{
        const res = await fetch('/convert-mp3', {
          method: 'POST',
          headers: { 'Content-Type':'application/x-www-form-urlencoded;charset=UTF-8', 'Accept':'application/json' },
          body: new URLSearchParams({ videoLink }).toString()
        });
        const data = await res.json();
        completeProgress();
        convertBtn.disabled = false;
        if(data && data.success){
          resultTitle.textContent = data.song_title || '';
          resultSize.textContent = data.song_size || '';
          resultDownload.href = data.song_link || '#';
          resultWrap.hidden = false;
          resultAlert.hidden = true;
          resultDownload.focus();
        } else {
          resultWrap.hidden = true;
          resultAlert.textContent = (data && data.message) ? data.message : 'Conversion failed.';
          resultAlert.hidden = false;
        }
      }catch(err){
        completeProgress();
        convertBtn.disabled = false;
        resultWrap.hidden = true;
        resultAlert.textContent = 'Server error. Please try again later.';
        resultAlert.hidden = false;
      }
    });
  }

  if(themeToggle){
    themeToggle.addEventListener('click', ()=>{
      const isDark = document.body.classList.toggle('theme-dark');
      themeToggle.setAttribute('aria-pressed', String(isDark));
      try{ localStorage.setItem('yt2mp3-theme', isDark ? 'dark' : 'light'); }catch(_){/* ignore */}
    });
    try{
      const pref = localStorage.getItem('yt2mp3-theme');
      if(pref === 'dark') document.body.classList.add('theme-dark');
      if(pref === 'light') document.body.classList.remove('theme-dark');
    }catch(_){/* ignore */}
  }

  // Smooth scroll for in-page links
  document.querySelectorAll('a[href^="#"]').forEach(a=>{
    a.addEventListener('click', (e)=>{
      const id = a.getAttribute('href');
      const el = document.querySelector(id);
      if(el){
        e.preventDefault();
        el.scrollIntoView({ behavior:'smooth', block:'start' });
      }
    });
  });

  // Footer year
  const yearEl = document.getElementById('year');
  if(yearEl){ yearEl.textContent = String(new Date().getFullYear()); }
})();
