// ============================================================
// SURAKKHA exam engine — shared by every topic exam page.
// A page defines TOPIC_TITLE, TOPIC_SOURCE, and QUESTIONS (10 MCQ +
// 7 fact-based True/False + 3 narrative), then calls initExam().
// ============================================================

function initExam(config){
  const { title, source, questions, moduleContent, moduleSource } = config;
  const mcq = questions.filter(q => q.type === 'mcq');
  const fact = questions.filter(q => q.type === 'fact');
  const narrative = questions.filter(q => q.type === 'narrative');
  const scored = [...mcq, ...fact]; // narrative isn't auto-gradable — see note in UI

  const moduleHost = document.getElementById('moduleHost');
  const examSection = document.getElementById('examSection');

  function renderModuleAndExam(){
    if(moduleHost && moduleContent){
      moduleHost.innerHTML = `
        <div class="study-module">
          ${moduleContent}
          ${moduleSource ? `<p class="module-source">Source: ${moduleSource}</p>` : ''}
          <button type="button" class="study-unlock-btn" id="studyUnlockBtn">I've read this — Unlock the Exam</button>
        </div>
      `;
      document.getElementById('studyUnlockBtn').addEventListener('click', ()=>{
        moduleHost.querySelector('.study-module').classList.add('done');
        document.getElementById('studyUnlockBtn').textContent = '✓ Module complete';
        document.getElementById('studyUnlockBtn').disabled = true;
        examSection.classList.add('unlocked');
        examSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
        renderExam();
      });
    } else {
      renderExam();
    }
  }

  // Check whether this user already passed this topic in a previous
  // session — if so, show that instead of making them redo it.
  (async ()=>{
    try{
      const client = typeof sb === 'function' ? sb() : null;
      if(client){
        const user = await getCurrentUser();
        if(user){
          const { data } = await client.from('progress').select('*').eq('user_id', user.authUser.id).eq('topic', title).single();
          if(data){
            moduleHost.innerHTML = `
              <div class="study-module done">
                <h3>✓ Already completed</h3>
                <p>You passed this module on ${new Date(data.completed_at).toLocaleDateString()} with a score of ${data.score}%. No need to redo it — head back to the <a href="orientation.html">Capacity Building page</a> to check your overall progress or generate your certificate once all six are done.</p>
              </div>
            `;
            examSection.style.display = 'none';
            return;
          }
        }
      }
    }catch(e){ console.warn('Could not check prior progress:', e); }
    renderModuleAndExam();
  })();

  const host = document.getElementById('examHost');

  function renderSection(list, heading, hint){
    if(!list.length) return '';
    return `
      <h2 class="exam-section-title">${heading}</h2>
      <p class="exam-section-hint">${hint}</p>
      ${list.map(q => renderQuestion(q)).join('')}
    `;
  }

  function renderQuestion(q){
    if(q.type === 'narrative'){
      return `
        <div class="exam-q" data-id="${q.id}">
          <p class="exam-q-text">${q.text}</p>
          <textarea class="exam-narrative" data-id="${q.id}" rows="4" placeholder="Write your answer..."></textarea>
        </div>`;
    }
    const options = q.type === 'fact' ? ['True', 'False'] : q.options;
    return `
      <div class="exam-q" data-id="${q.id}">
        <p class="exam-q-text">${q.text}</p>
        <div class="exam-options">
          ${options.map((opt, i) => `
            <label class="exam-option">
              <input type="radio" name="q-${q.id}" value="${i}">
              <span>${opt}</span>
            </label>`).join('')}
        </div>
      </div>`;
  }

  function renderExam(){
  host.innerHTML = `
    ${renderSection(mcq, 'Multiple Choice', 'Choose the one best answer for each question.')}
    ${renderSection(fact, 'Fact Check', 'Mark each statement True or False based on the policy.')}
    ${renderSection(narrative, 'Short Answer', "These aren't auto-scored — they're for your own reflection and are included in what you submit, but only the questions above count toward your percentage.")}
    <div class="exam-submit-row">
      <button type="button" id="examSubmitBtn">Submit &amp; See My Score</button>
    </div>
    <div class="exam-result" id="examResult"></div>
  `;

  const ALL_TOPICS = ['Child Safeguarding', 'PSEA', 'Code of Conduct', 'Data Protection', 'Fraud Control & Anti-Corruption', 'Organizational Policy & Procedure'];

  document.getElementById('examSubmitBtn').addEventListener('click', async ()=>{
    let unanswered = [];
    scored.forEach(q=>{
      const sel = document.querySelector(`input[name="q-${q.id}"]:checked`);
      if(!sel) unanswered.push(q.id);
    });
    let emptyNarrative = [];
    narrative.forEach(q=>{
      const val = document.querySelector(`textarea[data-id="${q.id}"]`).value.trim();
      if(!val) emptyNarrative.push(q.id);
    });

    if(unanswered.length || emptyNarrative.length){
      const first = document.querySelector(`[data-id="${unanswered[0] || emptyNarrative[0]}"]`);
      if(first) first.scrollIntoView({ behavior: 'smooth', block: 'center' });
      document.getElementById('examResult').innerHTML =
        `<p class="exam-warn">Please answer every question (including the short-answer ones) before submitting.</p>`;
      return;
    }

    let correct = 0;
    scored.forEach(q=>{
      const sel = document.querySelector(`input[name="q-${q.id}"]:checked`);
      if(parseInt(sel.value, 10) === q.correct) correct++;
    });
    const pct = Math.round((correct / scored.length) * 100);
    const passed = pct >= 75;

    let progressSaved = false, allComplete = false, completedCount = 0;
    if(passed){
      try{
        const client = typeof sb === 'function' ? sb() : null;
        if(client){
          const user = await getCurrentUser();
          if(user){
            const { error } = await client.from('progress').upsert({
              user_id: user.authUser.id, topic: title, score: pct, passed: true,
            }, { onConflict: 'user_id,topic' });
            if(!error){
              progressSaved = true;
              const { data: rows } = await client.from('progress').select('topic').eq('user_id', user.authUser.id);
              completedCount = rows ? rows.length : 0;
              allComplete = completedCount >= ALL_TOPICS.length;
            }
          }
        }
      }catch(e){ console.warn('Could not save progress:', e); }
    }

    document.getElementById('examResult').innerHTML = `
      <div class="exam-score-panel ${passed ? 'pass' : 'fail'}">
        <div class="exam-score-num">${pct}%</div>
        <div class="exam-score-label">${correct} of ${scored.length} scored questions correct</div>
        <div class="exam-score-verdict">${passed ? '✓ Passed — this module is complete' : '✗ Below 75% — review the material and try again'}</div>
        ${passed ? `
          <p style="font-size:12.5px; color:rgba(255,255,255,.9); margin-top:8px;">
            ${progressSaved
              ? (allComplete
                  ? '🎉 All 6 modules complete! Head to the <a href="orientation.html" style="color:#fff; text-decoration:underline;">Capacity Building page</a> to generate your certificate.'
                  : `Progress saved — ${completedCount} of ${ALL_TOPICS.length} modules complete. Certificates are issued once all six are done, from the <a href="orientation.html" style="color:#fff; text-decoration:underline;">Capacity Building page</a>.`)
              : 'Passed! (Progress could not be saved to your account — make sure you\'re logged in.)'}
          </p>
        ` : ''}
      </div>
    `;
  });
  }
}

// ============================================================
// Final certificate — called from orientation.html once all six
// topics show up in the user's progress record. One certificate
// covering all six modules, not one per topic.
// ============================================================
function centerTextAt(pg, cx, y, text, font, size, color){
  const width = font.widthOfTextAtSize(text, size);
  pg.drawText(text, { x: cx - width / 2, y, size, font, color });
}

async function buildFinalCertificate(name, topics){
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([792, 612]);
  const serif = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const serifItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);
  const sans = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const sansBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const NAVY = rgb(0.122, 0.220, 0.392);
  const TEAL = rgb(0.180, 0.490, 0.420);
  const GOLD = rgb(0.784, 0.635, 0.204);
  const MUTED = rgb(0.4, 0.4, 0.4);
  const W = 792, H = 612;

  page.drawRectangle({ x: 18, y: 18, width: W - 36, height: H - 36, borderColor: GOLD, borderWidth: 2 });
  page.drawRectangle({ x: 26, y: 26, width: W - 52, height: H - 52, borderColor: NAVY, borderWidth: 1 });

  const centerText = (text, y, font, size, color) => centerTextAt(page, W / 2, y, text, font, size, color);

  centerText('SURAKKHA PROJECT', H - 80, sansBold, 13, TEAL);
  centerText('Friends In Village Development Bangladesh (FIVDB)', H - 98, sans, 10, MUTED);
  centerText('Certificate of Completion', H - 150, serif, 30, NAVY);
  centerText('Capacity Building Orientation', H - 178, serifItalic, 15, MUTED);
  centerText('This certifies that', H - 225, sans, 12, MUTED);
  centerText(name, H - 262, serif, 26, NAVY);
  centerText('has successfully completed orientation on the following FIVDB policies:', H - 300, sans, 12, MUTED);

  const mid = Math.ceil(topics.length / 2);
  const line1 = topics.slice(0, mid).join('  •  ');
  const line2 = topics.slice(mid).join('  •  ');
  centerText(line1, H - 320, sansBold, 11, NAVY);
  centerText(line2, H - 338, sansBold, 11, NAVY);

  const dateStr = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  centerText('Date: ' + dateStr, H - 370, sans, 11, MUTED);

  page.drawLine({ start: { x: 160, y: 110 }, end: { x: 340, y: 110 }, thickness: 1, color: MUTED });
  centerTextAt(page, 250, 92, 'MEAL Focal Person', sans, 10, MUTED);
  page.drawLine({ start: { x: 452, y: 110 }, end: { x: 632, y: 110 }, thickness: 1, color: MUTED });
  centerTextAt(page, 542, 92, 'Project Lead', sans, 10, MUTED);

  const bytes = await pdfDoc.save();
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `SURAKKHA_Orientation_Certificate_${name.replace(/\s+/g,'_')}.pdf`;
  link.click();
}
