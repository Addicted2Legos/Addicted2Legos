// ================= Financial Personality detail content =================
// Extended content for the personality detail page (FinancialPersonalities.html).
// Order here also drives prev/next navigation on that page.
const PERSONALITY_ORDER = [
    'Perfectionist', 'Helper', 'Achiever', 'Individualist', 'Investigator',
    'Loyalist', 'Enthusiast', 'Challenger', 'Peacemaker'
];

const PERSONALITY_DETAILS = {
    Perfectionist: {
        emoji: '📏',
        title: 'The Perfectionist',
        desc: "Driven by getting your finances exactly right. You track carefully and hold high standards for yourself — but a small budget slip can spiral into guilt or all-or-nothing thinking that keeps you stuck re-analyzing instead of moving forward.",
        strengths: [
            "Meticulous tracking — little slips through unnoticed",
            "Follows through once a plan is set",
            "Catches errors and inconsistencies others miss",
            "Holds high, consistent standards for the household's finances"
        ],
        watchOuts: [
            "One budget slip spirals into guilt or all-or-nothing thinking",
            "Can delay action while still trying to get it \"exactly right\"",
            "Silently judges looser money habits, even when unspoken",
            "Treats \"good enough\" as failure"
        ],
        partnerTips: [
            "Don't pile on when they've already noticed the mistake — they're their own harshest critic.",
            "Celebrate a good-enough month, not only a perfect one.",
            "Ask what \"exactly right\" means to them before assuming they're being rigid for its own sake.",
            "Use the Spending Plan tab together — a visible target range can turn perfection into a range, not a single number."
        ]
    },
    Helper: {
        emoji: '🤲',
        title: 'The Helper',
        desc: "You show up for the people you love, financially and otherwise — covering a tab, lending a hand, picking up the check. The tricky part is remembering your own goals count too, and that saying no to someone else's ask isn't a failure to care.",
        strengths: [
            "Generous — shows up for friends and family in a pinch",
            "Builds trust and closeness through financial support",
            "Reads the room and notices when someone needs help",
            "Rarely lets money get in the way of relationships"
        ],
        watchOuts: [
            "Covers others before funding their own goals",
            "Struggles to say no to a money ask",
            "Sacrifices quietly, then resents it later",
            "Under-reports their own needs, even to a partner"
        ],
        partnerTips: [
            "Ask directly what they need instead of waiting for them to volunteer it.",
            "Build \"their own goals count too\" explicitly into a shared goal on the Goals tab.",
            "Notice when they've said yes to something that stretches them thin, and check in.",
            "Give them permission — out loud — to prioritize themselves sometimes."
        ]
    },
    Achiever: {
        emoji: '🏅',
        title: 'The Achiever',
        desc: "Net worth can feel like a scoreboard — for how hard you've worked and how far you've come. That drive is a real asset, but it can tip into lifestyle creep or status spending when your bank balance starts standing in for your worth.",
        strengths: [
            "Driven to grow income and net worth over time",
            "Motivated by visible, measurable progress",
            "Sets ambitious goals and works toward them",
            "Rarely coasts financially"
        ],
        watchOuts: [
            "Lifestyle creep as income rises",
            "Ties self-worth to a bank balance",
            "Status spending to keep up appearances",
            "Compares their finances to peers"
        ],
        partnerTips: [
            "Celebrate non-financial wins too, so their worth isn't only tied to numbers.",
            "Gently name it when a purchase looks more about status than the \"Rich Life\" you defined together in Vision & Dialogue.",
            "Ask what \"enough\" would look like at each income milestone.",
            "Track progress on a goal in the Goals tab — it gives the scoreboard instinct somewhere healthy to go."
        ]
    },
    Individualist: {
        emoji: '🎨',
        title: 'The Individualist',
        desc: "Spending is one of the ways you express who you are — and there's nothing wrong with that. Where it gets messy is the unglamorous stuff: budgets, bills, and spreadsheets can feel so mundane that they're easy to avoid.",
        strengths: [
            "Spends intentionally on what genuinely feels like \"them\"",
            "Brings creativity and personal meaning to money decisions",
            "Resists generic, one-size-fits-all budgets that don't fit their life",
            "Rarely spends just to fit in"
        ],
        watchOuts: [
            "Avoids budgets, bills, or spreadsheets because they feel mundane",
            "Misses deadlines buried in routine admin",
            "Discomfort with anything that feels too \"boring\" to engage with",
            "Can let the unglamorous basics slide"
        ],
        partnerTips: [
            "Make the boring admin as low-friction as possible — autopay, shared trackers — so it doesn't rely on willpower.",
            "Let them personalize their spending categories instead of forcing a generic template.",
            "Don't shame the parts of budgeting that don't come naturally to them.",
            "In the Spending Plan tab, let the Guilt-Free category flex toward what actually feels meaningful to them."
        ]
    },
    Investigator: {
        emoji: '🔎',
        title: 'The Investigator',
        desc: "You'd rather over-research and over-save than be caught off guard. That instinct can build real security, but taken far enough, it can turn into hoarding information or money out of a quiet fear that there will never be enough.",
        strengths: [
            "Thorough research before big financial decisions",
            "Disciplined, consistent saver",
            "Rarely caught off guard by a surprise expense",
            "Good at finding the best option or the best deal"
        ],
        watchOuts: [
            "Over-research becomes a stalling tactic",
            "Hoards information or money \"just in case\"",
            "Fear-driven saving that never quite feels like enough",
            "Reluctant to share financial details, even with a partner"
        ],
        partnerTips: [
            "Set a decision deadline together so research doesn't become indefinite.",
            "Ask what number would actually feel like \"enough\" — vague fear has no finish line.",
            "Invite them to share what they've found rather than waiting to be asked.",
            "Use the Goals tab to turn saving into a concrete, visible target instead of an open-ended cushion."
        ]
    },
    Loyalist: {
        emoji: '🛡️',
        title: 'The Loyalist',
        desc: "Security is the whole point. You plan for what could go wrong, and that worst-case-scenario thinking has probably saved you more than once. The flip side is a risk aversion that can keep you from moves that would actually serve you.",
        strengths: [
            "Plans for worst-case scenarios before they happen",
            "Strong emergency-fund instincts",
            "Dependable — rarely leaves the household exposed to risk",
            "Thinks ahead rather than reacting"
        ],
        watchOuts: [
            "Risk aversion that blocks good opportunities — investing, a career move",
            "Tends toward catastrophizing",
            "Struggles to enjoy money in the present",
            "Can default to \"no\" before weighing an opportunity fairly"
        ],
        partnerTips: [
            "Frame new opportunities in terms of downside protection, not just upside — that's the language that lands.",
            "Build the emergency fund first, explicitly, so it stops being a background worry.",
            "Encourage small, low-stakes \"practice\" risks before bigger ones.",
            "Revisit the Spending Plan tab's Investments target together — security and growth aren't actually in conflict."
        ]
    },
    Enthusiast: {
        emoji: '🎉',
        title: 'The Enthusiast',
        desc: "Money is freedom — the ticket to the next trip, the next fun night out, the next new thing. That enthusiasm is contagious, but budgets can feel like a cage, which makes impulse spending an easy trap.",
        strengths: [
            "Brings fun and spontaneity to shared life",
            "Values experiences and freedom over accumulation for its own sake",
            "Contagious optimism about money and life",
            "Doesn't let money anxiety dominate everyday decisions"
        ],
        watchOuts: [
            "Impulse spending, especially under stress or boredom",
            "Budgets feel like a cage, so they get avoided or broken",
            "Can underestimate the long-term cost of short-term fun",
            "Enjoyment now can crowd out plans for later"
        ],
        partnerTips: [
            "Build a real Guilt-Free Spending number into the Spending Plan tab instead of an all-or-nothing budget — restriction backfires.",
            "Frame savings goals as funding future fun, not blocking current fun.",
            "Avoid moralizing about spending; focus on the plan, not the person.",
            "Use Money Dial Alignment in Vision & Dialogue to name what \"worth it\" spending actually looks like for them."
        ]
    },
    Challenger: {
        emoji: '💪',
        title: 'The Challenger',
        desc: "Money is power, protection, and independence to you, and you're not shy about asking for what you're worth. That assertiveness is a strength at the negotiating table — just watch for using money as a way to control situations or people.",
        strengths: [
            "Assertive about their own worth — negotiates well",
            "Protective of their independence",
            "Decisive under financial pressure",
            "Rarely gets taken advantage of"
        ],
        watchOuts: [
            "Can use money to control situations or people",
            "Difficulty compromising on shared financial decisions",
            "May equate flexibility with weakness",
            "Can turn a money conversation into a contest to win"
        ],
        partnerTips: [
            "Give them real ownership over some part of the shared finances so control doesn't become a fight.",
            "Separate \"being right\" from \"being heard\" in money conversations.",
            "Notice if a financial decision is being used to win an argument rather than solve a problem.",
            "Use the Alignment Dialogue's Action Plan to turn a debate into a joint decision with clear next steps."
        ]
    },
    Peacemaker: {
        emoji: '🕊️',
        title: 'The Peacemaker',
        desc: "You'd rather keep the peace than look closely at an uncomfortable number. Conflict-avoidance can mean unopened statements and unspoken money resentments quietly piling up instead of getting addressed.",
        strengths: [
            "Keeps the relationship's peace, even under financial stress",
            "Avoids manufacturing conflict over small money differences",
            "Easygoing — doesn't sweat every fluctuation",
            "Creates a low-drama environment for money talk to happen in"
        ],
        watchOuts: [
            "Avoids checking balances or statements",
            "Lets resentments build silently instead of addressing them",
            "May agree to a plan they don't actually want",
            "Silence can be mistaken for agreement — by both partners"
        ],
        partnerTips: [
            "Create low-pressure, regular check-ins (see the Check-In Frequency preference in My Profile) so money talk isn't only reactive to a crisis.",
            "Ask directly for their honest opinion — they may default to agreeing rather than surfacing a real objection.",
            "Notice silence as a possible sign of discomfort, not necessarily agreement.",
            "Make the first look at a hard number a joint activity, not something they have to face alone."
        ]
    }
};
