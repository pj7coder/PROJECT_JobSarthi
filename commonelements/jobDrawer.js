/**
 * JobSarthi – Shared Job Details Drawer Component
 * Injected into: seeker/index.html, seeker/jobs.html
 * Usage: call window.JobDrawer.open(job, jobsArray, options) to open
 * options: { onSave, onApply, getMatchScore, getSkillsMatchInfo, getJobLogoHtml }
 */

(function () {
  'use strict';

  // ── Helpers ────────────────────────────────────────────────────────────────

  /** Robustly decode HTML entities (handles double-encoded text). */
  function decodeHtml(html) {
    if (!html) return '';
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    let decoded = txt.value;
    let limit = 5;
    while (limit > 0 && (decoded.includes('&lt;') || decoded.includes('&gt;') || decoded.includes('&amp;') || decoded.includes('&#') || decoded.includes('&quot;'))) {
      txt.innerHTML = decoded;
      decoded = txt.value;
      limit--;
    }
    return decoded;
  }

  /** Convert raw description to clean readable plain text, stripping all tags. */
  function sanitizeDescription(raw) {
    if (!raw) return 'No description provided.';
    
    // First, decode HTML entities completely
    let decoded = decodeHtml(raw);
    
    // Parse the HTML structure
    const wrapper = document.createElement('div');
    wrapper.innerHTML = decoded;
    
    // Append newlines to block elements to preserve line breaks
    wrapper.querySelectorAll('p, div, li, br, h1, h2, h3, h4, h5, h6').forEach(el => {
      el.insertAdjacentText('afterend', '\n');
    });
    
    // Extract the text content
    let text = (wrapper.textContent || wrapper.innerText || '').trim();
    
    // Remove excessive consecutive blank lines
    text = text.replace(/\n{3,}/g, '\n\n');
    return text;
  }

  // ── Drawer HTML Template ────────────────────────────────────────────────────

  const DRAWER_HTML = `
  <div class="drawer-overlay" id="jd_detailDrawer" onclick="window.JobDrawer._overlayClick(event)">
    <div class="drawer-content" onclick="event.stopPropagation()">
      
      <!-- Header -->
      <div class="drawer-header">
        <div style="display:flex;align-items:center;gap:12px;min-width:0;flex:1;">
          <div class="job-card-logo" id="jd_logo" style="font-size:1.8rem;width:48px;height:48px;flex-shrink:0;">💼</div>
          <div style="min-width:0;">
            <h2 id="jd_title" style="font-size:1.2rem;color:var(--text-main);margin:0;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">Job Title</h2>
            <div id="jd_company" style="color:var(--accent-secondary);font-size:0.88rem;font-weight:600;">Company</div>
            <div id="jd_meta" style="display:flex;gap:12px;flex-wrap:wrap;margin-top:4px;font-size:0.78rem;color:var(--text-muted);"></div>
          </div>
        </div>
        <div style="display:flex;align-items:center;gap:8px;flex-shrink:0;">
          <!-- Close -->
          <button onclick="window.JobDrawer.close()" style="padding:6px 12px;font-size:0.8rem;display:flex;align-items:center;gap:5px;border:1px solid var(--border-subtle);background:transparent;cursor:pointer;border-radius:6px;color:var(--text-main);">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            Close
          </button>
        </div>
      </div>

      <!-- Body -->
      <div class="drawer-body">
        <!-- Type Badges -->
        <div id="jd_badges" style="display:flex;gap:8px;flex-wrap:wrap;"></div>

        <!-- Sarthi AI Match Analysis -->
        <div class="sarthi-analysis-box" style="padding:18px;border-radius:var(--radius-md);">
          <div style="display:flex;align-items:center;gap:8px;margin-bottom:12px;font-weight:700;color:var(--text-main);">
            <span>✨ Sarthi AI Skills Analysis</span>
          </div>
          <div id="jd_matchInsight" style="color:var(--text-main);margin-bottom:16px;font-size:0.88rem;line-height:1.5;">Analyzing…</div>
          <div id="jd_skillsTableContainer" style="margin-top:8px;"></div>
        </div>

        <!-- About the Role -->
        <div>
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
            <h3 style="font-size:0.95rem;font-weight:700;margin:0;color:var(--text-main);">About the Role</h3>
            <button id="jd_descToggle" style="display:none;padding:4px 10px;font-size:0.75rem;background:transparent;border:1px solid var(--border-subtle);color:var(--text-muted);border-radius:6px;cursor:pointer;" onclick="window.JobDrawer._toggleDesc()">Read More</button>
          </div>
          <div id="jd_desc" style="font-size:0.9rem;line-height:1.6;color:var(--text-muted);white-space:pre-wrap;word-break:break-word;"></div>
        </div>

        <!-- Key Qualifications -->
        <div>
          <h3 style="font-size:0.95rem;font-weight:700;margin-bottom:8px;color:var(--text-main);">Key Qualifications</h3>
          <ul id="jd_reqs" style="padding-left:20px;font-size:0.9rem;line-height:1.6;color:var(--text-muted);"></ul>
        </div>

        <!-- Compensation -->
        <div>
          <h3 style="font-size:0.95rem;font-weight:700;margin-bottom:8px;color:var(--text-main);">Compensation &amp; Benefits</h3>
          <div id="jd_comp" style="font-size:0.9rem;line-height:1.6;color:var(--text-muted);"></div>
        </div>
      </div>

      <!-- Footer -->
      <div class="drawer-footer" style="display:flex;gap:8px;align-items:center;">
        <button id="jd_applyBtn" class="btn btn-glow" style="flex:2;height:44px;font-weight:600;" onclick="window.JobDrawer._onApply()">Apply Now</button>
        <button id="jd_mockBtn" class="btn btn-glow" style="flex:2;height:44px;font-weight:600;display:inline-flex;align-items:center;justify-content:center;gap:6px;" onclick="window.JobDrawer._onMock()"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"></path><path d="M19 10v2a7 7 0 0 1-14 0v-2"></path><line x1="12" y1="19" x2="12" y2="22"></line></svg> AI Interview</button>
        <button id="jd_likeBtn" class="btn btn-secondary" style="width:44px;height:44px;display:inline-flex;align-items:center;justify-content:center;border-radius:8px;cursor:pointer;transition:all 0.2s;" onclick="window.JobDrawer._onLikeClick(event)" title="Like Job">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff5b89" stroke-width="2">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        </button>
      </div>

    </div>
  </div>`;

  // ── State ───────────────────────────────────────────────────────────────────

  let _currentJob = null;
  let _options = {};
  let _fullDesc = '';
  let _descExpanded = false;
  const SHORT_DESC_LEN = 400;

  // ── Private Helpers ─────────────────────────────────────────────────────────

  function _getEl(id) { return document.getElementById(id); }

  function _skillTag(text, style) {
    const s = document.createElement('span');
    s.style.cssText = style;
    s.textContent = text;
    return s;
  }

  function _renderMatchAnalysis(job) {
    const isLoggedIn = localStorage.getItem('seeker_logged_in') === 'true';
    const containerEl = _getEl('jd_skillsTableContainer');
    const insightEl = _getEl('jd_matchInsight');
    if (!containerEl) return;
    containerEl.innerHTML = '';

    const skills = (job.skills || '').split(',').map(s => s.trim()).filter(Boolean);

    if (!skills.length) {
      containerEl.innerHTML = '<div style="color:var(--text-muted);font-size:.85rem;font-style:italic;padding:12px 0;">No specific skills required for this job.</div>';
      insightEl.innerHTML = 'This job does not specify required skills. You can apply directly.';
      return;
    }

    let tbodyHtml = '';

    if (!isLoggedIn) {
      skills.forEach(skill => {
        tbodyHtml += `
          <tr style="border-bottom: 1px solid var(--border-subtle);">
            <td style="padding: 10px 12px; font-weight: 500; color: var(--text-main);">${skill}</td>
            <td style="padding: 10px 12px; text-align: center; color: var(--text-muted); font-size: 0.78rem;">
              <span class="locked-badge" style="padding: 2px 6px; border-radius: 4px; border: 1px dashed var(--border-subtle);">Locked</span>
            </td>
          </tr>
        `;
      });
      insightEl.innerHTML = '<strong>Unlock personalized matching!</strong> Log in to your JobSarthi account to see which skills you match.';
    } else {
      // Pass the authoritative matchScore directly so insight text matches card badge
      const getScore = _options.getMatchScore || (() => 0);
      const getMatch = _options.getSkillsMatchInfo || (() => ({ matched: [], missing: [] }));
      // Prefer job.matchScore (backend) for consistency; fall back to injected getMatchScore
      const score = job.matchScore !== undefined ? job.matchScore : getScore(job);
      const info = getMatch(job);

      const matchedSet = new Set(info.matched.map(s => s.toLowerCase()));

      skills.forEach(skill => {
        const isMatched = matchedSet.has(skill.toLowerCase());
        const statusHtml = isMatched ? `
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: rgba(16, 185, 129, 0.12); border: 1px solid rgba(16, 185, 129, 0.25);">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
          </div>
        ` : `
          <div style="display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 50%; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.25);">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </div>
        `;
        tbodyHtml += `
          <tr style="border-bottom: 1px solid var(--border-subtle); transition: background 0.2s;">
            <td style="padding: 10px 12px; font-weight: 500; color: ${isMatched ? 'var(--text-main)' : 'var(--text-muted)'};">${skill}</td>
            <td style="padding: 10px 12px; text-align: center;">${statusHtml}</td>
          </tr>
        `;
      });

      let insight = '';
      const top3 = info.matched.slice(0, 3).join(', ');
      const miss2 = info.missing.slice(0, 2).join(', ');
      if (score >= 90) insight = `<strong>Outstanding match!</strong> You have almost all the key skills (${top3 || 'listed'}) required for this role. Sarthi recommends applying immediately.`;
      else if (score >= 80) insight = `<strong>Strong match!</strong> Solid alignment with skills like ${top3 || 'required ones'}. ${miss2 ? 'Consider highlighting projects that use ' + miss2 + '.' : ''}`;
      else if (score >= 70) insight = `<strong>Good match!</strong> You have relevant foundational skills. Brush up on <strong>${miss2 || 'missing skills'}</strong> to strengthen your application.`;
      else insight = `<strong>Moderate alignment.</strong> This role emphasizes <strong>${info.missing.slice(0, 3).join(', ') || 'additional skills'}</strong>. Tailor your resume to highlight transferable skills.`;
      insightEl.innerHTML = insight;
    }

    containerEl.innerHTML = `
      <table style="width:100%; border-collapse:collapse; margin-top:8px; font-size:0.88rem; text-align:left;">
        <thead>
          <tr style="border-bottom: 1px solid var(--border-subtle);">
            <th style="padding: 8px 12px; font-weight: 600; color: var(--text-muted); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.5px;">Required Skill</th>
            <th style="padding: 8px 12px; font-weight: 600; color: var(--text-muted); font-size: 0.78rem; text-transform: uppercase; letter-spacing: 0.5px; text-align: center; width: 80px;">Status</th>
          </tr>
        </thead>
        <tbody>
          ${tbodyHtml}
        </tbody>
      </table>
    `;
  }

  // ── Public API ──────────────────────────────────────────────────────────────

  window.JobDrawer = {

    /** Inject drawer HTML into the page if not already present. */
    _inject() {
      if (!document.getElementById('jd_detailDrawer')) {
        const div = document.createElement('div');
        div.innerHTML = DRAWER_HTML;
        document.body.appendChild(div.firstElementChild);
      }
    },

    /** Open the drawer for a given job object. */
    open(job, opts) {
      this._inject();
      _options = opts || {};
      _currentJob = job;
      _descExpanded = false;

      // Logo
      const getLogoHtml = _options.getJobLogoHtml || (logo => logo ? `<img src="${logo}" style="width:100%;height:100%;object-fit:contain;border-radius:6px;" onerror="this.parentElement.textContent='💼'">` : '💼');
      _getEl('jd_logo').innerHTML = getLogoHtml(job.logo);

      // Title / company
      _getEl('jd_title').textContent = job.title || 'Untitled Role';
      _getEl('jd_company').textContent = job.company || 'Company';

      // Meta row without emojis, using clean styles and small SVGs
      let metaHtml = '';
      if (job.location) {
        metaHtml += `
          <span style="display:inline-flex;align-items:center;gap:4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
            ${job.location}
          </span>
        `;
      }
      if (job.salary) {
        metaHtml += `
          <span style="display:inline-flex;align-items:center;gap:4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>
            ${job.salary.split(' / ')[0]}
          </span>
        `;
      }
      if (job.type) {
        metaHtml += `
          <span style="display:inline-flex;align-items:center;gap:4px;">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            ${job.type}
          </span>
        `;
      }
      _getEl('jd_meta').innerHTML = metaHtml;

      // Badges
      const isLoggedIn = localStorage.getItem('seeker_logged_in') === 'true';
      // Always use the authoritative backend matchScore – same source as the card pill
      const matchVal = isLoggedIn && job.matchScore !== undefined ? job.matchScore : null;
      let matchBadge = '';
      if (matchVal !== null && matchVal > 0) {
        let matchStyle = '';
        if (matchVal >= 80) {
          matchStyle = 'color: #10b981; border: 1px solid rgba(16, 185, 129, 0.25); background: rgba(16, 185, 129, 0.05);';
        } else if (matchVal >= 50) {
          matchStyle = 'color: #f59e0b; border: 1px solid rgba(245, 158, 11, 0.25); background: rgba(245, 158, 11, 0.05);';
        } else {
          matchStyle = 'color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.25); background: rgba(239, 68, 68, 0.05);';
        }
        matchBadge = `<span style="padding:4px 10px;border-radius:6px;font-size:.75rem;font-weight:600;display:inline-flex;align-items:center;${matchStyle}">${matchVal}% Match</span>`;
      }

      _getEl('jd_badges').innerHTML = `
        <span style="padding:4px 10px;border-radius:6px;font-size:.75rem;background:rgba(99,102,241,.15);color:var(--accent-primary);border:1px solid rgba(99,102,241,.25);">${job.type || 'Full-time'}</span>
        ${matchBadge}
      `;

      // Description (sanitize HTML entities)
      _fullDesc = sanitizeDescription(job.description);
      const descEl = _getEl('jd_desc');
      const toggleBtn = _getEl('jd_descToggle');
      if (_fullDesc.length > SHORT_DESC_LEN) {
        descEl.textContent = _fullDesc.slice(0, SHORT_DESC_LEN) + '…';
        toggleBtn.style.display = 'inline-block';
        toggleBtn.textContent = 'Read More';
      } else {
        descEl.textContent = _fullDesc;
        toggleBtn.style.display = 'none';
      }

      // Requirements
      const reqsUl = _getEl('jd_reqs');
      reqsUl.innerHTML = '';
      const reqs = job.reqs || [];
      if (!reqs.length) {
        reqsUl.innerHTML = '<li>Refer to the job description for specific requirements.</li>';
      } else {
        reqs.forEach(r => { const li = document.createElement('li'); li.textContent = r; reqsUl.appendChild(li); });
      }

      // Compensation
      _getEl('jd_comp').textContent = `Offering a highly competitive salary range of ${job.salary || 'Not specified'}. We also provide comprehensive medical coverage, premium wellness benefits, learning stipends, and hardware options.`;

      // Match analysis
      _renderMatchAnalysis(job);

      // Bookmark state
      const savedIds = JSON.parse(localStorage.getItem('saved_jobs') || '[]');
      const isSaved = savedIds.includes(job.id);
      
      // Update footer like button state
      const likeBtn = _getEl('jd_likeBtn');
      if (likeBtn) {
        if (isSaved) {
          likeBtn.style.background = 'rgba(255, 91, 137, 0.15)';
          likeBtn.style.borderColor = 'rgba(255, 91, 137, 0.4)';
          likeBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#ff5b89" stroke="#ff5b89" stroke-width="2">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          `;
        } else {
          likeBtn.style.background = '';
          likeBtn.style.borderColor = '';
          likeBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff5b89" stroke-width="2">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          `;
        }
      }

      // Apply button
      const applyBtn = _getEl('jd_applyBtn');
      const appliedJobs = JSON.parse(localStorage.getItem('applied_jobs') || '[]');
      if (job.isSample) {
        if (appliedJobs.includes(job.id)) {
          applyBtn.textContent = 'Applied ✓';
          applyBtn.disabled = true;
          applyBtn.className = 'btn btn-secondary';
        } else {
          applyBtn.textContent = 'Apply Now';
          applyBtn.disabled = false;
          applyBtn.className = 'btn btn-glow';
        }
      } else {
        applyBtn.textContent = 'Open Job';
        applyBtn.disabled = false;
        applyBtn.className = 'btn btn-glow';
      }

      // Open drawer
      document.body.style.overflow = 'hidden';
      const drawer = _getEl('jd_detailDrawer');
      drawer.style.display = 'flex';
      drawer.offsetHeight;
      drawer.classList.add('active');
    },

    close() {
      const drawer = _getEl('jd_detailDrawer');
      if (!drawer) return;
      drawer.classList.remove('active');
      setTimeout(() => { drawer.style.display = 'none'; }, 260);
      document.body.style.overflow = '';
    },

    _overlayClick(event) {
      if (event.target === _getEl('jd_detailDrawer')) this.close();
    },

    _toggleDesc() {
      _descExpanded = !_descExpanded;
      const descEl = _getEl('jd_desc');
      const btn = _getEl('jd_descToggle');
      if (_descExpanded) {
        descEl.textContent = _fullDesc;
        btn.textContent = 'Show Less';
      } else {
        descEl.textContent = _fullDesc.slice(0, SHORT_DESC_LEN) + '…';
        btn.textContent = 'Read More';
      }
    },

    _onLikeClick(event) {
      if (event) event.stopPropagation();
      if (!_currentJob) return;
      const jobId = _currentJob.id;
      let savedIds = JSON.parse(localStorage.getItem('saved_jobs') || '[]');
      const index = savedIds.indexOf(jobId);
      const checked = index === -1;
      
      if (checked) {
        savedIds.push(jobId);
        // Cache job details for sidebar favorites list
        let savedDetails = JSON.parse(localStorage.getItem('saved_job_details') || '{}');
        savedDetails[jobId] = {
          id: jobId,
          title: _currentJob.title || 'Opportunity',
          company: _currentJob.company || 'Company Details',
          location: _currentJob.location || 'Remote'
        };
        localStorage.setItem('saved_job_details', JSON.stringify(savedDetails));
      } else {
        savedIds.splice(index, 1);
        let savedDetails = JSON.parse(localStorage.getItem('saved_job_details') || '{}');
        delete savedDetails[jobId];
        localStorage.setItem('saved_job_details', JSON.stringify(savedDetails));
      }
      localStorage.setItem('saved_jobs', JSON.stringify(savedIds));

      // Sync footer button style
      const likeBtn = _getEl('jd_likeBtn');
      if (likeBtn) {
        if (checked) {
          likeBtn.style.background = 'rgba(255, 91, 137, 0.15)';
          likeBtn.style.borderColor = 'rgba(255, 91, 137, 0.4)';
          likeBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#ff5b89" stroke="#ff5b89" stroke-width="2">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          `;
        } else {
          likeBtn.style.background = '';
          likeBtn.style.borderColor = '';
          likeBtn.innerHTML = `
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff5b89" stroke-width="2">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
            </svg>
          `;
        }
      }

      // Sync card like button
      const cardBtn = document.getElementById(`like_btn_${jobId}`);
      if (cardBtn) {
        cardBtn.innerHTML = checked ? `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#ff5b89" stroke="#ff5b89" stroke-width="2">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        ` : `
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff5b89" stroke-width="2">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
          </svg>
        `;
        cardBtn.style.background = checked ? 'rgba(255, 91, 137, 0.1)' : '';
        cardBtn.style.borderColor = checked ? 'rgba(255, 91, 137, 0.25)' : '';
      }

      // Toast feedback
      const toast = document.getElementById("successToast");
      if (toast) {
        if (checked) {
          toast.textContent = "Job saved to your bookmarks!";
          toast.style.background = "#ff5b89";
          toast.style.boxShadow = "0 10px 20px rgba(255, 91, 137, 0.3)";
        } else {
          toast.textContent = "Job removed from bookmarks.";
          toast.style.background = "var(--bg-secondary)";
          toast.style.boxShadow = "none";
        }
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, 1500);
      }

      if (_options.onSave) _options.onSave(_currentJob, checked);
    },

    _onApply() {
      if (!_currentJob) return;
      if (_options.onApply) {
        _options.onApply(_currentJob);
      } else if (!_currentJob.isSample && (_currentJob.applyUrl || _currentJob.apply_url)) {
        const email = encodeURIComponent(localStorage.getItem('seeker_email') || '');
        const baseUrl = window.API_BASE_URL || '';
        window.open(`${baseUrl}/apply/${_currentJob.id}?email=${email}`, '_blank');
      }
    },

    _onMock() {
      if (!_currentJob) return;
      const title = encodeURIComponent(_currentJob.title || '');
      const company = encodeURIComponent(_currentJob.company || '');
      const jobId = encodeURIComponent(_currentJob.id || '');
      const skills = encodeURIComponent((_currentJob.skills || '').slice(0, 300));
      // Works from both /seeker/ context and any sub-dir
      window.location.href = `aiinterview.html?jobId=${jobId}&jobTitle=${title}&company=${company}&jobSkills=${skills}`;
    },

    syncLikeState(jobId, isSaved) {
      if (_currentJob && String(_currentJob.id) === String(jobId)) {
        const likeBtn = _getEl('jd_likeBtn');
        if (likeBtn) {
          if (isSaved) {
            likeBtn.style.background = 'rgba(255, 91, 137, 0.15)';
            likeBtn.style.borderColor = 'rgba(255, 91, 137, 0.4)';
            likeBtn.innerHTML = `
              <svg width="18" height="18" viewBox="0 0 24 24" fill="#ff5b89" stroke="#ff5b89" stroke-width="2">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            `;
          } else {
            likeBtn.style.background = '';
            likeBtn.style.borderColor = '';
            likeBtn.innerHTML = `
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#ff5b89" stroke-width="2">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
              </svg>
            `;
          }
        }
      }
    },

    /** Return the currently selected job object (for host pages). */
    get currentJob() { return _currentJob; }
  };

})();
