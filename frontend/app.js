/* ================================================================
   EcoLens — Frontend Application Logic
   ================================================================ */

const API_BASE = '';  // Same origin — served by FastAPI

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

let selectedIndustry = 'Plastic Manufacturing';
let currentResults = null;
let pieChart = null;
let barChart = null;
let selectedFile = null;

// ---------------------------------------------------------------------------
// Initialization
// ---------------------------------------------------------------------------

document.addEventListener('DOMContentLoaded', () => {
    initTabs();
    initChips();
    initUpload();
    initChatInput();
    checkHealth();
});

// ---------------------------------------------------------------------------
// Health Check
// ---------------------------------------------------------------------------

async function checkHealth() {
    const dot = document.querySelector('.status-dot');
    const text = document.querySelector('.status-text');
    try {
        const res = await fetch(`${API_BASE}/api/database/status`);
        const data = await res.json();
        dot.classList.add('online');
        const parts = [];
        if (data.emission_factors_loaded) parts.push(`${data.emission_factor_count} factors`);
        if (data.chroma_ready) parts.push(`ChromaDB ✓`);
        if (data.gemini_configured) parts.push(`Gemini ✓`);
        text.textContent = parts.join(' · ') || 'Online';
    } catch {
        dot.classList.remove('online');
        text.textContent = 'Backend offline';
    }
}

// ---------------------------------------------------------------------------
// Tab Navigation
// ---------------------------------------------------------------------------

function initTabs() {
    document.querySelectorAll('.tab').forEach(tab => {
        tab.addEventListener('click', () => {
            const target = tab.dataset.tab;
            document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
            document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
            tab.classList.add('active');
            document.getElementById(`panel-${target}`).classList.add('active');
        });
    });
}

// ---------------------------------------------------------------------------
// Industry Chips
// ---------------------------------------------------------------------------

function initChips() {
    document.querySelectorAll('.chip').forEach(chip => {
        chip.addEventListener('click', () => {
            document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            selectedIndustry = chip.dataset.industry;
        });
    });
}

// ---------------------------------------------------------------------------
// Chat
// ---------------------------------------------------------------------------

function initChatInput() {
    const textarea = document.getElementById('chatInput');
    textarea.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendChat();
        }
    });
    // Auto-resize
    textarea.addEventListener('input', () => {
        textarea.style.height = 'auto';
        textarea.style.height = Math.min(textarea.scrollHeight, 120) + 'px';
    });
}

async function sendChat() {
    const input = document.getElementById('chatInput');
    const message = input.value.trim();
    if (!message) return;

    // Add user message
    appendMessage('user', message);
    input.value = '';
    input.style.height = 'auto';

    // Disable input
    const sendBtn = document.getElementById('chatSendBtn');
    sendBtn.disabled = true;

    // Show typing indicator
    const typingId = appendMessage('bot', '<div class="typing-dots"><span>●</span><span>●</span><span>●</span> Analyzing with Gemini AI...</div>');

    try {
        const res = await fetch(`${API_BASE}/api/analyze/chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message }),
        });
        const data = await res.json();

        // Remove typing indicator
        removeMessage(typingId);

        if (data.warnings && data.warnings.length > 0 && data.activities.length === 0) {
            appendMessage('bot', `⚠️ ${data.warnings.join(' ')}`);
        } else {
            const total = data.facility_summary.total_emissions_kg_co2e;
            const actCount = data.activities.length;
            const leakCount = data.leak_points.length;
            const recCount = data.circular_recommendations.length;

            let summary = `✅ <strong>Analysis Complete!</strong><br>`;
            summary += `🏭 Industry: ${data.facility_summary.industry}<br>`;
            summary += `📊 ${actCount} activities → <strong>${formatNumber(total)} kg CO₂e</strong> total<br>`;
            summary += `🔴 ${leakCount} leak point${leakCount !== 1 ? 's' : ''} detected<br>`;
            if (recCount > 0) {
                const savings = data.circular_recommendations.reduce((s, r) => s + r.co2e_savings_kg, 0);
                summary += `♻️ ${recCount} circular recommendation${recCount !== 1 ? 's' : ''} → <strong>${formatNumber(savings)} kg CO₂e</strong> potential savings`;
            }
            summary += `<br><br><em>Scroll down to see the full breakdown ↓</em>`;

            appendMessage('bot', summary);
            renderResults(data);
        }
    } catch (err) {
        removeMessage(typingId);
        appendMessage('bot', `❌ Error: ${err.message}. Is the backend running?`);
    }

    sendBtn.disabled = false;
}

function appendMessage(role, html) {
    const container = document.getElementById('chatMessages');
    const id = 'msg-' + Date.now();
    const avatar = role === 'user' ? '👤' : '🤖';
    const div = document.createElement('div');
    div.className = `message ${role}`;
    div.id = id;
    div.innerHTML = `
        <div class="message-avatar">${avatar}</div>
        <div class="message-content">${html}</div>
    `;
    container.appendChild(div);
    container.scrollTop = container.scrollHeight;
    return id;
}

function removeMessage(id) {
    const el = document.getElementById(id);
    if (el) el.remove();
}

// ---------------------------------------------------------------------------
// Form Analysis
// ---------------------------------------------------------------------------

function addActivity() {
    const list = document.getElementById('activitiesList');
    const idx = list.children.length;
    const row = document.createElement('div');
    row.className = 'activity-row';
    row.dataset.index = idx;
    row.innerHTML = `
        <input type="text" class="input-name" placeholder="Activity (e.g. diesel, grid electricity, virgin HDPE)">
        <input type="number" class="input-qty" placeholder="Quantity" min="0">
        <input type="text" class="input-unit" placeholder="Unit">
        <button class="remove-btn" onclick="removeActivity(this)" title="Remove">×</button>
    `;
    list.appendChild(row);
    row.querySelector('.input-name').focus();
}

function removeActivity(btn) {
    const list = document.getElementById('activitiesList');
    if (list.children.length <= 1) return; // Keep at least one row
    btn.closest('.activity-row').remove();
}

async function analyzeForm() {
    const rows = document.querySelectorAll('.activity-row');
    const activities = [];

    for (const row of rows) {
        const name = row.querySelector('.input-name').value.trim();
        const qty = parseFloat(row.querySelector('.input-qty').value);
        const unit = row.querySelector('.input-unit').value.trim();
        if (name && !isNaN(qty) && qty > 0 && unit) {
            activities.push({ name, quantity: qty, unit });
        }
    }

    if (activities.length === 0) {
        alert('Please add at least one valid activity.');
        return;
    }

    showLoading();

    try {
        const res = await fetch(`${API_BASE}/api/analyze`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ industry: selectedIndustry, activities }),
        });
        const data = await res.json();
        hideLoading();
        renderResults(data);
    } catch (err) {
        hideLoading();
        alert(`Error: ${err.message}`);
    }
}

// ---------------------------------------------------------------------------
// Document Upload
// ---------------------------------------------------------------------------

function initUpload() {
    const zone = document.getElementById('uploadZone');
    const fileInput = document.getElementById('fileInput');

    zone.addEventListener('click', () => fileInput.click());

    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('dragover');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('dragover');
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('dragover');
        if (e.dataTransfer.files.length > 0) {
            handleFile(e.dataTransfer.files[0]);
        }
    });

    fileInput.addEventListener('change', () => {
        if (fileInput.files.length > 0) {
            handleFile(fileInput.files[0]);
        }
    });
}

function handleFile(file) {
    selectedFile = file;
    document.getElementById('fileName').textContent = `📄 ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
    document.getElementById('uploadPreview').style.display = 'flex';
}

async function analyzeDocument() {
    if (!selectedFile) return;

    showLoading();

    try {
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('industry', selectedIndustry);

        const res = await fetch(`${API_BASE}/api/analyze/document`, {
            method: 'POST',
            body: formData,
        });
        const data = await res.json();
        hideLoading();
        renderResults(data);
    } catch (err) {
        hideLoading();
        alert(`Error: ${err.message}`);
    }
}

// ---------------------------------------------------------------------------
// Loading State
// ---------------------------------------------------------------------------

function showLoading() {
    document.getElementById('loadingSection').style.display = 'flex';
    document.getElementById('resultsSection').style.display = 'none';
}

function hideLoading() {
    document.getElementById('loadingSection').style.display = 'none';
}

// ---------------------------------------------------------------------------
// Results Rendering
// ---------------------------------------------------------------------------

function renderResults(data) {
    currentResults = data;
    const section = document.getElementById('resultsSection');
    section.style.display = 'block';

    // Smooth scroll to results
    setTimeout(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }), 100);

    renderSummary(data);
    renderCharts(data);
    renderTable(data);
    renderLeakPoints(data);
    renderRecommendations(data);
    renderWarnings(data);
}

function renderSummary(data) {
    const total = data.facility_summary.total_emissions_kg_co2e;
    const leaks = data.leak_points.length;
    const savings = data.circular_recommendations.reduce((s, r) => s + r.co2e_savings_kg, 0);
    const dqi = data.facility_summary.data_quality_index || 100;
    const scopes = data.facility_summary.scope_breakdown || {};

    animateNumber('totalEmissions', total);
    animateNumber('leakPointCount', leaks, 0);
    animateNumber('totalSavings', savings);
    
    document.getElementById('dqiScore').textContent = `${dqi}% verified`;
    document.getElementById('industryName').textContent = data.facility_summary.industry;

    // Scope breakdown pills
    document.getElementById('scope1Val').textContent = `${formatNumber(scopes.scope_1_kg || 0)} kg`;
    document.getElementById('scope1Pct').textContent = `(${scopes.scope_1_pct || 0}%)`;
    document.getElementById('scope2Val').textContent = `${formatNumber(scopes.scope_2_kg || 0)} kg`;
    document.getElementById('scope2Pct').textContent = `(${scopes.scope_2_pct || 0}%)`;
    document.getElementById('scope3Val').textContent = `${formatNumber(scopes.scope_3_kg || 0)} kg`;
    document.getElementById('scope3Pct').textContent = `(${scopes.scope_3_pct || 0}%)`;
}

function animateNumber(elementId, targetValue, decimals = 0) {
    const el = document.getElementById(elementId);
    if (!el) return;
    const duration = 1200;
    const start = performance.now();

    function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const current = targetValue * eased;
        el.textContent = formatNumber(current, decimals);
        if (progress < 1) requestAnimationFrame(update);
    }

    requestAnimationFrame(update);
}

function renderCharts(data) {
    const activities = data.activities.filter(a => a.status === 'resolved');
    if (activities.length === 0) return;

    // Collision-free unique labels (incorporating raw input name if distinct)
    const labels = activities.map((a, i) => {
        const base = formatKey(a.activity_key);
        if (a.raw_name && a.raw_name.toLowerCase() !== base.toLowerCase()) {
            return `${base} (${a.raw_name})`;
        }
        return base;
    });

    const values = activities.map(a => a.co2e_kg);
    const colors = activities.map((a, i) => {
        if (a.hotspot_tier === 'high') return 'rgba(239, 68, 68, 0.85)';
        if (a.hotspot_tier === 'medium') return 'rgba(245, 158, 11, 0.85)';
        if (a.scope.includes('1')) return 'rgba(234, 179, 8, 0.8)';
        if (a.scope.includes('2')) return 'rgba(59, 130, 246, 0.8)';
        return [
            'rgba(168, 85, 247, 0.8)',
            'rgba(16, 185, 129, 0.8)',
            'rgba(6, 182, 212, 0.8)',
        ][i % 3];
    });

    // Pie chart
    if (pieChart) pieChart.destroy();
    pieChart = new Chart(document.getElementById('emissionPieChart'), {
        type: 'doughnut',
        data: {
            labels,
            datasets: [{
                data: values,
                backgroundColor: colors,
                borderColor: 'rgba(10, 14, 23, 0.8)',
                borderWidth: 2,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: { color: '#94a3b8', font: { family: 'Inter', size: 11 }, padding: 14 },
                },
                tooltip: {
                    callbacks: {
                        label: (ctx) => {
                            const act = activities[ctx.dataIndex];
                            return `${ctx.label}: ${formatNumber(ctx.raw)} kg CO₂e (${act.share_percent}% | ${act.scope})`;
                        },
                    },
                },
            },
            cutout: '60%',
            animation: { animateRotate: true, duration: 1000 },
        },
    });

    // Bar chart
    if (barChart) barChart.destroy();
    barChart = new Chart(document.getElementById('emissionBarChart'), {
        type: 'bar',
        data: {
            labels,
            datasets: [{
                label: 'CO₂e (kg)',
                data: values,
                backgroundColor: colors,
                borderRadius: 6,
                borderSkipped: false,
            }],
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            indexAxis: 'y',
            plugins: {
                legend: { display: false },
                tooltip: {
                    callbacks: {
                        label: (ctx) => `${formatNumber(ctx.raw)} kg CO₂e (${activities[ctx.dataIndex].share_percent}% total)`,
                    },
                },
            },
            scales: {
                x: {
                    grid: { color: 'rgba(255,255,255,0.04)' },
                    ticks: { color: '#64748b', font: { family: 'Inter' } },
                },
                y: {
                    grid: { display: false },
                    ticks: { color: '#94a3b8', font: { family: 'Inter', size: 11 } },
                },
            },
            animation: { duration: 1000 },
        },
    });
}

function renderTable(data) {
    const tbody = document.getElementById('activitiesBody');
    tbody.innerHTML = '';

    for (const a of data.activities) {
        const isLeak = a.is_leak_point;
        const scopeClass = a.scope.includes('1') ? 'scope1' : a.scope.includes('2') ? 'scope2' : 'scope3';
        const tr = document.createElement('tr');
        if (isLeak) tr.className = 'leak-row';
        
        const tierBadge = a.hotspot_tier === 'high'
            ? '<span class="badge badge-tier-high">🔴 Primary Hotspot</span>'
            : a.hotspot_tier === 'medium'
            ? '<span class="badge badge-tier-medium">🟠 Secondary Hotspot</span>'
            : '<span class="badge badge-tier-low">Normal</span>';

        const auditTrail = a.audit_note ? `<span class="audit-note-text">ℹ️ ${a.audit_note}</span>` : '';

        tr.innerHTML = `
            <td><strong>${formatKey(a.activity_key)}</strong><br><span style="font-size:0.75rem;color:var(--text-muted)">${a.raw_name}</span></td>
            <td>${formatNumber(a.quantity)} ${a.unit}</td>
            <td><strong>${formatNumber(a.normalized_quantity)} ${a.normalized_unit}</strong>${auditTrail}</td>
            <td><span class="badge-${scopeClass}">${a.scope}</span></td>
            <td>${a.emission_factor} / ${a.normalized_unit}</td>
            <td><strong>${formatNumber(a.co2e_kg)}</strong></td>
            <td>${a.share_percent}%</td>
            <td>${tierBadge}</td>
        `;
        tbody.appendChild(tr);
    }

    // Unresolved Activities
    for (const u of (data.unresolved_activities || [])) {
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td><strong>${u.raw_name}</strong><br><span style="font-size:0.75rem;color:var(--accent-amber)">💡 ${u.suggested_action || 'Check activity spelling'}</span></td>
            <td>${u.quantity} ${u.unit}</td>
            <td>—</td>
            <td>—</td>
            <td>—</td>
            <td>—</td>
            <td>—</td>
            <td><span class="badge" style="background:var(--accent-amber-dim);color:var(--accent-amber)">⚠️ Unresolved</span></td>
        `;
        tbody.appendChild(tr);
    }
}

function renderLeakPoints(data) {
    const container = document.getElementById('leakCards');
    container.innerHTML = '';

    if (data.leak_points.length === 0) {
        document.getElementById('leakPointsSection').style.display = 'none';
        return;
    }
    document.getElementById('leakPointsSection').style.display = 'block';

    for (const lp of data.leak_points) {
        const card = document.createElement('div');
        card.className = 'leak-card-item';
        const tierIcon = lp.hotspot_tier === 'high' ? '🔴' : '🟠';
        const tierTitle = lp.hotspot_tier === 'high' ? 'Primary Hotspot' : 'Secondary Contributor';

        card.innerHTML = `
            <div class="leak-title">
                ${tierIcon} ${formatKey(lp.activity_key)}
                <span style="font-size:0.75rem;font-weight:normal;color:var(--text-muted)">(${tierTitle})</span>
            </div>
            <p style="font-size:0.85rem;color:var(--text-secondary)">
                This activity accounts for <strong style="color:var(--accent-red)">${lp.share_percent}%</strong> of facility emissions.
                ${lp.audit_note ? `<br><span style="font-size:0.75rem;color:var(--accent-blue)">${lp.audit_note}</span>` : ''}
            </p>
            <div class="leak-stats">
                <div class="leak-stat">
                    <div class="leak-stat-label">Calculated CO₂e</div>
                    <div class="leak-stat-value">${formatNumber(lp.co2e_kg)} kg</div>
                </div>
                <div class="leak-stat">
                    <div class="leak-stat-label">Facility Share</div>
                    <div class="leak-stat-value">${lp.share_percent}%</div>
                </div>
                <div class="leak-stat">
                    <div class="leak-stat-label">GHG Scope</div>
                    <div class="leak-stat-value" style="color:var(--text-secondary);font-size:0.9rem">${lp.scope}</div>
                </div>
                <div class="leak-stat">
                    <div class="leak-stat-label">Normalized Qty</div>
                    <div class="leak-stat-value" style="color:var(--text-secondary);font-size:0.9rem">${formatNumber(lp.normalized_quantity)} ${lp.normalized_unit}</div>
                </div>
            </div>
        `;
        container.appendChild(card);
    }
}

function renderRecommendations(data) {
    const container = document.getElementById('recCards');
    container.innerHTML = '';

    if (data.circular_recommendations.length === 0) {
        document.getElementById('recommendationsSection').style.display = 'none';
        return;
    }
    document.getElementById('recommendationsSection').style.display = 'block';

    for (const rec of data.circular_recommendations) {
        const card = document.createElement('div');
        card.className = 'rec-card-item';
        
        const difficultyColor = rec.technical_difficulty === 'Low' ? 'var(--accent-green)' : rec.technical_difficulty === 'Medium' ? 'var(--accent-amber)' : 'var(--accent-red)';

        card.innerHTML = `
            <div class="rec-header">
                <span class="rec-from">${formatKey(rec.target_activity)}</span>
                <span class="rec-arrow">→</span>
                <span class="rec-to">${formatKey(rec.alternative)}</span>
                <span class="badge" style="background:rgba(255,255,255,0.06);margin-left:auto;color:${difficultyColor}">
                    ${rec.technical_difficulty} Complexity
                </span>
            </div>
            <p style="font-size:0.85rem;color:var(--text-secondary)">
                Switching to <strong>${formatKey(rec.alternative)}</strong> for ${formatNumber(rec.quantity_kg)} kg
                (${rec.substitution_percent}% max certified blend) avoids <strong style="color:var(--accent-green)">${formatNumber(rec.co2e_savings_kg)} kg CO₂e</strong> (${rec.co2e_reduction_percent}% cut).
            </p>
            <div class="rec-stats">
                <div class="rec-stat">
                    <div class="rec-stat-label">CO₂e Savings</div>
                    <div class="rec-stat-value green">${formatNumber(rec.co2e_savings_kg)} kg</div>
                </div>
                <div class="rec-stat">
                    <div class="rec-stat-label">Scaled CAPEX</div>
                    <div class="rec-stat-value blue">${rec.estimated_capex_inr ? formatINR(rec.estimated_capex_inr) : (rec.estimated_capex_usd ? formatINR(rec.estimated_capex_usd * 84) : 'N/A')}</div>
                </div>
                <div class="rec-stat">
                    <div class="rec-stat-label">Payback Period</div>
                    <div class="rec-stat-value amber">${rec.payback_months ? rec.payback_months + ' mo' : 'ESG Basis'}</div>
                </div>
            </div>
            <div class="rec-stats" style="grid-template-columns: 1fr 1fr; margin-top: 8px;">
                <div class="rec-stat">
                    <div class="rec-stat-label">Feasibility Score</div>
                    <div class="rec-stat-value" style="color:var(--accent-green);font-size:0.95rem">${rec.feasibility_score}/100</div>
                </div>
                <div class="rec-stat">
                    <div class="rec-stat-label">Annual OPEX Delta</div>
                    <div class="rec-stat-value" style="color:var(--text-primary);font-size:0.95rem">${rec.annual_opex_savings_inr ? '+' + formatINR(rec.annual_opex_savings_inr) + '/yr' : (rec.annual_opex_savings_usd ? '+' + formatINR(rec.annual_opex_savings_usd * 84) + '/yr' : 'Parity')}</div>
                </div>
            </div>
            <p style="font-size:0.76rem;color:var(--text-muted);margin-top:10px;line-height:1.4">
                <strong>Feasibility:</strong> ${rec.regulatory_readiness}<br>
                <em>${rec.financial_feasibility_note}</em>
            </p>
            <div class="rec-bar">
                <div class="rec-bar-fill" style="width: 0%;" data-width="${rec.co2e_reduction_percent}%"></div>
            </div>
        `;
        container.appendChild(card);

        // Animate bar fill
        setTimeout(() => {
            const fill = card.querySelector('.rec-bar-fill');
            if (fill) fill.style.width = `${rec.co2e_reduction_percent}%`;
        }, 100);
    }
}

function renderWarnings(data) {
    const section = document.getElementById('warningsSection');
    const list = document.getElementById('warningsList');
    list.innerHTML = '';

    if (!data.warnings || data.warnings.length === 0) {
        section.style.display = 'none';
        return;
    }

    section.style.display = 'block';
    for (const w of data.warnings) {
        const div = document.createElement('div');
        div.className = 'warning-item';
        div.innerHTML = `⚠️ ${w}`;
        list.appendChild(div);
    }
}

// ---------------------------------------------------------------------------
// Utilities
// ---------------------------------------------------------------------------

function formatNumber(n, decimals) {
    if (typeof decimals === 'undefined') {
        decimals = n >= 100 ? 0 : n >= 1 ? 1 : 2;
    }
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
    }).format(n);
}

function formatKey(key) {
    return key
        .replace(/_/g, ' ')
        .replace(/\b\w/g, c => c.toUpperCase());
}

function formatINR(val) {
    if (val === null || val === undefined || isNaN(val)) return 'N/A';
    return '₹' + new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(Math.round(val));
}
