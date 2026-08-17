// Shared step-sidebar menu, injected into every DualAscent app page so the
// navigation stays identical everywhere. Runs synchronously (no fetch — this
// keeps it working from a plain file:// open, no server required), so this
// script tag must be included before app.js in each page.
(function () {
    // Single source of truth for the step order, shared by the left sidebar
    // and the top-of-page Previous/Next nav below.
    const STEPS = [
        { tab: 'tab-archetype', href: 'financialpersonality.html', label: 'Financial Personality' },
        { tab: 'tab-profile', href: 'myprofile.html', label: 'My Profile' },
        { tab: 'tab-csp', href: 'spendingplan.html', label: 'Spending Plan' },
        { tab: 'tab-alignment', href: 'visiondialogue.html', label: 'Vision & Dialogue' },
        { tab: 'tab-goals', href: 'goals.html', label: 'Goals' },
        { tab: 'tab-household', href: 'household.html', label: 'Household' },
        { tab: 'tab-learning', href: 'learningtogether.html', label: 'Learning Together' },
        { tab: 'tab-grow', href: 'growtogether.html', label: 'Grow Together' },
        { tab: 'tab-ledger', href: 'ledger.html', label: 'Ledger' }
    ];

    const currentPage = document.body.dataset.page;

    // Admin link + notification badge, injected right next to the account
    // picture so it shows up wherever an admin happens to be — hidden by
    // default, app.js reveals it (and fills the badge) once it confirms the
    // signed-in user is actually an admin. Injected here rather than
    // hand-copied into every page's HTML, same reasoning as the sidebar below.
    const authBar = document.getElementById('auth-bar');
    const userButton = document.getElementById('user-button');
    if (authBar && userButton && !document.getElementById('admin-nav-link')) {
        const adminLinkHtml = `<a href="admin.html" class="support-link" id="admin-nav-link" style="display:none;">Admin<span id="admin-badge" class="admin-badge" style="display:none;"></span></a>`;
        userButton.insertAdjacentHTML('beforebegin', adminLinkHtml);
    }

    const sidebarMount = document.getElementById('step-sidebar');
    if (sidebarMount) {
        sidebarMount.innerHTML = `
            <div id="progress-panel">
                <div class="progress-ring" id="progress-ring"><div class="progress-ring-hole"></div></div>
                <div>
                    <div id="progress-ring-label">0/5 steps complete</div>
                    <div class="badge-shelf" id="badge-shelf"></div>
                </div>
            </div>

            <div class="step-nav">
                ${STEPS.map((step, i) => `
                    <a class="tab-btn" data-tab="${step.tab}" href="${step.href}">
                        <span class="step-num">${i + 1}</span>
                        <span class="step-label">${step.label}</span>
                        <span class="step-status" id="step-status-${step.tab}"></span>
                    </a>
                `).join('')}
            </div>

            <div class="step-nav step-nav-extra">
                <a class="tab-btn" data-tab="tab-connected" href="connectedaccounts.html">
                    <span class="step-num">🔗</span>
                    <span class="step-label">Connected Accounts</span>
                </a>
            </div>
        `;

        sidebarMount.querySelectorAll('.tab-btn').forEach(btn => {
            if (btn.dataset.tab === currentPage) btn.classList.add('active');
        });
    }

    const stepNavMount = document.getElementById('page-step-nav');
    if (stepNavMount) {
        const currentIndex = STEPS.findIndex(step => step.tab === currentPage);
        if (currentIndex !== -1) {
            const prevStep = STEPS[currentIndex - 1];
            const nextStep = STEPS[currentIndex + 1];
            stepNavMount.innerHTML = `
                ${prevStep ? `<a class="action-btn secondary-btn page-step-prev" href="${prevStep.href}">← Previous</a>` : '<span></span>'}
                ${nextStep ? `<a class="action-btn page-step-next" href="${nextStep.href}">Next →</a>` : ''}
            `;
        }
    }
})();
