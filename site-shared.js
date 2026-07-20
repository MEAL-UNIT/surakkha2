// ============================================================
// SURAKKHA site — shared behavior
// nav highlight + incident menu + theme toggle + scroll reveal + CSV helpers
// ============================================================

// >>> UPDATE THIS with the real CFRM / incident WhatsApp number,
// in international format with no spaces or plus sign, e.g. "8801XXXXXXXXX"
const INCIDENT_WHATSAPP_LINK = "https://chat.whatsapp.com/EvvTtGIhEOy9pErSNMoRzx?s=cl&p=a&ilr=0";
const MEAL_CHAT_WHATSAPP_LINK = "https://wa.me/8801855677776";

function buildMealChatWidget(){
  const btn = document.createElement('a');
  btn.className = 'meal-chat-fab';
  btn.href = MEAL_CHAT_WHATSAPP_LINK;
  btn.target = '_blank';
  btn.rel = 'noopener';
  btn.setAttribute('aria-label', 'Chat with the MEAL Unit on WhatsApp');
  btn.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.5 8.5 0 0 1-12.44 7.53L3 20l1.06-5.4A8.5 8.5 0 1 1 21 11.5z"/></svg>
    <span>Chat with MEAL</span>`;
  document.body.appendChild(btn);
}

function highlightActiveNav(){
  const path = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.site-links a').forEach(a=>{
    const href = a.getAttribute('href');
    if(href === path) a.classList.add('active');
  });
}

function buildNavIndicator(){
  const links = document.querySelector('.site-links');
  const active = document.querySelector('.site-links a.active');
  if(!links || !active) return;

  const indicator = document.createElement('div');
  indicator.className = 'nav-indicator';
  links.appendChild(indicator);

  const position = ()=>{
    const linkBox = active.getBoundingClientRect();
    const wrapBox = links.getBoundingClientRect();
    indicator.style.left = (linkBox.left - wrapBox.left) + 'px';
    indicator.style.width = linkBox.width + 'px';
    requestAnimationFrame(()=> indicator.style.opacity = '1');
  };
  position();
  window.addEventListener('resize', position);
}

function buildAccountCluster(){
  const existing = document.getElementById('navAccountCluster');
  if(existing) return existing;
  const nav = document.querySelector('.site-nav-inner');
  if(!nav) return null;
  const cluster = document.createElement('div');
  cluster.id = 'navAccountCluster';
  cluster.className = 'nav-account-cluster';
  nav.appendChild(cluster);
  return cluster;
}

function buildMobileNavToggle(){
  const nav = document.querySelector('.site-nav-inner');
  const links = document.querySelector('.site-links');
  if(!nav || !links || document.getElementById('navHamburger')) return;

  const btn = document.createElement('button');
  btn.type = 'button';
  btn.id = 'navHamburger';
  btn.className = 'nav-hamburger';
  btn.setAttribute('aria-label', 'Toggle navigation menu');
  btn.setAttribute('aria-expanded', 'false');
  btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M3 6h18M3 12h18M3 18h18"/></svg>';
  nav.insertBefore(btn, links);

  btn.addEventListener('click', ()=>{
    const open = links.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
    btn.classList.toggle('open', open);
  });
}

// ---- Sitewide weather badge (nav) ----
const WEATHER_LOCATION = { lat: 21.4272, lon: 92.0058, label: "Cox's Bazar, Bangladesh" };
const WMO_ICONS = {
  0:['☀️','Clear sky'], 1:['🌤️','Mainly clear'], 2:['⛅','Partly cloudy'], 3:['☁️','Overcast'],
  45:['🌫️','Fog'], 48:['🌫️','Fog'],
  51:['🌦️','Light drizzle'], 53:['🌦️','Drizzle'], 55:['🌧️','Dense drizzle'],
  61:['🌧️','Light rain'], 63:['🌧️','Rain'], 65:['🌧️','Heavy rain'],
  66:['🌧️','Freezing rain'], 67:['🌧️','Freezing rain'],
  71:['🌨️','Light snow'], 73:['🌨️','Snow'], 75:['❄️','Heavy snow'],
  80:['🌦️','Rain showers'], 81:['🌧️','Rain showers'], 82:['⛈️','Violent showers'],
  95:['⛈️','Thunderstorm'], 96:['⛈️','Thunderstorm with hail'], 99:['⛈️','Severe thunderstorm']
};
const WEATHER_SEVERE_CODES = [65, 67, 82, 95, 96, 99];

// ---- Notification bell ----
async function buildNotificationBell(){
  const client = typeof sb === 'function' ? sb() : null;
  if(!client) return;
  const user = await getCurrentUser();
  if(!user || user.profile.status !== 'approved') return;

  const cluster = buildAccountCluster();
  if(!cluster || document.getElementById('notifBell')) return;

  const { data: notifications } = await client.from('notifications').select('*').eq('notify_all', true).order('created_at', { ascending: false }).limit(20);
  const { data: reads } = await client.from('notification_reads').select('notification_id').eq('user_id', user.authUser.id);
  const readIds = new Set((reads || []).map(r => r.notification_id));
  const unread = (notifications || []).filter(n => !readIds.has(n.id));

  const wrap = document.createElement('div');
  wrap.id = 'notifBell';
  wrap.className = 'notif-bell';
  wrap.innerHTML = `
    <button type="button" class="notif-bell-btn" id="notifBellBtn" aria-haspopup="true" aria-expanded="false">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>
      ${unread.length ? `<span class="notif-badge">${unread.length > 9 ? '9+' : unread.length}</span>` : ''}
    </button>
    <div class="notif-menu" id="notifMenu">
      <div class="notif-menu-title">Updates</div>
      <div class="notif-list" id="notifList">
        ${(notifications || []).length ? notifications.map(n => `
          <div class="notif-item ${readIds.has(n.id) ? '' : 'unread'}" data-id="${n.id}">
            <p>${n.message}</p>
            <span>${new Date(n.created_at).toLocaleString()}</span>
          </div>
        `).join('') : '<p class="notif-empty">No updates yet.</p>'}
      </div>
    </div>
  `;
  cluster.insertBefore(wrap, cluster.firstChild);

  const btn = document.getElementById('notifBellBtn');
  const menu = document.getElementById('notifMenu');
  btn.addEventListener('click', async ()=>{
    const open = menu.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
    if(open && unread.length){
      // Mark all currently-unread notifications as read
      for(const n of unread){
        await client.from('notification_reads').upsert({ notification_id: n.id, user_id: user.authUser.id }, { onConflict: 'notification_id,user_id' }).then(()=>{}).catch(()=>{});
      }
      const badge = wrap.querySelector('.notif-badge');
      if(badge) badge.remove();
      document.querySelectorAll('.notif-item.unread').forEach(el => el.classList.remove('unread'));
      unread.length = 0;
    }
  });
  document.addEventListener('click', (e)=>{
    if(!wrap.contains(e.target)) menu.classList.remove('open');
  });
}

function buildWeatherBadge(){
  const cluster = buildAccountCluster();
  if(!cluster || document.getElementById('navWeatherBadge')) return;

  const wrap = document.createElement('div');
  wrap.id = 'navWeatherBadge';
  wrap.className = 'nav-weather-badge';
  wrap.innerHTML = `
    <button type="button" class="nav-weather-btn" id="navWeatherBtn" aria-haspopup="true" aria-expanded="false">
      <span class="nav-weather-icon">…</span><span class="nav-weather-temp"></span>
    </button>
    <div class="nav-weather-popover" id="navWeatherPopover"></div>
  `;
  cluster.insertBefore(wrap, cluster.firstChild);

  const btn = document.getElementById('navWeatherBtn');
  const pop = document.getElementById('navWeatherPopover');
  btn.addEventListener('click', ()=>{
    const open = pop.classList.toggle('open');
    btn.setAttribute('aria-expanded', String(open));
  });
  document.addEventListener('click', (e)=>{
    if(!wrap.contains(e.target)) pop.classList.remove('open');
  });

  fetch(`https://api.open-meteo.com/v1/forecast?latitude=${WEATHER_LOCATION.lat}&longitude=${WEATHER_LOCATION.lon}&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m&daily=precipitation_sum&timezone=auto`)
    .then(res => { if(!res.ok) throw new Error('unavailable'); return res.json(); })
    .then(data=>{
      const cur = data.current;
      const [icon, desc] = WMO_ICONS[cur.weather_code] || ['❔','Unknown'];
      const isSevere = WEATHER_SEVERE_CODES.includes(cur.weather_code);
      wrap.querySelector('.nav-weather-icon').textContent = icon;
      wrap.querySelector('.nav-weather-temp').textContent = Math.round(cur.temperature_2m) + '°C';
      if(isSevere) btn.classList.add('severe');

      const warnLine = isSevere
        ? `<div class="nav-weather-warn">⚠ ${desc} — take precautions for field activities</div>` : '';
      pop.innerHTML = `
        <div class="nav-weather-loc">${WEATHER_LOCATION.label}</div>
        <div class="nav-weather-main"><span>${icon}</span><strong>${Math.round(cur.temperature_2m)}°C</strong><span class="nw-desc">${desc}</span></div>
        <div class="nav-weather-stats">
          <span>Feels like ${Math.round(cur.apparent_temperature)}°C</span>
          <span>Humidity ${cur.relative_humidity_2m}%</span>
          <span>Wind ${Math.round(cur.wind_speed_10m)} km/h</span>
          <span>Rain today ${data.daily.precipitation_sum ? data.daily.precipitation_sum[0] : 0}mm</span>
        </div>
        ${warnLine}
      `;
    })
    .catch(()=>{
      wrap.querySelector('.nav-weather-icon').textContent = '—';
      pop.innerHTML = '<div class="nav-weather-loc">Weather unavailable</div>';
    });
}

function addBrandTooltip(){
  const brand = document.querySelector('.site-brand');
  if(!brand) return;
  const b1 = brand.querySelector('.b1');
  const b2 = brand.querySelector('.b2');
  if(b1 && b2) brand.title = b1.textContent + ' — ' + b2.textContent;
}

function addRegisterLink(){
  const links = document.querySelector('.site-links');
  if(!links || links.querySelector('a[href="register.html"]')) return;
  const a = document.createElement('a');
  a.href = 'register.html';
  a.textContent = 'Register';
  if((location.pathname.split('/').pop() || 'index.html') === 'register.html'){
    a.classList.add('active');
  }
  links.appendChild(a);
}

function addCapacityBuildingLink(){
  const links = document.querySelector('.site-links');
  if(!links || links.querySelector('a[href="orientation.html"]')) return;
  const a = document.createElement('a');
  a.href = 'orientation.html';
  a.textContent = 'Capacity Building';
  const current = location.pathname.split('/').pop() || 'index.html';
  if(current === 'orientation.html' || current.startsWith('exam-')){
    a.classList.add('active');
  }
  // Insert before Register so Register stays last, if Register is present
  const registerLink = links.querySelector('a[href="register.html"]');
  if(registerLink) links.insertBefore(a, registerLink);
  else links.appendChild(a);
}

function addGalleryLink(){
  const links = document.querySelector('.site-links');
  if(!links || links.querySelector('a[href="gallery.html"]')) return;
  const a = document.createElement('a');
  a.href = 'gallery.html';
  a.textContent = 'Gallery';
  if((location.pathname.split('/').pop() || 'index.html') === 'gallery.html'){
    a.classList.add('active');
  }
  const registerLink = links.querySelector('a[href="register.html"]');
  if(registerLink) links.insertBefore(a, registerLink);
  else links.appendChild(a);
}

function buildIncidentWidget(){
  const fab = document.createElement('button');
  fab.className = 'incident-fab';
  fab.type = 'button';
  fab.setAttribute('aria-label', 'Report an incident or share urgent information');
  fab.setAttribute('aria-expanded', 'false');
  fab.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>';

  const menu = document.createElement('div');
  menu.className = 'incident-menu';
  menu.id = 'incidentMenu';
  menu.innerHTML = `
    <div class="im-head">Report an Incident</div>
    <a href="fivdb-incident-report.html">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M9 13h6M9 17h6"/></svg>
      <span>Safeguarding / PSEA Incident<span class="sub">Annexure A3 — confidential</span></span>
    </a>
    <a href="fivdb-general-incident-report.html">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M12 9v4M12 17h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>
      <span>General Incident<span class="sub">Security, accident, fire, theft, etc.</span></span>
    </a>
    <a href="incident-notify.html">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><path d="M21 11.5a8.5 8.5 0 0 1-12.44 7.53L3 20l1.06-5.4A8.5 8.5 0 1 1 21 11.5z"/></svg>
      <span>Immediate Information Share<span class="sub">Send a quick notification to MEAL</span></span>
    </a>`;

  let closeTimer = null;
  function openMenu(){
    menu.classList.add('open');
    requestAnimationFrame(()=> menu.classList.add('show'));
    fab.setAttribute('aria-expanded', 'true');
  }
  function closeMenu(){
    menu.classList.remove('show');
    fab.setAttribute('aria-expanded', 'false');
    clearTimeout(closeTimer);
    closeTimer = setTimeout(()=> menu.classList.remove('open'), 180);
  }

  fab.addEventListener('click', ()=>{
    if(menu.classList.contains('open')) closeMenu(); else openMenu();
  });
  document.addEventListener('click', (e)=>{
    if(menu.classList.contains('open') && !menu.contains(e.target) && e.target !== fab && !fab.contains(e.target)){
      closeMenu();
    }
  });

  document.body.appendChild(fab);
  document.body.appendChild(menu);
}

// ---- Dark mode toggle ----
function applyStoredTheme(){
  let theme = 'light';
  try{ theme = localStorage.getItem('surakkha-theme') || 'light'; }catch(e){ /* storage unavailable */ }
  if(theme === 'dark') document.documentElement.setAttribute('data-theme', 'dark');
}

// Shows the login card. blocking=true adds the full-page blur (used by
// enforceStaffGate); blocking=false shows it as a plain popover (used by
// the always-visible Login button).
function showLoginPrompt(blocking){
  if(document.querySelector('.staff-gate-overlay')) return;

  const overlay = document.createElement('div');
  overlay.className = 'staff-gate-overlay' + (blocking ? '' : ' popover-mode');
  overlay.innerHTML = `
    <div class="staff-gate-card">
      <button type="button" class="staff-gate-close" id="staffGateCancel" aria-label="Close">✕</button>
      <h2>Access</h2>
      <p id="staffGateIntro">This section requires Reporting access. Log in with the access name and access code you registered with.</p>
      <input type="email" id="staffGateUser" placeholder="Access Name" autocomplete="username">
      <div class="pw-field-wrap">
        <input type="password" id="staffGateInput" placeholder="Access Code" autocomplete="current-password">
        <button type="button" class="pw-toggle-btn" id="staffGateToggle" aria-label="Show access code">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
      </div>
      <div class="staff-gate-actions">
        <button type="button" id="staffGateSubmit">Log in</button>
        <a href="register.html">Not registered yet?</a>
      </div>
      <button type="button" class="staff-gate-forgot" id="staffGateForgot">Forgot your access code?</button>
      <p class="staff-gate-error" id="staffGateError"></p>
      <p class="staff-gate-fineprint" id="staffGateFineprint">Your login is checked against SURAKKHA's account system — approved staff only. If you've just registered, your account needs MEAL's approval before you can log in.</p>
    </div>`;
  document.body.appendChild(overlay);
  if(blocking) document.body.classList.add('staff-gate-blurred');

  const closeOverlay = ()=>{
    if(blocking){
      // On a gated page, closing without logging in means leaving —
      // never just unblur and expose the content underneath.
      location.href = 'index.html';
      return;
    }
    overlay.remove();
    document.body.classList.remove('staff-gate-blurred');
  };
  document.getElementById('staffGateCancel').addEventListener('click', closeOverlay);

  if(!blocking){
    overlay.addEventListener('click', (e)=>{ if(e.target === overlay) closeOverlay(); });
  }

  document.getElementById('staffGateToggle').addEventListener('click', ()=>{
    const input = document.getElementById('staffGateInput');
    input.type = input.type === 'password' ? 'text' : 'password';
  });

  document.getElementById('staffGateForgot').addEventListener('click', async ()=>{
    const email = document.getElementById('staffGateUser').value.trim();
    const errEl = document.getElementById('staffGateError');
    if(!email){
      errEl.textContent = 'Enter your access name (email) above first, then tap "Forgot your access code?" again.';
      document.getElementById('staffGateUser').focus();
      return;
    }
    const forgotBtn = document.getElementById('staffGateForgot');
    forgotBtn.disabled = true; forgotBtn.textContent = 'Sending…';
    try{
      await requestPasswordReset(email);
      document.getElementById('staffGateIntro').textContent = `A reset link has been sent to ${email} — open it to set a new access code, then come back and log in.`;
      errEl.textContent = '';
      document.getElementById('staffGateFineprint').style.display = 'none';
    }catch(err){
      errEl.textContent = err.message || 'Could not send a reset link — check the email address.';
    }
    forgotBtn.disabled = false; forgotBtn.textContent = 'Forgot your access code?';
  });

  const submit = async ()=>{
    const email = document.getElementById('staffGateUser').value.trim();
    const password = document.getElementById('staffGateInput').value;
    const errEl = document.getElementById('staffGateError');
    const btn = document.getElementById('staffGateSubmit');
    btn.disabled = true; btn.textContent = 'Checking…';
    try{
      await loginAccount(email, password);
      const user = await getCurrentUser();
      if(!user){
        errEl.textContent = 'Login succeeded, but your profile could not be loaded — contact MEAL.';
      } else if(user.profile.status !== 'approved'){
        errEl.textContent = 'Your account exists but hasn\'t been approved yet — check with MEAL.';
        await logoutAccount();
      } else {
        location.reload();
        return;
      }
    }catch(err){
      errEl.textContent = err.message || 'That access name or access code isn\'t right.';
    }
    btn.disabled = false; btn.textContent = 'Log in';
  };
  document.getElementById('staffGateSubmit').addEventListener('click', submit);
  document.getElementById('staffGateInput').addEventListener('keydown', e=>{ if(e.key === 'Enter') submit(); });
  document.getElementById('staffGateUser').addEventListener('keydown', e=>{ if(e.key === 'Enter') document.getElementById('staffGateInput').focus(); });
  document.getElementById('staffGateUser').focus();
}

async function buildUserBadge(){
  const cluster = buildAccountCluster();
  if(!cluster || document.getElementById('userBadge')) return;

  const user = await getCurrentUser();
  const approved = !!(user && user.profile.status === 'approved');

  const wrap = document.createElement('div');
  wrap.id = 'userBadge';
  wrap.className = 'user-badge';

  if(approved){
    wrap.innerHTML = `
      <button type="button" class="user-badge-btn" id="userBadgeBtn" aria-haspopup="true" aria-expanded="false">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>
        <span>${(user.profile.full_name || 'Staff').split(' ')[0]}</span>
        <svg class="chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4"><path d="m6 9 6 6 6-6"/></svg>
      </button>
      <div class="user-badge-menu" id="userBadgeMenu">
        ${user.profile.role === 'admin' ? '<a href="admin.html">Admin panel</a>' : ''}
        <button type="button" id="userBadgeLogout">Log out</button>
      </div>
    `;
    cluster.appendChild(wrap);

    const btn = document.getElementById('userBadgeBtn');
    const menu = document.getElementById('userBadgeMenu');
    btn.addEventListener('click', ()=>{
      const open = menu.classList.toggle('open');
      btn.setAttribute('aria-expanded', String(open));
    });
    document.addEventListener('click', (e)=>{
      if(!wrap.contains(e.target)) menu.classList.remove('open');
    });
    document.getElementById('userBadgeLogout').addEventListener('click', async ()=>{
      await logoutAccount();
      location.reload();
    });
  } else {
    wrap.innerHTML = `
      <button type="button" class="user-badge-btn login-btn" id="userBadgeBtn">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/></svg>
        <span>Login</span>
      </button>
    `;
    cluster.appendChild(wrap);
    document.getElementById('userBadgeBtn').addEventListener('click', ()=> showLoginPrompt(false));
  }
}

function buildThemeToggle(){
  const cluster = buildAccountCluster() || document.querySelector('.site-nav-inner');
  if(!cluster) return;
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'theme-toggle';
  btn.setAttribute('aria-label', 'Toggle dark mode');
  const sun = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><circle cx="12" cy="12" r="4.5"/><path d="M12 2v2.5M12 19.5V22M4.2 4.2l1.8 1.8M18 18l1.8 1.8M2 12h2.5M19.5 12H22M4.2 19.8 6 18M18 6l1.8-1.8"/></svg>';
  const moon = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.3"><path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5z"/></svg>';

  function render(){
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    btn.innerHTML = (isDark ? sun : moon) + '<span>' + (isDark ? 'Light' : 'Dark') + '</span>';
  }
  render();

  btn.addEventListener('click', ()=>{
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    if(isDark){
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', 'dark');
    }
    try{ localStorage.setItem('surakkha-theme', isDark ? 'light' : 'dark'); }catch(e){ /* storage unavailable */ }
    render();
  });

  cluster.appendChild(btn);
}

// ---- Scroll reveal ----
// Auto-applies to common card/section selectors so individual pages
// don't need extra markup. Respects prefers-reduced-motion via CSS.
function initScrollReveal(){
  const revealSelectors = '.qcard, .channel-card, .info-card, .contact-card, .stat-card, .notice-item, .book, .drawer, .coming-soon, .prose';
  const liftSelectors = '.qcard, .channel-card, .info-card, .contact-card, .stat-card, .notice-item, .coming-soon';
  const els = document.querySelectorAll(revealSelectors);
  if(!els.length) return;
  els.forEach(el => el.classList.add('reveal'));
  document.querySelectorAll(liftSelectors).forEach(el => el.classList.add('liftable'));

  if(!('IntersectionObserver' in window)){
    els.forEach(el => el.classList.add('in-view'));
    return;
  }
  const io = new IntersectionObserver((entries)=>{
    entries.forEach((entry, i)=>{
      if(entry.isIntersecting){
        setTimeout(()=> entry.target.classList.add('in-view'), i * 40);
        io.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });
  els.forEach(el => io.observe(el));
}

// Re-runs reveal for elements added after initial load (e.g. CSV-rendered
// cards). Call this after any dynamic render function.
function refreshScrollReveal(){
  initScrollReveal();
}

// ---- Shared CSV helpers ----
function parseCSV(text){
  const rows = [];
  let row = [], field = '', inQuotes = false;
  for(let i = 0; i < text.length; i++){
    const c = text[i], next = text[i+1];
    if(inQuotes){
      if(c === '"' && next === '"'){ field += '"'; i++; }
      else if(c === '"'){ inQuotes = false; }
      else { field += c; }
    } else {
      if(c === '"'){ inQuotes = true; }
      else if(c === ','){ row.push(field); field = ''; }
      else if(c === '\n' || c === '\r'){
        if(field !== '' || row.length){ row.push(field); rows.push(row); row = []; field = ''; }
        if(c === '\r' && next === '\n') i++;
      } else { field += c; }
    }
  }
  if(field !== '' || row.length){ row.push(field); rows.push(row); }
  return rows.filter(r => r.some(v => v.trim() !== ''));
}

function fetchCSV(path){
  return fetch(path)
    .then(res => {
      if(!res.ok) throw new Error(`${path} not found`);
      return res.text();
    })
    .then(text => {
      const rows = parseCSV(text);
      const header = rows.shift().map(h => h.trim().toLowerCase());
      return rows.map(r=>{
        const o = {};
        header.forEach((h,i) => o[h] = (r[i] || '').trim());
        return o;
      });
    });
}

function csvLoadError(hostEl, err, itemLabel){
  hostEl.innerHTML = `<p style="font-size:13px; color:var(--muted); font-style:italic; padding:14px;">
    ${itemLabel} could not be loaded (${err.message}). If you're viewing this file directly on your
    computer rather than through the published site, browsers block this kind of file loading —
    it will work correctly once published on GitHub Pages.</p>`;
}

// applyStoredTheme runs immediately (before DOMContentLoaded) to avoid a
// flash of the wrong theme on page load.
applyStoredTheme();

// ---- Update notification ----
// Watches the CSV files a page depends on; if any changes (someone
// updates content and re-publishes), shows a small banner prompting
// a reload. Call watchForUpdates(['notices.csv', ...]) from a page.
let _watchedSnapshots = null;
function watchForUpdates(csvPaths, intervalMs){
  intervalMs = intervalMs || 45000;
  if(!csvPaths || !csvPaths.length) return;

  const snapshot = ()=> Promise.all(
    csvPaths.map(p => fetch(p, { cache: 'no-store' }).then(r => r.ok ? r.text() : null).catch(()=> null))
  );

  snapshot().then(initial => { _watchedSnapshots = initial; });

  setInterval(()=>{
    if(document.hidden) return; // don't poll while tab isn't visible
    snapshot().then(latest=>{
      if(!_watchedSnapshots) { _watchedSnapshots = latest; return; }
      const changed = latest.some((text, i) => text !== null && text !== _watchedSnapshots[i]);
      if(changed) showReloadBanner();
    });
  }, intervalMs);
}

// ---- Staff-only content notice ----
// This is a label, not a lock — the page underneath is still fully
// viewable. It exists to be honest with visitors about which parts
// of the site are meant for registered staff, since this site has no
// way to actually restrict access (see register.html).
// ---- Staff access gate ----
// >>> Add one entry per approved person here — this list is what the
// login actually checks. Keep it here, NOT in registrations.csv:
// that CSV is meant to be publicly viewable on GitHub (like every
// other CSV on this site), so putting real access codes in it would
// hand out working logins, right next to people's real contact
// details, to anyone who opens the file.
async function enforceStaffGate(){
  const user = await getCurrentUser();
  if(user && user.profile.status === 'approved') return;
  showLoginPrompt(true);
}

async function showStaffOnlyNotice(){
  const user = await getCurrentUser();
  if(user && user.profile.status === 'approved') return;
  const nav = document.querySelector('.site-nav');
  if(!nav || document.getElementById('staffOnlyNotice')) return;
  const bar = document.createElement('div');
  bar.id = 'staffOnlyNotice';
  bar.className = 'staff-only-notice';
  bar.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
    <span>This section requires Reporting access. Not registered yet? <a href="register.html">Request access</a>.</span>
  `;
  nav.insertAdjacentElement('afterend', bar);
}

function showReloadBanner(){
  if(document.getElementById('reloadBanner')) return; // already showing
  const bar = document.createElement('div');
  bar.id = 'reloadBanner';
  bar.className = 'reload-banner';
  bar.innerHTML = `
    <span>This page has been updated. Reload to see the latest version.</span>
    <button type="button" onclick="location.reload()">Reload now</button>
    <button type="button" class="dismiss" onclick="this.parentElement.remove()" aria-label="Dismiss">✕</button>
  `;
  document.body.appendChild(bar);
}

document.addEventListener('DOMContentLoaded', ()=>{
  highlightActiveNav();
  buildNavIndicator();
  buildMobileNavToggle();
  addRegisterLink();
  addCapacityBuildingLink();
  addGalleryLink();
  addBrandTooltip();
  buildIncidentWidget();
  buildMealChatWidget();
  buildUserBadge();
  buildWeatherBadge();
  buildNotificationBell();
  buildThemeToggle();
  initScrollReveal();
});
