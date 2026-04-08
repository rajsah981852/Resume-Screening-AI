// ============================================================
// admin.js — Admin Panel Logic
// ============================================================

// ── Guard & Init ───────────────────────────────────────────

const adminUser = requireAdmin();
if (adminUser) {
  document.getElementById('admin-name').textContent = adminUser.name || adminUser.email;

  // Load initial data
  loadStats();
  loadUsers();
  loadResumes();
}

// ── Section Navigation ─────────────────────────────────────

function switchAdminSection(name) {
  document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const section = document.getElementById(`section-${name}`);
  if (section) section.classList.add('active');

  const navItem = document.querySelector(`[data-section="${name}"]`);
  if (navItem) navItem.classList.add('active');
}

// ── Stats ──────────────────────────────────────────────────

async function loadStats() {
  try {
    const res = await apiRequest('/admin/stats');
    if (!res || !res.ok) return;

    const d = res.data;
    document.getElementById('stat-users').textContent = d.total_users ?? '—';
    document.getElementById('stat-resumes').textContent = d.total_resumes ?? '—';
    document.getElementById('stat-avg-score').textContent =
      d.average_score != null ? Math.round(d.average_score) + '%' : '—';

    // Recent resumes in dashboard
    const recentList = document.getElementById('recent-resumes-list');
    if (recentList && d.recent_resumes && d.recent_resumes.length) {
      recentList.innerHTML = d.recent_resumes.map(r => {
        const score = Math.round(r.score);
        const scoreClass = score >= 80 ? 'high' : score >= 50 ? 'mid' : 'low';
        const date = r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', {
          month: 'short', day: 'numeric', year: 'numeric'
        }) : '—';
        return `<div class="activity-item">
          <div>
            <span class="ai-filename">${escapeHtml(r.file_name || '—')}</span>
          </div>
          <div style="display:flex;align-items:center;gap:12px">
            <span class="score-pill ${scoreClass}">${score}%</span>
            <span class="ai-date">${date}</span>
          </div>
        </div>`;
      }).join('');
    } else if (recentList) {
      recentList.innerHTML = '<p style="color:var(--text-mute);padding:16px 0;font-size:0.9rem">No resumes analyzed yet.</p>';
    }

  } catch (err) {
    console.error('Stats load error:', err);
  }
}

// ── Users ──────────────────────────────────────────────────

async function loadUsers() {
  const loadingEl = document.getElementById('users-loading');
  const tableEl = document.getElementById('users-table-container');
  const bodyEl = document.getElementById('users-body');

  if (!loadingEl) return;

  loadingEl.classList.remove('hidden');
  tableEl.classList.add('hidden');

  try {
    const res = await apiRequest('/admin/users');
    if (!res) return;

    loadingEl.classList.add('hidden');

    if (!res.ok) {
      loadingEl.innerHTML = `<p style="color:var(--red)">Failed to load users: ${res.data.detail || 'Error'}</p>`;
      loadingEl.classList.remove('hidden');
      return;
    }

    const users = res.data || [];
    tableEl.classList.remove('hidden');

    if (!users.length) {
      bodyEl.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--text-mute);padding:32px">No users found</td></tr>';
      return;
    }

    bodyEl.innerHTML = users.map(u => `
      <tr>
        <td>${escapeHtml(u.name || '—')}</td>
        <td style="color:var(--text-dim)">${escapeHtml(u.email)}</td>
        <td><span class="role-pill ${u.role}">${u.role}</span></td>
        <td>
          ${u.role !== 'admin' ? `<button class="btn-icon-danger" onclick="confirmDelete('user', '${u._id}', '${escapeHtml(u.email)}')">Delete</button>` : '<span style="color:var(--text-mute);font-size:0.8rem">Protected</span>'}
        </td>
      </tr>
    `).join('');

  } catch (err) {
    loadingEl.innerHTML = '<p style="color:var(--red);padding:16px">Error loading users.</p>';
    loadingEl.classList.remove('hidden');
  }
}

// ── Resumes ────────────────────────────────────────────────

async function loadResumes() {
  const loadingEl = document.getElementById('resumes-loading');
  const tableEl = document.getElementById('resumes-table-container');
  const bodyEl = document.getElementById('resumes-body');

  if (!loadingEl) return;

  loadingEl.classList.remove('hidden');
  tableEl.classList.add('hidden');

  try {
    const res = await apiRequest('/admin/resumes');
    if (!res) return;

    loadingEl.classList.add('hidden');

    if (!res.ok) {
      loadingEl.innerHTML = `<p style="color:var(--red)">Failed to load resumes.</p>`;
      loadingEl.classList.remove('hidden');
      return;
    }

    const resumes = res.data || [];
    tableEl.classList.remove('hidden');

    if (!resumes.length) {
      bodyEl.innerHTML = '<tr><td colspan="6" style="text-align:center;color:var(--text-mute);padding:32px">No resumes found</td></tr>';
      return;
    }

    bodyEl.innerHTML = resumes.map(r => {
      const score = Math.round(r.score);
      const scoreClass = score >= 80 ? 'high' : score >= 50 ? 'mid' : 'low';
      const date = r.created_at ? new Date(r.created_at).toLocaleDateString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric'
      }) : '—';
      const skillsCount = Array.isArray(r.skills_found) ? r.skills_found.length : 0;

      return `<tr>
        <td>${escapeHtml(r.file_name || '—')}</td>
        <td style="color:var(--text-dim);font-size:0.85rem">${escapeHtml(r.user_email || r.user_id || '—')}</td>
        <td><span class="score-pill ${scoreClass}">${score}%</span></td>
        <td>${skillsCount} skill${skillsCount !== 1 ? 's' : ''}</td>
        <td style="color:var(--text-dim);font-size:0.8rem">${date}</td>
        <td><button class="btn-icon-danger" onclick="confirmDelete('resume', '${r._id}', '${escapeHtml(r.file_name || 'this record')}')">Delete</button></td>
      </tr>`;
    }).join('');

  } catch (err) {
    loadingEl.innerHTML = '<p style="color:var(--red);padding:16px">Error loading resumes.</p>';
    loadingEl.classList.remove('hidden');
  }
}

// ── Delete Confirm Modal ───────────────────────────────────

let pendingDelete = null;

function confirmDelete(type, id, label) {
  pendingDelete = { type, id };

  const modal = document.getElementById('confirm-modal');
  const msg = document.getElementById('confirm-message');
  const btn = document.getElementById('confirm-btn');

  msg.textContent = `Delete ${type === 'user' ? 'user' : 'resume record'} "${label}"? This action cannot be undone.`;
  btn.onclick = executeDelete;

  modal.classList.remove('hidden');
}

function closeModal() {
  pendingDelete = null;
  document.getElementById('confirm-modal').classList.add('hidden');
}

async function executeDelete() {
  if (!pendingDelete) return;

  const { type, id } = pendingDelete;
  closeModal();

  const endpoint = type === 'user' ? `/admin/user/${id}` : `/admin/resume/${id}`;

  try {
    const res = await apiRequest(endpoint, { method: 'DELETE' });
    if (res && res.ok) {
      // Reload affected section
      if (type === 'user') {
        loadUsers();
        loadStats();
      } else {
        loadResumes();
        loadStats();
      }
    } else {
      alert('Delete failed: ' + ((res && res.data && res.data.detail) || 'Unknown error'));
    }
  } catch (err) {
    alert('Delete failed: Cannot connect to server.');
  }
}

// Close modal on overlay click
document.getElementById('confirm-modal').addEventListener('click', function(e) {
  if (e.target === this) closeModal();
});

// ── Helpers ────────────────────────────────────────────────

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
