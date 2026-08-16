// Shared step-sidebar menu, injected into every DualAscent app page so the
// navigation stays identical everywhere. Runs synchronously (no fetch — this
// keeps it working from a plain file:// open, no server required), so this
// script tag must be included before app.js in each page.
(function () {
    const mount = document.getElementById('step-sidebar');
    if (!mount) return;

    mount.innerHTML = `
        <div id="progress-panel">
            <div class="progress-ring" id="progress-ring"><div class="progress-ring-hole"></div></div>
            <div>
                <div id="progress-ring-label">0/5 steps complete</div>
                <div class="badge-shelf" id="badge-shelf"></div>
            </div>
        </div>

        <div class="step-nav">
            <a class="tab-btn" data-tab="tab-household" href="household.html">
                <span class="step-num">1</span>
                <span class="step-label">Household</span>
                <span class="step-status" id="step-status-tab-household"></span>
            </a>
            <a class="tab-btn" data-tab="tab-archetype" href="archetype.html">
                <span class="step-num">2</span>
                <span class="step-label">Financial Personality</span>
                <span class="step-status" id="step-status-tab-archetype"></span>
            </a>
            <a class="tab-btn" data-tab="tab-profile" href="profile.html">
                <span class="step-num">3</span>
                <span class="step-label">My Profile</span>
                <span class="step-status" id="step-status-tab-profile"></span>
            </a>
            <a class="tab-btn" data-tab="tab-csp" href="csp.html">
                <span class="step-num">4</span>
                <span class="step-label">Spending Plan</span>
                <span class="step-status" id="step-status-tab-csp"></span>
            </a>
            <a class="tab-btn" data-tab="tab-alignment" href="alignment.html">
                <span class="step-num">5</span>
                <span class="step-label">Vision & Dialogue</span>
                <span class="step-status" id="step-status-tab-alignment"></span>
            </a>
            <a class="tab-btn" data-tab="tab-goals" href="goals.html">
                <span class="step-num">6</span>
                <span class="step-label">Goals</span>
                <span class="step-status" id="step-status-tab-goals"></span>
            </a>
            <a class="tab-btn" data-tab="tab-learning" href="learning.html">
                <span class="step-num">7</span>
                <span class="step-label">Learning Together</span>
                <span class="step-status" id="step-status-tab-learning"></span>
            </a>
            <a class="tab-btn" data-tab="tab-grow" href="grow.html">
                <span class="step-num">8</span>
                <span class="step-label">Grow Together</span>
                <span class="step-status" id="step-status-tab-grow"></span>
            </a>
            <a class="tab-btn" data-tab="tab-ledger" href="ledger.html">
                <span class="step-num">9</span>
                <span class="step-label">Ledger</span>
                <span class="step-status" id="step-status-tab-ledger"></span>
            </a>
        </div>
    `;

    const currentPage = document.body.dataset.page;
    mount.querySelectorAll('.tab-btn').forEach(btn => {
        if (btn.dataset.tab === currentPage) btn.classList.add('active');
    });
})();
