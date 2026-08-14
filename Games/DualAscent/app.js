    // ================= Financial Personality data (Tori Dunlap's Enneagram & Money framework) =================
    const ARCHETYPES = {
        Perfectionist: {
            emoji: '📏',
            title: 'The Perfectionist',
            desc: "Driven by getting your finances exactly right. You track carefully and hold high standards for yourself — but a small budget slip can spiral into guilt or all-or-nothing thinking that keeps you stuck re-analyzing instead of moving forward."
        },
        Helper: {
            emoji: '🤲',
            title: 'The Helper',
            desc: "You show up for the people you love, financially and otherwise — covering a tab, lending a hand, picking up the check. The tricky part is remembering your own goals count too, and that saying no to someone else's ask isn't a failure to care."
        },
        Achiever: {
            emoji: '🏅',
            title: 'The Achiever',
            desc: "Net worth can feel like a scoreboard — for how hard you've worked and how far you've come. That drive is a real asset, but it can tip into lifestyle creep or status spending when your bank balance starts standing in for your worth."
        },
        Individualist: {
            emoji: '🎨',
            title: 'The Individualist',
            desc: "Spending is one of the ways you express who you are — and there's nothing wrong with that. Where it gets messy is the unglamorous stuff: budgets, bills, and spreadsheets can feel so mundane that they're easy to avoid."
        },
        Investigator: {
            emoji: '🔎',
            title: 'The Investigator',
            desc: "You'd rather over-research and over-save than be caught off guard. That instinct can build real security, but taken far enough, it can turn into hoarding information or money out of a quiet fear that there will never be enough."
        },
        Loyalist: {
            emoji: '🛡️',
            title: 'The Loyalist',
            desc: "Security is the whole point. You plan for what could go wrong, and that worst-case-scenario thinking has probably saved you more than once. The flip side is a risk aversion that can keep you from moves that would actually serve you."
        },
        Enthusiast: {
            emoji: '🎉',
            title: 'The Enthusiast',
            desc: "Money is freedom — the ticket to the next trip, the next fun night out, the next new thing. That enthusiasm is contagious, but budgets can feel like a cage, which makes impulse spending an easy trap."
        },
        Challenger: {
            emoji: '💪',
            title: 'The Challenger',
            desc: "Money is power, protection, and independence to you, and you're not shy about asking for what you're worth. That assertiveness is a strength at the negotiating table — just watch for using money as a way to control situations or people."
        },
        Peacemaker: {
            emoji: '🕊️',
            title: 'The Peacemaker',
            desc: "You'd rather keep the peace than look closely at an uncomfortable number. Conflict-avoidance can mean unopened statements and unspoken money resentments quietly piling up instead of getting addressed."
        }
    };

    const QUIZ_QUESTIONS = [
        { text: "A small budgeting mistake can send me into a spiral of guilt or over-analysis.", script: 'Perfectionist' },
        { text: "I often cover costs for friends or family before I look after my own savings goals.", script: 'Helper' },
        { text: "I measure some of my success by my net worth or what I can afford to show for it.", script: 'Achiever' },
        { text: "I'd rather spend on something that feels like \"me\" than stick to a generic budget category.", script: 'Individualist' },
        { text: "I feel safer the more I've researched or saved, even if it means holding back from spending.", script: 'Investigator' },
        { text: "I spend a lot of energy planning for worst-case financial scenarios.", script: 'Loyalist' },
        { text: "Strict budget rules make me want to break them, and I'd rather chase the next fun experience.", script: 'Enthusiast' },
        { text: "I use money to stay in control of my situation, and I'm comfortable negotiating hard for what I'm worth.", script: 'Challenger' },
        { text: "I'd rather avoid checking a number than deal with the discomfort of an uncomfortable one.", script: 'Peacemaker' }
    ];

    // ================= Grow Together: couple financial dynamics =================
    const COUPLE_DYNAMICS = {
        saverSpender: {
            emoji: '⚖️',
            title: 'The Saver vs. The Spender',
            desc: "One partner feels anxious whenever money leaves the account; the other feels constrained or judged by too much caution. Left unspoken, it turns into a recurring fight about a purchase instead of a conversation about what safety and enjoyment mean to each of you.",
            questions: [
                "When you were growing up, was money talked about openly, or was it tense or avoided?",
                "What's a purchase you've made that you still feel a little guilty about — and why?",
                "What would \"enough\" savings actually feel like to you?"
            ],
            actions: [
                "Build a guilt-free spending number into the budget (see the Spending Plan tab) so the spender has permission and the saver has a ceiling.",
                "Try a standing monthly money date instead of in-the-moment purchase debates.",
                "Separate small joy purchases from major financial decisions — only the latter need a joint sign-off."
            ],
            source: "Concept studied by consumer psychologists as \"tightwad/spendthrift\" mismatches in relationships (Scott Rick and colleagues)."
        },
        invisibleBurden: {
            emoji: '🧾',
            title: 'The Invisible Burden',
            desc: "One partner manages most or all of the household's financial logistics — bills, budgeting, planning — while the other stays disengaged or out of the loop. It can look like teamwork from the outside while quietly building resentment on the inside.",
            questions: [
                "Can you name every recurring bill and when it's due, without checking? Can I?",
                "Whose name is actually on the accounts, the budget, and the tax filing?",
                "Does how we split financial tasks feel fair to both of us — not just efficient?"
            ],
            actions: [
                "Trade roles for one billing cycle so the less-involved partner learns the full picture firsthand.",
                "Put every recurring account, password, and due date somewhere both partners can access.",
                "Schedule a recurring check-in (see your Check-In Frequency preference) so visibility isn't left to one person to maintain."
            ],
            source: "Related to the financial enmeshment and avoidance imbalances described in Klontz & Britt's money-script research — see Sources below."
        },
        incomeDisparity: {
            emoji: '📊',
            title: 'Income Disparities',
            desc: "When one partner earns significantly more than the other, money can start to carry unspoken power — over decisions, over guilt, over who \"gets a say.\" Naming the dynamic directly tends to defuse it.",
            questions: [
                "Does the income gap between us ever change how a decision actually gets made?",
                "Does either of us feel like we've earned more or less say because of what we bring in?",
                "How do we want to define \"fair\" when it doesn't mean \"equal\"?"
            ],
            actions: [
                "Consider contributions proportional to income rather than a strict 50/50 split, if that feels fairer to you both.",
                "Separate financial contribution from decision-making power — keep major decisions joint regardless of who earns more.",
                "Revisit the split whenever either income changes significantly, not just once."
            ],
            source: "Studied by economists researching relative income within households (Marianne Bertrand, Emir Kamenica, Jessica Pan)."
        },
        phantomGoals: {
            emoji: '👻',
            title: 'Phantom Financial Goals',
            desc: "Saving diligently toward a big number — \"a million dollars,\" \"early retirement\" — without a clear picture of what it's actually for. The goal keeps growing, but nobody feels closer to enjoying it.",
            questions: [
                "If we hit this goal tomorrow, what would actually change about our lives?",
                "Is there a number we're saving toward that we've never actually said out loud to each other?",
                "What's one thing we're \"saving for later\" that we could safely enjoy now?"
            ],
            actions: [
                "Attach a specific why and dollar figure to every goal in your Goals tab — replace vague targets with concrete ones.",
                "Set a spend milestone alongside your savings milestone — something you'll actually do at 25%, 50%, 100%.",
                "Revisit the Vision & Dialogue tab together and write down what the money is actually for."
            ],
            source: "An extension of Ramit Sethi's \"Rich Life\" framework — see Sources below."
        },
        mergedAccounts: {
            emoji: '🏦',
            title: 'Merged vs. Separate Accounts',
            desc: "Some couples pool everything into joint accounts; others keep finances mostly separate. Neither is inherently right — but an unexamined default can create friction if it doesn't match either partner's need for togetherness or autonomy.",
            questions: [
                "Would you feel more secure or more boxed in by a fully joint account?",
                "Is there anything about full financial transparency that makes you uneasy?",
                "What would a hybrid setup — some joint, some individual — need to look like for both of us?"
            ],
            actions: [
                "Try a \"yours, mine, ours\" structure — a joint account for shared expenses, individual accounts for personal spending.",
                "Set a dollar threshold above which purchases from individual accounts still get discussed together.",
                "Revisit the setup after a big life change — raise, new baby, job loss — instead of assuming it still fits."
            ],
            source: "Studied by behavioral scientists researching joint vs. separate account structures and relationship satisfaction (Jenny Olson, Scott Rick, and colleagues)."
        },
        financialInfidelity: {
            emoji: '🤫',
            title: 'Financial Secrets',
            desc: "Hidden purchases, secret accounts, or debt one partner doesn't know about. Even small, well-intentioned omissions erode the trust that a shared financial life depends on.",
            questions: [
                "Is there a purchase, account, or debt you've kept from me — even a small one?",
                "What would make it feel safe to tell each other about a financial mistake?",
                "Do we both actually know our full combined financial picture right now?"
            ],
            actions: [
                "Do a full joint account and debt review together, once, with no judgment attached — just visibility.",
                "Agree on a dollar threshold above which either partner always tells the other before spending.",
                "If something's already hidden, disclose it on your own terms in a calm moment rather than letting it surface in a fight."
            ],
            source: "Reflects patterns tracked in National Endowment for Financial Education (NEFE) financial infidelity survey research."
        }
    };

    let growExpandedKey = null;

    let appState = {
        myArchetype: null,
        xp: 0,
        badges: {},
        cspVisited: false
    };

    function renderArchetypeGrid() {
        const grid = document.getElementById('archetype-grid');
        grid.innerHTML = Object.keys(ARCHETYPES).map(key => {
            const a = ARCHETYPES[key];
            return `
                <div class="archetype-card" data-key="${key}" onclick="saveArchetype('${key}')">
                    <h4>${a.emoji} ${a.title}</h4>
                    <p>${a.desc}</p>
                    <a class="learn-more-link" href="FinancialPersonalities.html?type=${key}" onclick="event.stopPropagation()">Learn more →</a>
                </div>
            `;
        }).join('');
        renderArchetypeSelection();
    }

    function renderArchetypeSelection() {
        document.querySelectorAll('.archetype-card').forEach(card => {
            card.classList.toggle('selected', card.dataset.key === appState.myArchetype);
        });
    }

    function toggleQuiz() {
        const panel = document.getElementById('quiz-panel');
        const nowVisible = panel.style.display !== 'block';
        panel.style.display = nowVisible ? 'block' : 'none';
    }

    function renderQuizQuestions() {
        const wrap = document.getElementById('quiz-questions');
        wrap.innerHTML = QUIZ_QUESTIONS.map((q, i) => `
            <div class="quiz-question">
                <label>${i + 1}. ${q.text}</label>
                <div class="likert-row">
                    ${[1, 2, 3, 4, 5].map(v => `<label class="likert-opt"><input type="radio" name="quiz-q${i}" value="${v}">${v}</label>`).join('')}
                </div>
                <div class="likert-scale-labels"><span>Disagree</span><span>Agree</span></div>
            </div>
        `).join('');
    }

    function submitQuiz() {
        const scores = {};
        Object.keys(ARCHETYPES).forEach(key => { scores[key] = 0; });
        let answeredAll = true;
        QUIZ_QUESTIONS.forEach((q, i) => {
            const checked = document.querySelector(`input[name="quiz-q${i}"]:checked`);
            if (!checked) { answeredAll = false; return; }
            scores[q.script] += parseInt(checked.value, 10);
        });
        if (!answeredAll) {
            alert('Please answer every question first.');
            return;
        }
        const max = Math.max(...Object.values(scores));
        const top = Object.keys(scores).filter(k => scores[k] === max);
        const resultBox = document.getElementById('quiz-result');
        resultBox.style.display = 'block';
        saveArchetype(top[0]);
        if (top.length === 1) {
            resultBox.innerHTML = `You lean most toward <strong>${ARCHETYPES[top[0]].title}</strong> ${ARCHETYPES[top[0]].emoji}.`;
        } else {
            resultBox.innerHTML = `You're a blend of <strong>${top.map(k => ARCHETYPES[k].title).join(' & ')}</strong> — we've set your primary as ${ARCHETYPES[top[0]].title} ${ARCHETYPES[top[0]].emoji}, but both show up for you.`;
        }
    }

    async function saveArchetype(script) {
        appState.myArchetype = script;
        renderArchetypeSelection();
        document.getElementById('archetype-continue').style.display = 'block';

        if (supabaseClient && currentHousehold) {
            const { error } = await supabaseClient.from('member_profiles').upsert({
                household_id: currentHousehold.id,
                clerk_user_id: myUserId(),
                archetype: script
            }, { onConflict: 'household_id,clerk_user_id' });
            if (error) console.error('Failed to save archetype:', error);
        }
        memberProfilesCache[myUserId()] = { ...(memberProfilesCache[myUserId()] || {}), archetype: script };

        awardXP(10, 'Archetype selected');
        unlockBadge('selfAware', '🧭', 'Self-Aware');
        checkTeamPlayerBadge();
        updateProgressRing();
        renderBadges();
        renderGrowGate();
    }

    function switchTab(tabId) {
        document.querySelectorAll('.tab-content').forEach(el => el.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(el => el.classList.remove('active'));

        document.getElementById(tabId).classList.add('active');
        const btn = document.querySelector('.tab-btn[data-tab="' + tabId + '"]');
        if (btn) btn.classList.add('active');

        const sourcesFooter = document.getElementById('sources');
        if (sourcesFooter) sourcesFooter.style.display = (tabId === 'tab-archetype') ? 'block' : 'none';

        if (tabId === 'tab-csp') { calculateCSP(); appState.cspVisited = true; updateProgressRing(); }
        if (tabId === 'tab-profile') hydrateMyProfileForm();
        if (tabId === 'tab-goals') { renderGoalsGate(); renderGoalsList(); }
        if (tabId === 'tab-ledger') { renderLedgerGate(); renderLedgerList(); renderBalanceSummary(); }
        if (tabId === 'tab-learning') { renderLearningGate(); renderLearningLists(); }
        if (tabId === 'tab-grow') renderGrowGate();
        if (tabId === 'tab-alignment') renderDialHint();
    }

    function onExpenseSliderInput(field) {
        document.getElementById('exp-' + field).value = document.getElementById('exp-' + field + '-slider').value;
        calculateCSP();
    }

    function syncExpenseSlider(field, income, currentValue) {
        const sliderEl = document.getElementById('exp-' + field + '-slider');
        if (!sliderEl) return;
        sliderEl.max = Math.max(income, currentValue, 100);
        sliderEl.value = currentValue;
    }

    function calculateCSP() {
        const income = parseFloat(document.getElementById('net-income').value) || 1;
        const fixed = parseFloat(document.getElementById('exp-fixed').value) || 0;
        const invest = parseFloat(document.getElementById('exp-invest').value) || 0;
        const savings = parseFloat(document.getElementById('exp-savings').value) || 0;
        const guiltfree = parseFloat(document.getElementById('exp-guiltfree').value) || 0;

        syncExpenseSlider('fixed', income, fixed);
        syncExpenseSlider('invest', income, invest);
        syncExpenseSlider('savings', income, savings);
        syncExpenseSlider('guiltfree', income, guiltfree);

        const fixedPct = Math.round((fixed / income) * 100);
        const investPct = Math.round((invest / income) * 100);
        const savingsPct = Math.round((savings / income) * 100);
        const guiltfreePct = Math.round((guiltfree / income) * 100);

        document.getElementById('lbl-fixed-pct').innerText = fixedPct + '%';
        document.getElementById('lbl-invest-pct').innerText = investPct + '%';
        document.getElementById('lbl-savings-pct').innerText = savingsPct + '%';
        document.getElementById('lbl-guiltfree-pct').innerText = guiltfreePct + '%';

        document.getElementById('bar-fixed').style.width = fixedPct + '%';
        document.getElementById('bar-invest').style.width = investPct + '%';
        document.getElementById('bar-savings').style.width = savingsPct + '%';
        document.getElementById('bar-guiltfree').style.width = guiltfreePct + '%';

        let feedback = "";
        if (fixedPct > 60) {
            feedback += `⚠️ <strong>Fixed Costs are high (${fixedPct}%).</strong> Target is 50-60%. Consider ways to downsize overhead or keep fixed costs low while boosting income.<br>`;
        } else {
            feedback += `✅ <strong>Fixed Costs look healthy (${fixedPct}%).</strong><br>`;
        }

        if (investPct < 10) {
            feedback += `⚠️ <strong>Investments are below target (${investPct}%).</strong> Aim for at least 10% to let compound growth work for you.`;
        } else {
            feedback += `✅ <strong>Investment target met (${investPct}%).</strong>`;
        }

        document.getElementById('csp-feedback').innerHTML = feedback;
    }

    function generateSummary() {
        const vision = document.getElementById('vision-text').value || 'No vision stated yet.';
        const myDial = document.getElementById('my-dial').value;
        const myName = memberProfilesCache[myUserId()]?.personal_info?.name || myDisplayName();
        const myArch = appState.myArchetype ? `${ARCHETYPES[appState.myArchetype].title} ${ARCHETYPES[appState.myArchetype].emoji}` : 'not set yet';

        let partnerLine = '';
        if (currentHousehold && !currentHousehold.is_solo) {
            const pid = partnerId();
            const partnerDialEl = document.getElementById('partner-dial');
            const partnerDial = partnerDialEl ? partnerDialEl.value : '';
            const cachedPartner = pid ? memberProfilesCache[pid] : null;
            const partnerName = (cachedPartner?.personal_info?.name) || nameFor(pid) || 'Your partner';
            const partnerArch = cachedPartner?.archetype ? `${ARCHETYPES[cachedPartner.archetype].title} ${ARCHETYPES[cachedPartner.archetype].emoji}` : 'not set yet';
            partnerLine = `<p><strong>${escapeHtml(partnerName)}:</strong> ${partnerArch}, values <em>${escapeHtml(partnerDial)}</em>.</p>`;
        }

        const summaryBox = document.getElementById('final-summary');
        summaryBox.style.display = 'block';
        summaryBox.innerHTML = `
            <h4>Alignment Summary</h4>
            <p><strong>${escapeHtml(myName)}:</strong> ${myArch}, values <em>${escapeHtml(myDial)}</em>.</p>
            ${partnerLine}
            <p><strong>Shared Rich Life Vision:</strong> "${escapeHtml(vision)}"</p>
            <p><em>Tip:</em> Try supporting each other's top spending priority within your guilt-free budget, rather than judging individual line items.</p>
        `;
    }

    // Tori Dunlap's framework explains *why* a dial appeals to you; Ramit Sethi's Money Dials say *where* it shows up.
    const ARCHETYPE_DIAL_HINTS = {
        Perfectionist: { dials: ['Convenience'], note: "Getting things exactly right takes energy — dialing up Convenience can buy back the time and mental space perfectionism eats into." },
        Helper: { dials: ['Generosity', 'Relationships'], note: "Showing up for people is core to who you are — Generosity and Relationships are often where Helpers naturally want to spend more, not less." },
        Achiever: { dials: ['Social Status', 'Luxury'], note: "When net worth feels like a scoreboard, Social Status and Luxury spending tend to creep up — worth checking whether they're bringing you joy or just keeping score." },
        Individualist: { dials: ['Luxury', 'Self-Improvement'], note: "Spending that expresses who you are — distinctive pieces, personal growth — tends to resonate more than a generic category ever will." },
        Investigator: { dials: ['Convenience'], note: "Research and preparation take real time — Convenience is often the dial worth turning up so you can reclaim it." },
        Loyalist: { dials: ['Health/Fitness'], note: "Security-minded spending on your future self — like health and fitness — tends to feel worth it even to a naturally cautious saver." },
        Enthusiast: { dials: ['Travel', 'Experiences'], note: "Freedom and fun drive you — Travel and Experiences are classic Enthusiast dials, as long as they're planned for rather than impulse-bought." },
        Challenger: { dials: ['Freedom'], note: "Independence matters to you more than most — the Freedom dial (autonomy, optionality, room to walk away) often matters more than any single purchase." },
        Peacemaker: { dials: ['Convenience'], note: "Paying to avoid friction is a common Peacemaker pattern — worth noticing when it's genuine ease vs. avoiding a harder conversation." }
    };

    function renderDialHint() {
        const box = document.getElementById('dial-hint');
        if (!box) return;

        const hint = appState.myArchetype ? ARCHETYPE_DIAL_HINTS[appState.myArchetype] : null;
        if (!hint) {
            box.style.display = 'none';
            return;
        }

        const myDialEl = document.getElementById('my-dial');
        const myDial = myDialEl ? myDialEl.value : '';
        const matchesPick = hint.dials.includes(myDial);
        const archTitle = ARCHETYPES[appState.myArchetype].title;

        box.style.display = 'block';
        box.innerHTML = matchesPick
            ? `<strong>That tracks:</strong> ${escapeHtml(archTitle)}s often dial up ${hint.dials.map(escapeHtml).join(' or ')}. ${escapeHtml(hint.note)}`
            : `<strong>Worth a look:</strong> as ${escapeHtml(archTitle)}, you might expect to lean toward ${hint.dials.map(escapeHtml).join(' or ')}. ${escapeHtml(hint.note)}`;
    }

    // ================= Clerk + Supabase =================
    const SUPABASE_URL = 'https://bvweuydrpildjxjmcpxa.supabase.co';
    const SUPABASE_ANON_KEY = 'sb_publishable_-cbUrULpA-JAXXQy38W_5Q_fGgz7z-w';

    const supabaseClient = (window.supabase && SUPABASE_URL.indexOf('REPLACE-ME') === -1)
        ? window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
            accessToken: async () => (await window.Clerk?.session?.getToken()) ?? null
          })
        : null;

    let currentHousehold = null; // { id, name, invite_code, is_solo, members: [{clerk_user_id, display_name}] }
    let goalsCache = [];
    let contributionsCache = [];
    let ledgerCache = [];
    let learningCache = [];
    let memberProfilesCache = {}; // clerk_user_id -> { archetype, xp, personal_info, financial_info, preferences }
    let realtimeChannel = null;

    function myUserId() {
        return window.Clerk?.user?.id || null;
    }

    function myDisplayName() {
        const u = window.Clerk?.user;
        if (!u) return 'Me';
        return u.username || u.fullName || u.primaryEmailAddress?.emailAddress || 'Me';
    }

    function nameFor(clerkUserId) {
        if (!currentHousehold) return clerkUserId;
        const m = currentHousehold.members.find(m => m.clerk_user_id === clerkUserId);
        return m ? (m.display_name || 'Member') : 'Member';
    }

    function partnerId() {
        if (!currentHousehold) return null;
        const p = currentHousehold.members.find(m => m.clerk_user_id !== myUserId());
        return p ? p.clerk_user_id : null;
    }

    function escapeHtml(str) {
        const div = document.createElement('div');
        div.innerText = str;
        return div.innerHTML;
    }

    const signInBtn = document.getElementById('sign-in-btn');
    const userButtonDiv = document.getElementById('user-button');
    const landingGate = document.getElementById('landing-gate');
    const appShell = document.getElementById('app-shell');
    const householdSetup = document.getElementById('household-setup');
    const householdStatus = document.getElementById('household-status');
    const modeChooser = document.getElementById('mode-chooser');
    const householdError = document.getElementById('household-error');

    document.querySelectorAll('.clerk-sign-in-trigger').forEach(btn => {
        btn.addEventListener('click', () => window.Clerk && window.Clerk.openSignIn({
            fallbackRedirectUrl: window.location.href,
            forceRedirectUrl: window.location.href
        }));
    });

    window.addEventListener('load', async () => {
        renderArchetypeGrid();
        renderQuizQuestions();

        if (!window.Clerk) return; // Clerk script not loaded (key not configured yet)
        await window.Clerk.load({
            signInFallbackRedirectUrl: window.location.href,
            signInForceRedirectUrl: window.location.href,
            signUpFallbackRedirectUrl: window.location.href,
            signUpForceRedirectUrl: window.location.href,
            afterSignOutUrl: window.location.href
        });
        window.Clerk.mountUserButton(userButtonDiv, {
            userProfileMode: 'modal',
            afterSignOutUrl: window.location.href
        });
        window.Clerk.addListener(() => onAuthChange());
        onAuthChange();
    });

    function onAuthChange() {
        const signedIn = !!window.Clerk?.user;
        signInBtn.style.display = signedIn ? 'none' : 'inline-flex';
        userButtonDiv.style.display = signedIn ? 'block' : 'none';
        landingGate.style.display = signedIn ? 'none' : 'block';
        appShell.style.display = signedIn ? 'block' : 'none';

        if (signedIn) {
            loadHousehold();
        } else {
            currentHousehold = null;
            renderGoalsGate();
            renderLedgerGate();
            renderLearningGate();
            renderGrowGate();
        }
    }

    async function loadHousehold() {
        if (!supabaseClient) {
            householdError.innerText = "Couldn't connect to the database — check your connection and reload the page.";
            householdError.style.display = 'block';
            renderGoalsGate();
            renderLedgerGate();
            renderLearningGate();
            renderGrowGate();
            return;
        }
        const uid = myUserId();
        const { data: memberRows, error: memberErr } = await supabaseClient
            .from('household_members')
            .select('household_id')
            .eq('clerk_user_id', uid)
            .limit(1);

        if (memberErr) {
            console.error('Failed to load household membership:', memberErr);
            householdError.innerText = "We couldn't load your household right now. Try refreshing the page — if it keeps happening, let us know.";
            householdError.style.display = 'block';
            showModeChooser();
            renderGoalsGate();
            renderLedgerGate();
            renderLearningGate();
            renderGrowGate();
            return;
        }

        if (!memberRows || memberRows.length === 0) {
            currentHousehold = null;
            showModeChooser();
            renderGoalsGate();
            renderLedgerGate();
            renderLearningGate();
            renderGrowGate();
            return;
        }

        const householdId = memberRows[0].household_id;
        const [{ data: hh, error: hhErr }, { data: members, error: membersErr }] = await Promise.all([
            supabaseClient.from('households').select('id, name, invite_code, is_solo').eq('id', householdId).single(),
            supabaseClient.from('household_members').select('clerk_user_id, display_name').eq('household_id', householdId)
        ]);

        if (hhErr || membersErr) {
            console.error('Failed to load household:', hhErr || membersErr);
            householdError.innerText = "We couldn't load your household right now. Try refreshing the page — if it keeps happening, let us know.";
            householdError.style.display = 'block';
            return;
        }

        currentHousehold = { id: hh.id, name: hh.name, invite_code: hh.invite_code, is_solo: !!hh.is_solo, members: members || [] };

        householdError.style.display = 'none';
        modeChooser.style.display = 'none';
        householdSetup.style.display = 'none';
        householdStatus.style.display = 'flex';
        document.getElementById('hh-name-display').innerText = currentHousehold.name || 'Your Household';
        document.getElementById('hh-members-display').innerText = currentHousehold.members.map(m => m.display_name || 'Member').join(' & ');
        document.getElementById('hh-invite-code').innerText = currentHousehold.invite_code;
        document.getElementById('hh-invite-wrap').style.display = currentHousehold.is_solo ? 'none' : 'block';
        document.getElementById('invite-email-template').innerText = buildInviteEmailText();

        applyModeVisibility();
        populatePaidBySelect();
        subscribeRealtime();
        loadGoals();
        loadLedger();
        loadMemberProfiles();
        loadLearningItems();
        renderGoalsGate();
        renderLedgerGate();
        renderLearningGate();
        renderGrowGate();
    }

    function showModeChooser() {
        modeChooser.style.display = 'block';
        householdSetup.style.display = 'none';
        householdStatus.style.display = 'none';
    }

    function choosePartnerMode() {
        modeChooser.style.display = 'none';
        householdSetup.style.display = 'flex';
    }

    async function handleCreateSoloHousehold() {
        if (!supabaseClient) return;
        householdError.style.display = 'none';
        const { error } = await supabaseClient.rpc('create_household', { p_name: 'My Finances', p_display_name: myDisplayName(), p_is_solo: true });
        if (error) {
            householdError.innerText = error.message;
            householdError.style.display = 'block';
            return;
        }
        loadHousehold();
    }

    async function handleCreateHousehold() {
        if (!supabaseClient) return;
        const name = document.getElementById('hh-create-name').value.trim() || 'Our Household';
        householdError.style.display = 'none';
        const { error } = await supabaseClient.rpc('create_household', { p_name: name, p_display_name: myDisplayName(), p_is_solo: false });
        if (error) {
            householdError.innerText = error.message;
            householdError.style.display = 'block';
            return;
        }
        loadHousehold();
    }

    async function handleJoinHousehold() {
        if (!supabaseClient) return;
        const code = document.getElementById('hh-join-code').value.trim();
        householdError.style.display = 'none';
        if (!code) return;
        const { error } = await supabaseClient.rpc('join_household', { p_invite_code: code, p_display_name: myDisplayName() });
        if (error) {
            householdError.innerText = error.message;
            householdError.style.display = 'block';
            return;
        }
        loadHousehold();
    }

    function copyInviteCode() {
        if (!currentHousehold) return;
        navigator.clipboard.writeText(currentHousehold.invite_code).then(() => {
            const chip = document.getElementById('hh-invite-code');
            const original = chip.innerText;
            chip.innerText = 'Copied!';
            setTimeout(() => chip.innerText = original, 1200);
        });
    }

    function buildInviteEmailText() {
        if (!currentHousehold) return '';
        const link = window.location.origin + window.location.pathname;
        return `Hi!\n\n`
            + `${myDisplayName()} invited you to join "${currentHousehold.name}" on DualAscent — an app for getting on the same page about money together.\n\n`
            + `1. Go to ${link}\n`
            + `2. Sign in (or create a free account)\n`
            + `3. Choose "With a Partner", then "Join a Household"\n`
            + `4. Enter this invite code: ${currentHousehold.invite_code}\n\n`
            + `See you there!`;
    }

    function copyInviteEmail() {
        const text = buildInviteEmailText();
        if (!text) return;
        navigator.clipboard.writeText(text).then(() => {
            const btn = document.getElementById('copy-invite-email-btn');
            const original = btn.innerText;
            btn.innerText = 'Copied!';
            setTimeout(() => btn.innerText = original, 1200);
        });
    }

    function applyModeVisibility() {
        const isSolo = !!(currentHousehold && currentHousehold.is_solo);

        const ledgerBtn = document.querySelector('.tab-btn[data-tab="tab-ledger"]');
        if (ledgerBtn) ledgerBtn.style.display = isSolo ? 'none' : '';
        if (isSolo) document.getElementById('tab-ledger').classList.remove('active');

        const learnTargetRow = document.getElementById('learn-target-row');
        const suggestedCol = document.getElementById('learning-suggested-col');
        if (learnTargetRow) learnTargetRow.style.display = isSolo ? 'none' : 'block';
        if (suggestedCol) suggestedCol.style.display = isSolo ? 'none' : 'block';

        const partnerDialWrap = document.getElementById('partner-dial-wrap');
        if (partnerDialWrap) partnerDialWrap.style.display = isSolo ? 'none' : 'block';

        const partnerSummary = document.getElementById('partner-profile-summary');
        if (partnerSummary && isSolo) partnerSummary.style.display = 'none';

        const goalTypeRow = document.getElementById('goal-type-row');
        if (goalTypeRow) goalTypeRow.style.display = isSolo ? 'none' : 'block';
    }

    function populatePaidBySelect() {
        const select = document.getElementById('ledger-paid-by');
        if (!select || !currentHousehold) return;
        select.innerHTML = '';
        currentHousehold.members.forEach(m => {
            const opt = document.createElement('option');
            opt.value = m.clerk_user_id;
            opt.innerText = (m.clerk_user_id === myUserId() ? 'You' : (m.display_name || 'Partner'));
            select.appendChild(opt);
        });
    }

    function subscribeRealtime() {
        if (!supabaseClient || !currentHousehold) return;
        if (realtimeChannel) supabaseClient.removeChannel(realtimeChannel);
        realtimeChannel = supabaseClient.channel('household-' + currentHousehold.id)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'ledger_entries', filter: `household_id=eq.${currentHousehold.id}` }, () => loadLedger())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'goals', filter: `household_id=eq.${currentHousehold.id}` }, () => loadGoals())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'goal_contributions' }, () => loadGoals())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'member_profiles', filter: `household_id=eq.${currentHousehold.id}` }, () => loadMemberProfiles())
            .on('postgres_changes', { event: '*', schema: 'public', table: 'learning_items', filter: `household_id=eq.${currentHousehold.id}` }, () => loadLearningItems())
            .subscribe();
    }

    // ---------------- Gates ----------------

    function renderGoalsGate() {
        const gate = document.getElementById('goals-gate');
        const app = document.getElementById('goals-app');
        if (!window.Clerk?.user) {
            gate.innerText = 'Sign in above to start tracking shared goals.';
            gate.style.display = 'block';
            app.style.display = 'none';
        } else if (!currentHousehold) {
            gate.innerText = 'Choose Just Me or With a Partner above to start tracking goals.';
            gate.style.display = 'block';
            app.style.display = 'none';
        } else {
            gate.style.display = 'none';
            app.style.display = 'block';
        }
    }

    function renderLedgerGate() {
        const gate = document.getElementById('ledger-gate');
        const app = document.getElementById('ledger-app');
        if (!window.Clerk?.user) {
            gate.innerText = 'Sign in above to start tracking shared expenses.';
            gate.style.display = 'block';
            app.style.display = 'none';
        } else if (!currentHousehold) {
            gate.innerText = 'Choose With a Partner above to start tracking shared expenses.';
            gate.style.display = 'block';
            app.style.display = 'none';
        } else {
            gate.style.display = 'none';
            app.style.display = 'block';
        }
    }

    function renderLearningGate() {
        const gate = document.getElementById('learning-gate');
        const app = document.getElementById('learning-app');
        if (!window.Clerk?.user) {
            gate.innerText = 'Sign in above to start your learning list.';
            gate.style.display = 'block';
            app.style.display = 'none';
        } else if (!currentHousehold) {
            gate.innerText = 'Choose Just Me or With a Partner above to start your learning list.';
            gate.style.display = 'block';
            app.style.display = 'none';
        } else {
            gate.style.display = 'none';
            app.style.display = 'block';
        }
    }

    // ---------------- My Profile ----------------

    async function loadMemberProfiles() {
        if (!supabaseClient || !currentHousehold) return;
        const { data, error } = await supabaseClient
            .from('member_profiles')
            .select('clerk_user_id, archetype, xp, personal_info, financial_info, preferences')
            .eq('household_id', currentHousehold.id);

        if (error) { console.error('Failed to load member profiles:', error); return; }
        memberProfilesCache = {};
        (data || []).forEach(row => memberProfilesCache[row.clerk_user_id] = row);

        const mine = memberProfilesCache[myUserId()];
        if (mine) {
            appState.myArchetype = mine.archetype || appState.myArchetype;
            appState.xp = mine.xp || appState.xp;
            renderArchetypeSelection();
        }

        hydrateMyProfileForm();
        renderPartnerProfileSummary();
        checkTeamPlayerBadge();
        updateProgressRing();
        renderGrowGate();
    }

    function hydrateMyProfileForm() {
        const mine = memberProfilesCache[myUserId()];
        document.getElementById('profile-name').value = mine?.personal_info?.name || (window.Clerk?.user ? myDisplayName() : '');
        document.getElementById('profile-age').value = mine?.personal_info?.ageRange || '';
        document.getElementById('profile-occupation').value = mine?.personal_info?.occupation || '';
        document.getElementById('profile-income').value = mine?.financial_info?.monthlyIncome ?? '';
        document.getElementById('profile-debt').value = mine?.financial_info?.debtTotal ?? '';
        document.getElementById('profile-savings').value = mine?.financial_info?.savings ?? '';
        document.getElementById('profile-risk').value = mine?.financial_info?.riskTolerance || 'medium';
        document.getElementById('profile-checkin').value = mine?.preferences?.checkinFrequency || 'monthly';
        document.getElementById('profile-style').value = mine?.preferences?.communicationStyle || 'scheduled';
        updateProfileStrength();
    }

    async function saveProfile() {
        if (!currentHousehold) return;
        const personal = {
            name: document.getElementById('profile-name').value.trim() || myDisplayName(),
            ageRange: document.getElementById('profile-age').value,
            occupation: document.getElementById('profile-occupation').value.trim()
        };
        const financial = {
            monthlyIncome: parseFloat(document.getElementById('profile-income').value) || null,
            debtTotal: parseFloat(document.getElementById('profile-debt').value) || null,
            savings: parseFloat(document.getElementById('profile-savings').value) || null,
            riskTolerance: document.getElementById('profile-risk').value
        };
        const preferences = {
            checkinFrequency: document.getElementById('profile-checkin').value,
            communicationStyle: document.getElementById('profile-style').value
        };

        if (supabaseClient) {
            const { error } = await supabaseClient.from('member_profiles').upsert({
                household_id: currentHousehold.id,
                clerk_user_id: myUserId(),
                personal_info: personal,
                financial_info: financial,
                preferences: preferences
            }, { onConflict: 'household_id,clerk_user_id' });
            if (error) console.error('Failed to save profile:', error);
        }

        memberProfilesCache[myUserId()] = { ...(memberProfilesCache[myUserId()] || {}), personal_info: personal, financial_info: financial, preferences: preferences };

        awardXP(10, 'Profile saved');
        unlockBadge('allSetUp', '📝', 'All Set Up');
        checkTeamPlayerBadge();
        renderPartnerProfileSummary();
        updateProgressRing();
        renderBadges();
        renderGrowGate();
        checkProfileStrengthBadges(updateProfileStrength());
    }

    function renderPartnerProfileSummary() {
        const summary = document.getElementById('partner-profile-summary');
        const content = document.getElementById('partner-profile-content');
        if (!summary || !content) return;

        if (!currentHousehold || currentHousehold.is_solo) {
            summary.style.display = 'none';
            return;
        }

        const pid = partnerId();
        const partnerProfile = pid ? memberProfilesCache[pid] : null;
        if (!partnerProfile) {
            summary.style.display = 'block';
            content.innerHTML = `<p style="color:var(--text-muted);">${escapeHtml(nameFor(pid) || 'Your partner')} hasn't filled this in yet.</p>`;
            return;
        }

        const name = partnerProfile.personal_info?.name || nameFor(pid);
        const archetype = partnerProfile.archetype ? `${ARCHETYPES[partnerProfile.archetype].title} ${ARCHETYPES[partnerProfile.archetype].emoji}` : 'Not set yet';
        const occupation = partnerProfile.personal_info?.occupation;

        summary.style.display = 'block';
        content.innerHTML = `
            <p><strong>${escapeHtml(name)}</strong>${occupation ? ' — ' + escapeHtml(occupation) : ''}</p>
            <p>Financial Personality: ${archetype}</p>
        `;
    }

    function checkTeamPlayerBadge() {
        if (!currentHousehold || currentHousehold.is_solo) return;
        if (currentHousehold.members.length < 2) return;
        const allSet = currentHousehold.members.every(m => {
            const p = memberProfilesCache[m.clerk_user_id];
            return p && p.archetype && p.personal_info && Object.keys(p.personal_info).length > 0;
        });
        if (allSet) unlockBadge('teamPlayer', '🤝', 'Team Player');
    }

    // ---------------- Goals ----------------

    async function createGoal() {
        if (!supabaseClient || !currentHousehold) return;
        const title = document.getElementById('goal-title').value.trim();
        const target = parseFloat(document.getElementById('goal-target').value);
        const date = document.getElementById('goal-date').value || null;
        const goalTypeEl = document.getElementById('goal-type');
        const goalType = (!currentHousehold.is_solo && goalTypeEl) ? goalTypeEl.value : 'shared';
        if (!title || !target || target <= 0) return;

        const { error } = await supabaseClient.from('goals').insert({
            household_id: currentHousehold.id,
            title,
            target_amount: target,
            target_date: date,
            goal_type: goalType,
            created_by: myUserId()
        });
        if (error) { console.error('Failed to create goal:', error); return; }

        document.getElementById('goal-title').value = '';
        document.getElementById('goal-target').value = '';
        document.getElementById('goal-date').value = '';
        awardXP(10, 'Goal created');
        unlockBadge('goalSetter', '🎯', 'Goal Setter');
        renderBadges();
        loadGoals();
    }

    async function contributeToGoal(goalId) {
        if (!supabaseClient) return;
        const input = document.getElementById('contribute-input-' + goalId);
        const amount = parseFloat(input.value);
        if (!amount || amount <= 0) return;

        const { error } = await supabaseClient.from('goal_contributions').insert({
            goal_id: goalId,
            clerk_user_id: myUserId(),
            amount
        });
        if (error) { console.error('Failed to add contribution:', error); return; }
        input.value = '';
        loadGoals();
    }

    async function loadGoals() {
        if (!supabaseClient || !currentHousehold) return;
        const { data: goals, error: goalsErr } = await supabaseClient
            .from('goals')
            .select('id, title, target_amount, target_date, goal_type, created_by')
            .eq('household_id', currentHousehold.id)
            .order('created_at', { ascending: true });

        if (goalsErr) { console.error('Failed to load goals:', goalsErr); return; }
        goalsCache = goals || [];

        if (goalsCache.length === 0) {
            contributionsCache = [];
            renderGoalsList();
            updateProgressRing();
            renderGrowContent();
            return;
        }

        const goalIds = goalsCache.map(g => g.id);
        const { data: contributions, error: contribErr } = await supabaseClient
            .from('goal_contributions')
            .select('goal_id, clerk_user_id, amount')
            .in('goal_id', goalIds);

        if (contribErr) { console.error('Failed to load contributions:', contribErr); return; }
        contributionsCache = contributions || [];

        renderGoalsList();
        updateProgressRing();
        renderGrowContent();
    }

    function nextMilestone(pct) {
        if (pct < 25) return 25;
        if (pct < 50) return 50;
        if (pct < 75) return 75;
        return 100;
    }

    function buildGoalCard(goal) {
        const goalContribs = contributionsCache.filter(c => c.goal_id === goal.id);
        const byMember = {};
        goalContribs.forEach(c => { byMember[c.clerk_user_id] = (byMember[c.clerk_user_id] || 0) + Number(c.amount); });

        const total = Object.values(byMember).reduce((a, b) => a + b, 0);
        const myTotal = byMember[myUserId()] || 0;
        const partnerTotal = total - myTotal;
        const pct = Math.min(100, (total / goal.target_amount) * 100);
        const myPct = Math.min(100, (myTotal / goal.target_amount) * 100);
        const partnerPct = Math.min(100 - myPct, (partnerTotal / goal.target_amount) * 100);

        const isIndividual = goal.goal_type === 'individual';
        const typeTag = isIndividual
            ? `<span class="badge-chip">🙋 ${goal.created_by === myUserId() ? 'Mine' : escapeHtml(nameFor(goal.created_by))}</span>`
            : (currentHousehold && !currentHousehold.is_solo ? '<span class="badge-chip">🤝 Shared</span>' : '');

        const card = document.createElement('div');
        card.className = 'card goal-card';
        card.innerHTML = `
            <div class="goal-title-row">
                <h3 style="margin:0;">${escapeHtml(goal.title)} ${typeTag}</h3>
                <span class="goal-amounts">$${total.toFixed(2)} of $${Number(goal.target_amount).toFixed(2)} (${Math.round(pct)}%)</span>
            </div>
            ${goal.target_date ? `<div style="font-size:0.8rem; color:var(--text-muted);">Target date: ${goal.target_date}</div>` : ''}
            <div class="goal-legend">
                <span><span class="dot seg-mine"></span> You: $${myTotal.toFixed(2)}</span>
                <span><span class="dot seg-partner"></span> Partner: $${partnerTotal.toFixed(2)}</span>
            </div>
            <div class="goal-progress-wrap">
                <div class="progress-bar-container">
                    <div class="progress-segment seg-mine" style="width:${myPct}%;"></div>
                    <div class="progress-segment seg-partner" style="width:${partnerPct}%;"></div>
                </div>
                <div class="milestone-ticks">
                    <div class="milestone-tick" style="left:25%;"></div>
                    <div class="milestone-tick" style="left:50%;"></div>
                    <div class="milestone-tick" style="left:75%;"></div>
                </div>
            </div>
            ${pct >= 100 ? '<div class="milestone-flag">🎉 Goal reached!</div>' : `<div class="milestone-flag">Next milestone: ${nextMilestone(pct)}%</div>`}
            <div class="contribute-row">
                <input type="number" id="contribute-input-${goal.id}" placeholder="Amount ($)">
                <button class="action-btn" onclick="contributeToGoal('${goal.id}')">Add Contribution</button>
            </div>
        `;
        return card;
    }

    function appendGoalGroup(container, label, goals) {
        if (goals.length === 0) return;
        const heading = document.createElement('h3');
        heading.style.cssText = 'margin: 18px 0 8px 0; color: var(--secondary); font-size: 1rem;';
        heading.innerText = label;
        container.appendChild(heading);
        goals.forEach(goal => container.appendChild(buildGoalCard(goal)));
    }

    function renderGoalsList() {
        const container = document.getElementById('goals-list');
        if (!container) return;
        container.innerHTML = '';

        if (goalsCache.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:20px 0;">No goals yet — add one above.</p>';
            return;
        }

        const isSolo = !!(currentHousehold && currentHousehold.is_solo);
        if (isSolo) {
            goalsCache.forEach(goal => container.appendChild(buildGoalCard(goal)));
            return;
        }

        const myId = myUserId();
        const shared = goalsCache.filter(g => g.goal_type !== 'individual');
        const mine = goalsCache.filter(g => g.goal_type === 'individual' && g.created_by === myId);
        const partnersGoals = goalsCache.filter(g => g.goal_type === 'individual' && g.created_by !== myId);

        appendGoalGroup(container, '🤝 Shared Goals', shared);
        appendGoalGroup(container, '🙋 My Individual Goals', mine);
        appendGoalGroup(container, `🙋 ${nameFor(partnerId())}'s Individual Goals`, partnersGoals);
    }

    // ---------------- Learning Together ----------------

    async function addLearningItem() {
        if (!supabaseClient || !currentHousehold) return;
        const topic = document.getElementById('learn-topic').value.trim();
        const note = document.getElementById('learn-note').value.trim();
        const targetSel = document.getElementById('learn-target');
        const targetVal = (!currentHousehold.is_solo && targetSel) ? targetSel.value : 'me';
        const target = targetVal === 'partner' ? partnerId() : null;
        if (!topic) return;

        const { error } = await supabaseClient.from('learning_items').insert({
            household_id: currentHousehold.id,
            author_clerk_user_id: myUserId(),
            target_clerk_user_id: target,
            topic,
            note: note || null
        });
        if (error) { console.error('Failed to add learning item:', error); return; }

        document.getElementById('learn-topic').value = '';
        document.getElementById('learn-note').value = '';
        awardXP(5, 'Learning topic added');
        loadLearningItems();
    }

    async function markLearningDone(id) {
        if (!supabaseClient) return;
        const { error } = await supabaseClient.from('learning_items').update({ status: 'done' }).eq('id', id);
        if (error) { console.error('Failed to update learning item:', error); return; }
        await loadLearningItems();

        const myId = myUserId();
        const doneMine = learningCache.filter(i => i.status === 'done' && (i.target_clerk_user_id === myId || (!i.target_clerk_user_id && i.author_clerk_user_id === myId))).length;
        if (doneMine >= 3) unlockBadge('learner', '📚', 'Lifelong Learner');
        renderBadges();
    }

    async function loadLearningItems() {
        if (!supabaseClient || !currentHousehold) return;
        const { data, error } = await supabaseClient
            .from('learning_items')
            .select('id, author_clerk_user_id, target_clerk_user_id, topic, note, status, created_at')
            .eq('household_id', currentHousehold.id)
            .order('created_at', { ascending: false });

        if (error) { console.error('Failed to load learning items:', error); return; }
        learningCache = data || [];
        renderLearningLists();
        updateProgressRing();
    }

    function renderLearningItem(item) {
        const doneStyle = item.status === 'done' ? ' style="opacity:0.6;"' : '';
        const suggestedTag = item.author_clerk_user_id !== myUserId()
            ? `<span class="le-meta">Suggested by ${escapeHtml(nameFor(item.author_clerk_user_id))}</span>`
            : '';
        return `
            <div class="ledger-entry"${doneStyle}>
                <div>
                    <div class="le-desc">${item.status === 'done' ? '✅ ' : ''}${escapeHtml(item.topic)}</div>
                    ${item.note ? `<div class="le-meta">${escapeHtml(item.note)}</div>` : ''}
                    ${suggestedTag}
                </div>
                ${item.status !== 'done' ? `<button class="action-btn" style="margin-top:0;padding:6px 12px;font-size:0.8rem;" onclick="markLearningDone('${item.id}')">Mark Done</button>` : ''}
            </div>
        `;
    }

    function renderLearningLists() {
        const mineWrap = document.getElementById('learning-mine-list');
        const partnerWrap = document.getElementById('learning-partner-list');
        if (!mineWrap) return;

        const myId = myUserId();
        const mine = learningCache.filter(i => i.target_clerk_user_id === myId || (!i.target_clerk_user_id && i.author_clerk_user_id === myId));
        const forPartner = learningCache.filter(i => i.target_clerk_user_id && i.target_clerk_user_id !== myId && i.author_clerk_user_id === myId);

        mineWrap.innerHTML = mine.length ? mine.map(renderLearningItem).join('') : '<p style="color:var(--text-muted); text-align:center; padding:10px 0;">Nothing here yet — add a topic above.</p>';
        if (partnerWrap) {
            partnerWrap.innerHTML = forPartner.length ? forPartner.map(renderLearningItem).join('') : '<p style="color:var(--text-muted); text-align:center; padding:10px 0;">No suggestions sent yet.</p>';
        }
    }

    // ---------------- Grow Together ----------------

    function renderGrowGate() {
        const gate = document.getElementById('grow-gate');
        const app = document.getElementById('grow-app');
        if (!gate || !app) return;

        if (!window.Clerk?.user) {
            gate.innerText = 'Sign in above to explore this together.';
            gate.style.display = 'block';
            app.style.display = 'none';
            return;
        }
        if (!currentHousehold) {
            gate.innerText = 'Choose With a Partner above to unlock this section.';
            gate.style.display = 'block';
            app.style.display = 'none';
            return;
        }
        if (currentHousehold.is_solo) {
            gate.innerText = 'This section is built for two — invite your partner with your household code above to unlock it.';
            gate.style.display = 'block';
            app.style.display = 'none';
            return;
        }

        const mine = memberProfilesCache[myUserId()];
        const profileStarted = !!(appState.myArchetype || (mine?.personal_info && Object.keys(mine.personal_info).length > 0));
        if (!profileStarted) {
            gate.innerText = "Set your Financial Personality and My Profile first — we'll use them to tailor what to explore together.";
            gate.style.display = 'block';
            app.style.display = 'none';
            return;
        }
        if (currentHousehold.members.length < 2) {
            gate.innerText = 'Waiting on your partner to join with the invite code above.';
            gate.style.display = 'block';
            app.style.display = 'none';
            return;
        }

        gate.style.display = 'none';
        app.style.display = 'block';
        renderGrowContent();
    }

    function computeResonantDynamics() {
        const resonant = new Set();
        if (!currentHousehold || currentHousehold.is_solo) return resonant;

        const myProfile = memberProfilesCache[myUserId()];
        const pid = partnerId();
        const partnerProfile = pid ? memberProfilesCache[pid] : null;

        const SAVER_LEANING = ['Investigator', 'Loyalist', 'Perfectionist'];
        const SPENDER_LEANING = ['Enthusiast', 'Achiever', 'Individualist'];
        const myArch = myProfile?.archetype || appState.myArchetype;
        const partnerArch = partnerProfile?.archetype;

        if (myArch && partnerArch) {
            const oneSaverOneSpender =
                (SAVER_LEANING.includes(myArch) && SPENDER_LEANING.includes(partnerArch)) ||
                (SAVER_LEANING.includes(partnerArch) && SPENDER_LEANING.includes(myArch));
            if (oneSaverOneSpender) resonant.add('saverSpender');
            if (myArch === 'Peacemaker' || partnerArch === 'Peacemaker') resonant.add('invisibleBurden');
        }

        const myIncome = myProfile?.financial_info?.monthlyIncome;
        const partnerIncome = partnerProfile?.financial_info?.monthlyIncome;
        if (myIncome > 0 && partnerIncome > 0) {
            const ratio = Math.max(myIncome, partnerIncome) / Math.min(myIncome, partnerIncome);
            if (ratio >= 1.5) resonant.add('incomeDisparity');
        }

        if (goalsCache.some(g => Number(g.target_amount) >= 10000)) resonant.add('phantomGoals');

        if (ledgerCache.length >= 4) {
            const counts = {};
            ledgerCache.forEach(e => { counts[e.created_by] = (counts[e.created_by] || 0) + 1; });
            const maxCount = Math.max(...Object.values(counts));
            if (maxCount / ledgerCache.length >= 0.8) resonant.add('invisibleBurden');
        }

        return resonant;
    }

    function toggleDynamicCard(key) {
        const opening = growExpandedKey !== key;
        growExpandedKey = opening ? key : null;
        if (opening && !appState.badges.growthMinded) {
            awardXP(5, 'Explored a dynamic together');
            unlockBadge('growthMinded', '🌱', 'Growth-Minded');
        }
        renderGrowContent();
    }

    function renderGrowContent() {
        const grid = document.getElementById('grow-dynamics-grid');
        const highlightBox = document.getElementById('grow-highlights');
        if (!grid || !currentHousehold || currentHousehold.is_solo) return;

        const resonant = computeResonantDynamics();
        const keys = Object.keys(COUPLE_DYNAMICS).sort((a, b) => (resonant.has(a) ? 0 : 1) - (resonant.has(b) ? 0 : 1));

        if (highlightBox) {
            if (resonant.size > 0) {
                highlightBox.style.display = 'block';
                highlightBox.innerHTML = 'Based on what you\'ve both entered so far, these might be worth starting with: ' +
                    [...resonant].map(k => `<strong>${escapeHtml(COUPLE_DYNAMICS[k].title)}</strong>`).join(', ') + '.';
            } else {
                highlightBox.style.display = 'none';
            }
        }

        grid.innerHTML = keys.map(key => {
            const d = COUPLE_DYNAMICS[key];
            const isHighlighted = resonant.has(key);
            const isOpen = growExpandedKey === key;
            return `
                <div class="dynamic-card${isHighlighted ? ' highlighted' : ''}">
                    <h4>${d.emoji} ${escapeHtml(d.title)} ${isHighlighted ? '<span class="resonate-tag">Might resonate</span>' : ''}</h4>
                    <p class="dc-desc">${escapeHtml(d.desc)}</p>
                    <button class="dc-toggle-btn" onclick="toggleDynamicCard('${key}')">${isOpen ? 'Hide' : 'Explore this together'}</button>
                    ${isOpen ? `
                        <div class="dc-detail">
                            <h5>Questions to explore together</h5>
                            <ul>${d.questions.map(q => `<li>${escapeHtml(q)}</li>`).join('')}</ul>
                            <h5>Paths forward</h5>
                            <ul>${d.actions.map(a => `<li>${escapeHtml(a)}</li>`).join('')}</ul>
                            <div class="dc-source">${escapeHtml(d.source)}</div>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    }

    // ---------------- Ledger ----------------

    async function addLedgerEntry() {
        if (!supabaseClient || !currentHousehold) return;
        const description = document.getElementById('ledger-desc').value.trim();
        const amount = parseFloat(document.getElementById('ledger-amount').value);
        const paidBy = document.getElementById('ledger-paid-by').value;
        const sharePct = parseFloat(document.getElementById('ledger-share-pct').value);

        if (!description || !amount || amount <= 0) return;

        const { error } = await supabaseClient.from('ledger_entries').insert({
            household_id: currentHousehold.id,
            description,
            amount,
            paid_by: paidBy,
            payer_share_pct: isNaN(sharePct) ? 50 : sharePct,
            created_by: myUserId()
        });
        if (error) { console.error('Failed to add ledger entry:', error); return; }

        document.getElementById('ledger-desc').value = '';
        document.getElementById('ledger-amount').value = '';
        document.getElementById('ledger-share-pct').value = '50';
        loadLedger();
    }

    async function loadLedger() {
        if (!supabaseClient || !currentHousehold) return;
        const { data, error } = await supabaseClient
            .from('ledger_entries')
            .select('id, description, amount, paid_by, payer_share_pct, entry_date, created_at')
            .eq('household_id', currentHousehold.id)
            .order('created_at', { ascending: false });

        if (error) { console.error('Failed to load ledger:', error); return; }
        ledgerCache = data || [];
        renderLedgerList();
        renderBalanceSummary();
        renderGrowContent();
    }

    function renderLedgerList() {
        const container = document.getElementById('ledger-list');
        if (!container) return;
        container.innerHTML = '';

        if (ledgerCache.length === 0) {
            container.innerHTML = '<p style="color:var(--text-muted); text-align:center; padding:10px 0;">No expenses logged yet.</p>';
            return;
        }

        ledgerCache.forEach(entry => {
            const row = document.createElement('div');
            row.className = 'ledger-entry';
            const otherShare = 100 - entry.payer_share_pct;
            row.innerHTML = `
                <div>
                    <div class="le-desc">${escapeHtml(entry.description)}</div>
                    <div class="le-meta">Paid by ${entry.paid_by === myUserId() ? 'you' : escapeHtml(nameFor(entry.paid_by))} · Split ${entry.payer_share_pct}/${otherShare} · ${entry.entry_date}</div>
                </div>
                <div class="le-amount">$${Number(entry.amount).toFixed(2)}</div>
            `;
            container.appendChild(row);
        });
    }

    function renderBalanceSummary() {
        const box = document.getElementById('balance-summary');
        if (!box || !currentHousehold) return;

        if (currentHousehold.members.length < 2) {
            box.className = 'summary-box';
            box.innerHTML = 'Invite your partner with the code above to start splitting expenses.';
            return;
        }

        const balances = {};
        currentHousehold.members.forEach(m => balances[m.clerk_user_id] = 0);

        ledgerCache.forEach(e => {
            const payerShare = Number(e.amount) * (Number(e.payer_share_pct) / 100);
            const otherShare = Number(e.amount) - payerShare;
            const others = currentHousehold.members.filter(m => m.clerk_user_id !== e.paid_by);
            if (!(e.paid_by in balances)) balances[e.paid_by] = 0;
            balances[e.paid_by] += otherShare;
            others.forEach(m => {
                balances[m.clerk_user_id] = (balances[m.clerk_user_id] || 0) - (otherShare / (others.length || 1));
            });
        });

        const uid = myUserId();
        const myBalance = balances[uid] || 0;

        if (Math.abs(myBalance) < 0.01) {
            box.className = 'summary-box balance-settled';
            box.innerHTML = '✅ All settled up!';
            return;
        }

        box.className = 'summary-box balance-owe';
        if (myBalance > 0) {
            box.innerHTML = `You are owed <strong>$${myBalance.toFixed(2)}</strong> overall.`;
        } else {
            box.innerHTML = `You owe <strong>$${Math.abs(myBalance).toFixed(2)}</strong> overall.`;
        }
    }

    // ---------------- Gamification: XP, badges, progress ring, toasts ----------------

    function awardXP(amount, label) {
        appState.xp += amount;
        showToast(`+${amount} XP — ${label}`);
        if (supabaseClient && currentHousehold) {
            supabaseClient.from('member_profiles')
                .update({ xp: appState.xp })
                .eq('household_id', currentHousehold.id)
                .eq('clerk_user_id', myUserId())
                .then(({ error }) => { if (error) console.error('Failed to save XP:', error); });
        }
    }

    function unlockBadge(key, emoji, label) {
        if (appState.badges[key]) return;
        appState.badges[key] = { emoji, label };
        showToast(`Badge unlocked: ${emoji} ${label}`);
        renderBadges();
    }

    function renderBadges() {
        const wrap = document.getElementById('badge-shelf');
        if (!wrap) return;
        wrap.innerHTML = Object.values(appState.badges).map(b => `<span class="badge-chip">${b.emoji} ${b.label}</span>`).join('');
    }

    function showToast(message) {
        const container = document.getElementById('toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerText = message;
        container.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 300);
        }, 2600);
    }

    const PROFILE_STRENGTH_FIELDS = [
        { id: 'profile-name', label: 'Name' },
        { id: 'profile-age', label: 'Age Range' },
        { id: 'profile-occupation', label: 'Occupation' },
        { id: 'profile-income', label: 'Monthly Income' },
        { id: 'profile-debt', label: 'Total Debt' },
        { id: 'profile-savings', label: 'Current Savings' }
    ];

    function calcProfileCompletion() {
        const results = PROFILE_STRENGTH_FIELDS.map(f => {
            const el = document.getElementById(f.id);
            return { ...f, filled: !!(el && el.value.trim()) };
        });
        const done = results.filter(f => f.filled).length;
        return { results, done, total: results.length, pct: Math.round((done / results.length) * 100) };
    }

    function updateProfileStrength() {
        const bar = document.getElementById('profile-strength-bar');
        const pctLabel = document.getElementById('profile-strength-pct');
        const checklist = document.getElementById('profile-strength-checklist');
        const msg = document.getElementById('profile-strength-msg');
        if (!bar || !pctLabel || !checklist) return 0;

        const { results, pct } = calcProfileCompletion();
        const remaining = results.filter(f => !f.filled).length;

        bar.style.width = `${pct}%`;
        pctLabel.innerText = `${pct}%`;
        checklist.innerHTML = results.map(f =>
            `<span class="strength-chip ${f.filled ? 'done' : ''}">${f.filled ? '✓' : '○'} ${f.label}</span>`
        ).join('');
        if (msg) {
            msg.innerText = pct >= 100
                ? '🏆 Profile complete — great work!'
                : pct >= 50
                    ? `Over halfway there — ${remaining} field${remaining === 1 ? '' : 's'} left to go.`
                    : 'Fill in a few more details to strengthen your profile.';
        }
        return pct;
    }

    function checkProfileStrengthBadges(pct) {
        if (pct >= 50) unlockBadge('profileStarter', '🌱', 'Profile Starter');
        if (pct >= 100) {
            awardXP(25, 'Profile 100% complete');
            unlockBadge('profileChampion', '🏆', 'Profile Champion');
        }
    }

    function updateProgressRing() {
        const ring = document.getElementById('progress-ring');
        const label = document.getElementById('progress-ring-label');
        if (!ring || !label) return;
        const steps = [
            !!appState.myArchetype,
            !!(memberProfilesCache[myUserId()]?.personal_info && Object.keys(memberProfilesCache[myUserId()].personal_info).length > 0),
            goalsCache.length > 0,
            learningCache.length > 0,
            appState.cspVisited
        ];
        const done = steps.filter(Boolean).length;
        const pct = Math.round((done / steps.length) * 100);
        ring.style.background = `conic-gradient(var(--secondary) ${pct}%, #e0e0e0 0)`;
        label.innerText = `${done}/${steps.length} steps complete`;
    }
