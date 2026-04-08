// ============================================================
// script.js — User Dashboard Logic
// ============================================================

// ── Guard & Init ───────────────────────────────────────────

const user = requireAuth();
if (user) {
  // Set UI user info
  document.getElementById('user-name').textContent = user.name || user.email;
  const avatar = document.getElementById('user-avatar');
  if (avatar) avatar.textContent = (user.name || user.email).charAt(0).toUpperCase();

  // Load initial section
  initSections();
  setupDropZone();
  loadHistory();
}

// ── Section Navigation ─────────────────────────────────────

function initSections() {
  document.querySelectorAll('.nav-item').forEach(item => {
    item.addEventListener('click', function(e) {
      const section = this.dataset.section;
      if (section) {
        e.preventDefault();
        switchSection(section);
      }
    });
  });
}

function switchSection(name) {
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const section = document.getElementById(`section-${name}`);
  if (section) section.classList.add('active');

  const navItem = document.querySelector(`[data-section="${name}"]`);
  if (navItem) navItem.classList.add('active');

  if (name === 'history') loadHistory();
}

// ── File Upload / Drop Zone ────────────────────────────────

let selectedFile = null;

function setupDropZone() {
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('resume-file');

  if (!dropZone || !fileInput) return;

  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });

  dropZone.addEventListener('dragleave', () => {
    dropZone.classList.remove('drag-over');
  });

  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) setFile(file);
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) setFile(fileInput.files[0]);
  });
}

function setFile(file) {
  const allowed = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
  const allowedExt = ['.pdf', '.docx'];
  const ext = '.' + file.name.split('.').pop().toLowerCase();

  if (!allowed.includes(file.type) && !allowedExt.includes(ext)) {
    showError('analyze-error', 'Only PDF and DOCX files are supported.');
    return;
  }

  selectedFile = file;
  document.getElementById('file-name').textContent = file.name;
  document.getElementById('file-selected').classList.remove('hidden');
  hideError('analyze-error');
}

function clearFile() {
  selectedFile = null;
  document.getElementById('file-selected').classList.add('hidden');
  document.getElementById('resume-file').value = '';
}

// ── Analyze Resume ─────────────────────────────────────────

async function analyzeResume() {
  hideError('analyze-error');

  if (!selectedFile) {
    showError('analyze-error', 'Please upload a resume file first.');
    return;
  }

  const jd = document.getElementById('job-description').value.trim();
  if (!jd) {
    showError('analyze-error', 'Please enter a job description.');
    return;
  }

  const btn = document.getElementById('analyze-btn');
  const btnText = btn.querySelector('.btn-text');
  const btnLoader = btn.querySelector('.btn-loader');
  btn.disabled = true;
  btnText.classList.add('hidden');
  btnLoader.classList.remove('hidden');

  // Hide old results
  document.getElementById('results-section').classList.add('hidden');

  const formData = new FormData();
  formData.append('file', selectedFile);
  formData.append('job_description', jd);

  try {
    const res = await apiRequestForm('/analyze', formData);

    if (res && res.ok) {
      renderResults(res.data);
    } else {
      showError('analyze-error', (res && res.data && res.data.detail) || 'Analysis failed. Please try again.');
    }
  } catch (err) {
    showError('analyze-error', 'Cannot connect to server.');
  } finally {
    btn.disabled = false;
    btnText.classList.remove('hidden');
    btnLoader.classList.add('hidden');
  }
}

// ── Render Results ─────────────────────────────────────────

function renderResults(data) {
  const section = document.getElementById('results-section');
  section.classList.remove('hidden');

  // Filename badge
  document.getElementById('result-filename').textContent = data.file_name || selectedFile.name;

  // Score ring
  const score = Math.round(data.score);
  const circumference = 327; // 2π × 52
  const offset = circumference - (score / 100) * circumference;

  const ring = document.getElementById('score-ring-fill');
  ring.style.strokeDashoffset = offset;

  // Color by score
  if (score >= 80) {
    ring.style.stroke = 'var(--green)';
  } else if (score >= 60) {
    ring.style.stroke = 'var(--accent)';
  } else if (score >= 40) {
    ring.style.stroke = '#ffb432';
  } else {
    ring.style.stroke = 'var(--red)';
  }

  document.getElementById('score-value').textContent = score + '%';

  // Score label
  const labelEl = document.getElementById('score-label');
  if (score >= 80) {
    labelEl.textContent = 'Excellent Match';
    labelEl.className = 'score-label excellent';
  } else if (score >= 60) {
    labelEl.textContent = 'Good Match';
    labelEl.className = 'score-label good';
  } else if (score >= 40) {
    labelEl.textContent = 'Fair Match';
    labelEl.className = 'score-label fair';
  } else {
    labelEl.textContent = 'Poor Match';
    labelEl.className = 'score-label poor';
  }

  // Skills found
  const foundEl = document.getElementById('skills-found');
  const skills = data.skills_found || [];
  document.getElementById('skills-count').textContent = skills.length;
  foundEl.innerHTML = skills.length
    ? skills.map(s => `<span class="skill-tag found">${s}</span>`).join('')
    : '<span style="color:var(--text-mute);font-size:0.85rem">None detected</span>';

  // Missing skills
  const missingEl = document.getElementById('skills-missing');
  const missing = data.missing_skills || [];
  document.getElementById('missing-count').textContent = missing.length;
  missingEl.innerHTML = missing.length
    ? missing.map(s => `<span class="skill-tag missing">${s}</span>`).join('')
    : '<span style="color:var(--green);font-size:0.85rem">✓ No gaps found</span>';

  // Suggestions
  const suggestEl = document.getElementById('suggestions-list');
  const suggestions = data.suggestions || [];
  suggestEl.innerHTML = suggestions.length
    ? suggestions.map(s => `<li>${s}</li>`).join('')
    : '<li>No specific suggestions at this time.</li>';

  // Scroll to results
  setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

  // Refresh history in background
  loadHistory();
}

// ── History ────────────────────────────────────────────────

async function loadHistory() {
  const loadingEl = document.getElementById('history-loading');
  const emptyEl = document.getElementById('history-empty');
  const tableEl = document.getElementById('history-table-container');
  const bodyEl = document.getElementById('history-body');

  if (!loadingEl) return;

  loadingEl.classList.remove('hidden');
  emptyEl.classList.add('hidden');
  tableEl.classList.add('hidden');

  try {
    const res = await apiRequest('/history');
    if (!res) return;

    loadingEl.classList.add('hidden');

    const records = res.data || [];

    if (!records.length) {
      emptyEl.classList.remove('hidden');
      return;
    }

    tableEl.classList.remove('hidden');
    bodyEl.innerHTML = records.map(r => {
      const score = Math.round(r.score);
      const scoreClass = score >= 80 ? 'high' : score >= 50 ? 'mid' : 'low';
      const date = r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', {
        year: 'numeric', month: 'short', day: 'numeric'
      }) : '—';
      const skillsFound = Array.isArray(r.skills_found) ? r.skills_found.slice(0, 3).join(', ') + (r.skills_found.length > 3 ? `…` : '') : '—';
      const missing = Array.isArray(r.missing_skills) ? r.missing_skills.length : 0;

      return `<tr>
        <td>${escapeHtml(r.file_name || '—')}</td>
        <td><span class="score-pill ${scoreClass}">${score}%</span></td>
        <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(skillsFound)}</td>
        <td>${missing} skill${missing !== 1 ? 's' : ''}</td>
        <td style="color:var(--text-dim);font-size:0.8rem">${date}</td>
      </tr>`;
    }).join('');

  } catch (err) {
    if (loadingEl) loadingEl.classList.add('hidden');
    if (emptyEl) emptyEl.classList.remove('hidden');
  }
}

// ── Helpers ────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
