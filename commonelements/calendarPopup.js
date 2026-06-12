/**
 * JobSarthi – Shared Calendar Popup Component
 * Injected automatically on Seeker pages via js/header.js
 * Usage: call window.CalendarPopup.open() to open
 */

(function () {
  'use strict';

  // ── CSS Injection ───────────────────────────────────────────────────────────
  const CALENDAR_STYLES = `
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');

    .cal-popup-overlay {
      position: fixed;
      top: 0;
      left: 0;
      width: 100vw;
      height: 100vh;
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(10px);
      -webkit-backdrop-filter: blur(10px);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 10000;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.25s ease;
    }
    
    .cal-popup-overlay.active {
      opacity: 1;
      pointer-events: auto;
    }
    
    .cal-popup-card {
      width: 700px;
      max-width: 95%;
      height: 480px;
      background: #0f0f11;
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 16px;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.8);
      display: grid;
      grid-template-columns: 370px 1fr;
      overflow: hidden;
      position: relative;
      transform: scale(0.92);
      transition: transform 0.25s cubic-bezier(0.34, 1.56, 0.64, 1);
      font-family: 'Plus Jakarta Sans', 'Outfit', -apple-system, sans-serif;
      color: #fff;
    }
    
    .cal-popup-overlay.active .cal-popup-card {
      transform: scale(1);
    }
    
    .cal-close-btn {
      position: absolute;
      top: 14px;
      right: 14px;
      background: transparent;
      border: none;
      color: #888;
      font-size: 1.15rem;
      cursor: pointer;
      z-index: 10002;
      transition: all 0.2s;
      display: flex;
      align-items: center;
      justify-content: center;
      width: 28px;
      height: 28px;
      border-radius: 50%;
    }
    
    .cal-close-btn:hover {
      color: #fff;
      background: rgba(255, 255, 255, 0.06);
    }
    
    .cal-left-panel {
      padding: 24px 20px 20px 20px;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      border-right: 1px solid rgba(255, 255, 255, 0.08);
      background: #0f0f11;
    }
    
    .cal-right-panel {
      padding: 24px;
      display: flex;
      flex-direction: column;
      background: #141417;
      overflow-y: auto;
      height: 100%;
    }
    
    .cal-right-panel::-webkit-scrollbar {
      width: 4px;
    }
    .cal-right-panel::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.1);
      border-radius: 4px;
    }
    
    .cal-nav-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 24px;
      padding: 0 4px;
    }
    
    .cal-month-title {
      font-size: 0.98rem;
      font-weight: 700;
      color: #ffffff;
      letter-spacing: -0.01em;
    }
    
    .cal-nav-arrow {
      background: transparent;
      border: none;
      color: #888;
      font-size: 1.1rem;
      cursor: pointer;
      padding: 4px 8px;
      transition: color 0.2s;
      user-select: none;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    
    .cal-nav-arrow:hover {
      color: #fff;
    }
    
    .cal-days-header {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      text-align: center;
      margin-bottom: 14px;
    }
    
    .cal-day-name {
      font-size: 0.8rem;
      font-weight: 600;
      color: #555558;
    }
    
    .cal-dates-grid {
      display: grid;
      grid-template-columns: repeat(7, 1fr);
      row-gap: 8px;
      column-gap: 4px;
      align-items: center;
      justify-items: center;
      flex: 1;
    }
    
    .cal-date-cell {
      width: 36px;
      height: 36px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      font-size: 0.88rem;
      color: #ffffff;
      cursor: pointer;
      position: relative;
      user-select: none;
      border-radius: 12px;
      transition: all 0.15s ease;
    }
    
    .cal-date-cell.muted {
      color: #3e3e42;
    }
    
    .cal-date-cell:hover:not(.muted):not(.selected) {
      background: rgba(255, 255, 255, 0.05);
    }
    
    .cal-date-cell.has-event:not(.selected)::after {
      content: '';
      position: absolute;
      bottom: 4px;
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background: var(--accent-secondary, #2563eb);
    }
    
    .cal-date-cell.selected {
      background: #ffffff !important;
      color: #000000 !important;
      font-weight: 700;
      border-radius: 12px;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding-top: 2px;
      box-shadow: 0 4px 12px rgba(255, 255, 255, 0.15);
    }
    
    .cal-selected-dot {
      width: 3px;
      height: 3px;
      border-radius: 50%;
      background: #000000;
      margin-top: 2px;
    }
    
    .cal-right-title {
      font-size: 1rem;
      font-weight: 700;
      margin: 0 0 4px 0;
      color: #fff;
    }
    
    .cal-selected-date-display {
      font-size: 0.72rem;
      color: #71717a;
      margin-bottom: 20px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      font-weight: 600;
    }
    
    .cal-event-card {
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.05);
      border-radius: 10px;
      padding: 14px;
      margin-bottom: 20px;
    }
    
    .cal-event-card-title {
      font-size: 0.9rem;
      font-weight: 700;
      color: #fff;
      margin: 0 0 6px 0;
    }
    
    .cal-event-card-detail {
      font-size: 0.78rem;
      color: #a1a1aa;
      margin: 4px 0;
      display: flex;
      align-items: center;
      gap: 6px;
    }
    
    .cal-event-card-detail svg {
      color: #71717a;
      flex-shrink: 0;
    }
    
    .cal-todo-section {
      margin-top: 4px;
      margin-bottom: 16px;
    }
    
    .cal-todo-header {
      font-size: 0.72rem;
      font-weight: 700;
      color: var(--accent-secondary, #2563eb);
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 0.8px;
    }
    
    .cal-todo-text {
      font-size: 0.78rem;
      color: #d4d4d8;
      line-height: 1.45;
      margin: 0 0 12px 0;
    }
    
    .cal-actions-row {
      display: flex;
      gap: 8px;
    }
    
    .cal-btn {
      flex: 1;
      padding: 8px 12px;
      font-size: 0.75rem;
      font-weight: 600;
      border-radius: 6px;
      cursor: pointer;
      text-align: center;
      transition: all 0.2s;
      text-decoration: none;
      display: inline-flex;
      align-items: center;
      justify-content: center;
    }
    
    .cal-btn-primary {
      background: var(--accent-secondary, #2563eb);
      color: #fff;
      border: none;
    }
    
    .cal-btn-primary:hover {
      opacity: 0.9;
    }
    
    .cal-btn-secondary {
      background: rgba(255, 255, 255, 0.04);
      color: #d4d4d8;
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    
    .cal-btn-secondary:hover {
      background: rgba(255, 255, 255, 0.08);
      color: #fff;
    }
    
    .cal-empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 16px 0;
      text-align: center;
    }
    
    .cal-empty-state-text {
      font-size: 0.78rem;
      color: #71717a;
      margin-top: 8px;
      line-height: 1.4;
    }
    
    .cal-upcoming-header {
      font-size: 0.72rem;
      font-weight: 700;
      color: #71717a;
      margin: 10px 0 8px 0;
      text-transform: uppercase;
      letter-spacing: 0.8px;
      border-top: 1px solid rgba(255, 255, 255, 0.06);
      padding-top: 16px;
    }
    
    .cal-upcoming-list {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    
    .cal-upcoming-item {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: rgba(255, 255, 255, 0.01);
      border: 1px solid rgba(255, 255, 255, 0.04);
      border-radius: 8px;
      padding: 10px 12px;
      transition: all 0.2s;
    }
    
    .cal-upcoming-item:hover {
      background: rgba(255, 255, 255, 0.03);
      border-color: rgba(255, 255, 255, 0.08);
    }
    
    .cal-upcoming-info h5 {
      margin: 0 0 2px 0;
      font-size: 0.8rem;
      font-weight: 600;
      color: #fff;
    }
    
    .cal-upcoming-info p {
      margin: 0;
      font-size: 0.72rem;
      color: #71717a;
    }
    
    .cal-upcoming-btn {
      padding: 4px 8px;
      font-size: 0.68rem;
      background: rgba(59, 130, 246, 0.1);
      color: #60a5fa;
      border: 1px solid rgba(59, 130, 246, 0.2);
      border-radius: 4px;
      font-weight: 600;
      cursor: pointer;
      text-decoration: none;
      transition: all 0.2s;
    }
    .cal-upcoming-btn:hover {
      background: rgba(59, 130, 246, 0.2);
      color: #fff;
    }

    /* Light Theme overrides for Calendar Popup */
    body.light-theme .cal-popup-card {
      background: #ffffff;
      border-color: #e4e4e7;
      box-shadow: 0 24px 60px rgba(0, 0, 0, 0.1);
      color: #09090b;
    }
    body.light-theme .cal-left-panel {
      background: #ffffff;
      border-right-color: #e4e4e7;
    }
    body.light-theme .cal-right-panel {
      background: #f4f4f5;
    }
    body.light-theme .cal-month-title {
      color: #09090b;
    }
    body.light-theme .cal-date-cell {
      color: #09090b;
    }
    body.light-theme .cal-date-cell.muted {
      color: #a1a1aa;
    }
    body.light-theme .cal-date-cell:hover:not(.muted):not(.selected) {
      background: rgba(0, 0, 0, 0.05);
    }
    body.light-theme .cal-date-cell.selected {
      background: #09090b !important;
      color: #ffffff !important;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    body.light-theme .cal-selected-dot {
      background: #ffffff;
    }
    body.light-theme .cal-right-title {
      color: #09090b;
    }
    body.light-theme .cal-event-card {
      background: #ffffff;
      border-color: #e4e4e7;
    }
    body.light-theme .cal-event-card-title {
      color: #09090b;
    }
    body.light-theme .cal-event-card-detail {
      color: #71717a;
    }
    body.light-theme .cal-todo-text {
      color: #27272a;
    }
    body.light-theme .cal-btn-secondary {
      background: #ffffff;
      color: #27272a;
      border-color: #e4e4e7;
    }
    body.light-theme .cal-btn-secondary:hover {
      background: #f4f4f5;
      color: #09090b;
    }
    body.light-theme .cal-upcoming-item {
      background: #ffffff;
      border-color: #e4e4e7;
    }
    body.light-theme .cal-upcoming-item:hover {
      background: #f4f4f5;
      border-color: #d4d4d8;
    }
    body.light-theme .cal-upcoming-info h5 {
      color: #09090b;
    }
    body.light-theme .cal-upcoming-btn:hover {
      color: #ffffff;
    }
    body.light-theme .cal-close-btn {
      color: #71717a;
    }
    body.light-theme .cal-close-btn:hover {
      color: #09090b;
      background: rgba(0, 0, 0, 0.05);
    }
    body.light-theme .cal-nav-arrow {
      color: #71717a;
    }
    body.light-theme .cal-nav-arrow:hover {
      color: #09090b;
    }

    @media (max-width: 680px) {
      .cal-popup-card {
        grid-template-columns: 1fr;
        height: auto;
        max-height: 85vh;
      }
      .cal-left-panel {
        border-right: none;
        border-bottom: 1px solid rgba(255, 255, 255, 0.08);
        padding-bottom: 16px;
      }
      body.light-theme .cal-left-panel {
        border-bottom-color: #e4e4e7;
      }
      .cal-right-panel {
        max-height: 300px;
      }
    }
  `;

  // ── HTML Template ───────────────────────────────────────────────────────────
  const POPUP_HTML = `
    <div class="cal-popup-overlay" id="calPopupOverlay" onclick="window.CalendarPopup._overlayClick(event)">
      <div class="cal-popup-card" onclick="event.stopPropagation()">
        <button class="cal-close-btn" onclick="window.CalendarPopup.close()">✕</button>
        
        <!-- Left Panel: Minimal Calendar -->
        <div class="cal-left-panel">
          <div>
            <div class="cal-nav-header">
              <button class="cal-nav-arrow" onclick="window.CalendarPopup.changeMonth(-1)">❬</button>
              <div class="cal-month-title" id="calMonthTitle">Month Year</div>
              <button class="cal-nav-arrow" onclick="window.CalendarPopup.changeMonth(1)">❭</button>
            </div>
            
            <div class="cal-days-header">
              <div class="cal-day-name">Su</div>
              <div class="cal-day-name">Mo</div>
              <div class="cal-day-name">Tu</div>
              <div class="cal-day-name">We</div>
              <div class="cal-day-name">Th</div>
              <div class="cal-day-name">Fr</div>
              <div class="cal-day-name">Sa</div>
            </div>
            
            <div class="cal-dates-grid" id="calDatesGrid">
              <!-- Rendered Dynamically -->
            </div>
          </div>
        </div>
        
        <!-- Right Panel: Upcoming Agenda -->
        <div class="cal-right-panel" id="calRightPanel">
          <!-- Rendered Dynamically -->
        </div>
      </div>
    </div>
  `;

  // ── State ──────────────────────────────────────────────────────────────────
  let _currentMonthDate = new Date();
  let _selectedDate = new Date();
  let _interviews = [];

  // ── Helper Elements ────────────────────────────────────────────────────────
  function _getEl(id) { return document.getElementById(id); }

  // ── Data Fetching ──────────────────────────────────────────────────────────
  function getLocalMockInterviews() {
    let stored = JSON.parse(localStorage.getItem('mock_interviews') || '[]');
    
    // Seed sample mock interviews if empty
    if (stored.length === 0) {
      const today = new Date();
      const year = today.getFullYear();
      const month = today.getMonth();
      stored = [
        {
          company: "Google India",
          date: new Date(year, month, today.getDate() + 2).toISOString(),
          time: "10:00 AM",
          jobId: "sample_google"
        },
        {
          company: "Microsoft India",
          date: new Date(year, month, today.getDate() + 5).toISOString(),
          time: "2:30 PM",
          jobId: "sample_msft"
        },
        {
          company: "Razorpay",
          date: new Date(year, month, today.getDate() - 1).toISOString(),
          time: "4:00 PM",
          jobId: "sample_razorpay"
        }
      ];
      localStorage.setItem('mock_interviews', JSON.stringify(stored));
    }

    const list = [];
    stored.forEach(s => {
      const d = new Date(s.date);
      list.push({
        company: s.company,
        date: d,
        timeStr: s.time,
        fullDateStr: d.toDateString(),
        jobId: s.jobId || ''
      });
    });
    return list;
  }

  async function fetchInterviews() {
    const email = localStorage.getItem('seeker_email');
    const list = getLocalMockInterviews();
    if (!email) return list;

    try {
      const apiBase = window.API_BASE_URL || '';
      const response = await fetch(`${apiBase}/api/messages?email=${encodeURIComponent(email)}&role=jobseeker`);
      if (response.ok) {
        const messages = await response.json();
        const pattern = /An interview invitation has been generated for (.+?) at (.+?) \(IST\)/;
        messages.forEach(msg => {
          if (msg.sender === 'recruiter' && msg.text.includes('Interview Scheduled')) {
            const match = msg.text.match(pattern);
            if (match) {
              const dateStr = match[1]; 
              const timeStr = match[2]; 
              const parsedDate = new Date(dateStr);
              if (!isNaN(parsedDate)) {
                // Avoid duplicate company bookings on exact same day
                const isDuplicate = list.some(item => 
                  item.company.toLowerCase() === (msg.companyName || msg.recruiterName || '').toLowerCase() && 
                  item.date.getFullYear() === parsedDate.getFullYear() &&
                  item.date.getMonth() === parsedDate.getMonth() &&
                  item.date.getDate() === parsedDate.getDate()
                );
                if (!isDuplicate) {
                  list.push({
                    company: msg.companyName || msg.recruiterName,
                    date: parsedDate,
                    timeStr: timeStr,
                    fullDateStr: dateStr,
                    jobId: msg.jobId || ''
                  });
                }
              }
            }
          }
        });
      }
    } catch (e) {
      console.error("[CalendarPopup] Error fetching interviews:", e);
    }
    return list;
  }

  // ── Render Helpers ─────────────────────────────────────────────────────────
  function renderCalendar() {
    const grid = _getEl('calDatesGrid');
    if (!grid) return;
    grid.innerHTML = '';

    const year = _currentMonthDate.getFullYear();
    const month = _currentMonthDate.getMonth();

    // Set Month Year Title
    const monthName = _currentMonthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    _getEl('calMonthTitle').textContent = monthName;

    // Calculate grid numbers
    const firstDayIndex = new Date(year, month, 1).getDay(); // Day of week (0-6)
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const prevMonthDays = new Date(year, month, 0).getDate();

    // 1. Muted Dates from Previous Month
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const dayNum = prevMonthDays - i;
      const cell = document.createElement('div');
      cell.className = 'cal-date-cell muted';
      cell.textContent = dayNum;
      
      const cellDate = new Date(year, month - 1, dayNum);
      cell.onclick = () => selectDate(cellDate);
      grid.appendChild(cell);
    }

    // 2. Active Dates of Current Month
    for (let d = 1; d <= daysInMonth; d++) {
      const cell = document.createElement('div');
      cell.className = 'cal-date-cell';
      
      const cellDate = new Date(year, month, d);
      const isSelected = _selectedDate.getFullYear() === year && 
                         _selectedDate.getMonth() === month && 
                         _selectedDate.getDate() === d;
      
      if (isSelected) {
        cell.classList.add('selected');
        cell.innerHTML = `<span>${d}</span><span class="cal-selected-dot"></span>`;
      } else {
        cell.textContent = d;
      }

      // Check for interviews on this date
      const hasInterviews = _interviews.some(inv => 
        inv.date.getFullYear() === year && 
        inv.date.getMonth() === month && 
        inv.date.getDate() === d
      );
      if (hasInterviews) {
        cell.classList.add('has-event');
      }

      cell.onclick = () => selectDate(cellDate);
      grid.appendChild(cell);
    }

    // 3. Muted Dates from Next Month to fill up 35 or 42 grid cells
    const totalCells = firstDayIndex + daysInMonth;
    const gridRows = Math.ceil(totalCells / 7);
    const expectedCells = gridRows * 7;
    const nextMonthPadding = expectedCells - totalCells;

    for (let d = 1; d <= nextMonthPadding; d++) {
      const cell = document.createElement('div');
      cell.className = 'cal-date-cell muted';
      cell.textContent = d;

      const cellDate = new Date(year, month + 1, d);
      cell.onclick = () => selectDate(cellDate);
      grid.appendChild(cell);
    }
  }

  function renderRightPanel() {
    const panel = _getEl('calRightPanel');
    if (!panel) return;
    panel.innerHTML = '';

    const year = _selectedDate.getFullYear();
    const month = _selectedDate.getMonth();
    const d = _selectedDate.getDate();

    const dateStr = _selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

    // Filter interviews for the selected date
    const dayInterviews = _interviews.filter(inv => 
      inv.date.getFullYear() === year && 
      inv.date.getMonth() === month && 
      inv.date.getDate() === d
    );

    let html = `
      <h3 class="cal-right-title">Agenda Details</h3>
      <div class="cal-selected-date-display">${dateStr}</div>
    `;

    if (dayInterviews.length > 0) {
      // 1. Render active interviews
      dayInterviews.forEach(inv => {
        const prepareUrl = `aiinterview.html?jobId=${encodeURIComponent(inv.jobId || 'sample')}&jobTitle=${encodeURIComponent(inv.company + ' Interview')}&company=${encodeURIComponent(inv.company)}`;
        html += `
          <div class="cal-event-card">
            <h4 class="cal-event-card-title">${inv.company} Interview</h4>
            <div class="cal-event-card-detail">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              Time: ${inv.timeStr} (IST)
            </div>
            <div class="cal-event-card-detail">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
              Status: Confirmed
            </div>
          </div>
          <div class="cal-todo-section">
            <div class="cal-todo-header">What to do next</div>
            <p class="cal-todo-text">Prepare for your upcoming round with Google & Microsoft standards. Sarthi AI can run a tailored mock simulator based on the job profile.</p>
            <div class="cal-actions-row">
              <a href="${prepareUrl}" class="cal-btn cal-btn-primary">Start AI Mock Prep</a>
              <button onclick="alert('Join link will activate 5 minutes before scheduled time.')" class="cal-btn cal-btn-secondary">Join Call</button>
            </div>
          </div>
        `;
      });
    } else {
      // 2. Render empty state with Action Suggestions
      html += `
        <div class="cal-empty-state">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#71717a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <div class="cal-empty-state-text">
            No interviews scheduled today.
          </div>
        </div>
        <div class="cal-todo-section" style="border-top: 1px solid rgba(255,255,255,0.06); padding-top: 16px;">
          <div class="cal-todo-header">What to do next</div>
          <p class="cal-todo-text">Keep your momentum high! Conduct a general Sarthi AI Mock Simulator interview, polish your resume formatting, or search for fresh job opportunities.</p>
          <div class="cal-actions-row">
            <a href="aiinterview.html" class="cal-btn cal-btn-primary">AI Interview Simulator</a>
            <a href="resume.html" class="cal-btn cal-btn-secondary">Optimize Resume</a>
          </div>
        </div>
      `;
    }

    // 3. Render a List of All Upcoming Interviews (chronological)
    const upcomingList = _interviews.filter(inv => {
      const endOfDay = new Date();
      endOfDay.setHours(0,0,0,0);
      return inv.date >= endOfDay;
    }).sort((a,b) => a.date - b.date);

    if (upcomingList.length > 0) {
      html += `<div class="cal-upcoming-header">Upcoming Schedule</div>`;
      html += `<div class="cal-upcoming-list">`;
      upcomingList.slice(0, 3).forEach(inv => {
        const dayFormatted = inv.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        const prepUrl = `aiinterview.html?jobId=${encodeURIComponent(inv.jobId || 'sample')}&jobTitle=${encodeURIComponent(inv.company + ' Interview')}&company=${encodeURIComponent(inv.company)}`;
        html += `
          <div class="cal-upcoming-item">
            <div class="cal-upcoming-info">
              <h5>${inv.company}</h5>
              <p>${dayFormatted} • ${inv.timeStr}</p>
            </div>
            <a href="${prepUrl}" class="cal-upcoming-btn">Prepare</a>
          </div>
        `;
      });
      html += `</div>`;
    }

    panel.innerHTML = html;
  }

  function selectDate(date) {
    _selectedDate = date;
    _currentMonthDate = new Date(date.getFullYear(), date.getMonth(), 1); // Align grid to selected month
    renderCalendar();
    renderRightPanel();
  }

  // ── Public API ──────────────────────────────────────────────────────────────
  window.CalendarPopup = {
    
    _inject() {
      if (!_getEl('calPopupOverlay')) {
        // Style
        const style = document.createElement('style');
        style.id = 'calPopupStyles';
        style.innerHTML = CALENDAR_STYLES;
        document.head.appendChild(style);

        // Overlay & Card
        const div = document.createElement('div');
        div.innerHTML = POPUP_HTML.trim();
        document.body.appendChild(div.firstChild);
      }
    },

    open(initialDate = new Date()) {
      this._inject();
      
      _selectedDate = initialDate;
      _currentMonthDate = new Date(initialDate.getFullYear(), initialDate.getMonth(), 1);

      // Show popup instantly (0ms delay)
      document.body.style.overflow = 'hidden';
      const overlay = _getEl('calPopupOverlay');
      if (overlay) {
        overlay.style.display = 'flex';
        overlay.offsetHeight; // trigger reflow
        overlay.classList.add('active');
      }

      // 1. Populate immediately using local storage mock interviews
      _interviews = getLocalMockInterviews();
      renderCalendar();
      renderRightPanel();

      // 2. Fetch live data asynchronously in background
      fetchInterviews().then(list => {
        _interviews = list;
        renderCalendar();
        renderRightPanel();
      }).catch(err => {
        console.warn("[CalendarPopup] Background fetch failed:", err);
      });
    },

    close() {
      const overlay = _getEl('calPopupOverlay');
      if (!overlay) return;
      overlay.classList.remove('active');
      setTimeout(() => { overlay.style.display = 'none'; }, 250);
      document.body.style.overflow = '';
    },

    _overlayClick(e) {
      if (e.target === _getEl('calPopupOverlay')) {
        this.close();
      }
    },

    changeMonth(delta) {
      _currentMonthDate.setMonth(_currentMonthDate.getMonth() + delta);
      renderCalendar();
    }
  };

  // Check if deep link requires opening calendar directly
  document.addEventListener("DOMContentLoaded", () => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('openCalendar') === 'true') {
      // Remove query parameter cleanly from URL
      const cleanUrl = window.location.protocol + "//" + window.location.host + window.location.pathname;
      window.history.replaceState({ path: cleanUrl }, '', cleanUrl);

      // Wait for everything to load, then open the calendar popup
      setTimeout(() => {
        window.CalendarPopup.open();
      }, 500);
    }
  });

})();
