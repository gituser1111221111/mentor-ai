// Knowledge checks: 4 questions per chapter. a = index of the correct option.
window.BIG_CHECKS = {
  reset: [
    { q: "What is net worth?", o: ["Your yearly salary", "Everything you own minus everything you owe", "Your savings account balance", "Your credit score"], a: 1, why: "Net worth = assets - debts. A negative number early on is normal; the trend matters." },
    { q: "What is the main goal of a 'money reset'?", o: ["Pay off all debt this month", "Get an honest picture of income, spending, and debt, then pick next steps", "Cancel every subscription", "Open a brokerage account"], a: 1, why: "A reset starts with facing the real numbers so your next moves are based on facts." },
    { q: "Which should you track first?", o: ["Where your money actually goes each month", "Stock prices", "Your friends' spending", "Crypto charts"], a: 0, why: "You can't change spending you haven't measured." },
    { q: "How often should you re-check your net worth?", o: ["Every day", "Never", "About once a quarter", "Only when you get a raise"], a: 2, why: "Quarterly is frequent enough to see progress without obsessing over noise." },
  ],
  budgeting: [
    { q: "In a needs / wants / savings split, which are 'needs'?", o: ["Streaming and dining out", "Rent, groceries, utilities, minimum debt payments", "New clothes", "Vacations"], a: 1, why: "Needs are costs you must pay to live and keep your finances in good standing." },
    { q: "Why add a buffer category to a budget?", o: ["To spend more", "Because irregular costs happen and rigid budgets break", "Banks require it", "It lowers taxes"], a: 1, why: "A buffer absorbs surprises so one unexpected cost doesn't wreck the whole month." },
    { q: "Your take-home is $3,000 and your fixed costs are $2,900. What is the real problem?", o: ["You need a better app", "Almost no room for savings or surprises", "Your budget is perfect", "You should invest more"], a: 1, why: "$100 of slack is too thin. Look at the largest fixed cost (usually housing) first." },
    { q: "What makes a budget actually work long term?", o: ["Being as strict as possible", "Being realistic and reviewed regularly", "Never changing it", "Tracking only big purchases"], a: 1, why: "Budgets that feel punishing get abandoned. Realistic and flexible wins." },
  ],
  credit: [
    { q: "Which factor affects most credit scores the most?", o: ["Your income", "Payment history", "Your age", "Your bank"], a: 1, why: "On-time payments are the largest factor in the common scoring models." },
    { q: "Your card limit is $2,000 and your balance is $1,000. What is your utilization?", o: ["10%", "25%", "50%", "100%"], a: 2, why: "1,000 / 2,000 = 50%. Under 30% is the usual target; under 10% is better." },
    { q: "What does a hard inquiry usually come from?", o: ["Checking your own score", "Applying for new credit", "Paying a bill on time", "Using a debit card"], a: 1, why: "Applying for a card or loan triggers a hard inquiry. Checking your own score doesn't." },
    { q: "Which habit helps build credit responsibly?", o: ["Carrying a balance to 'show activity'", "Paying the statement balance in full each month", "Opening many cards at once", "Paying late occasionally"], a: 1, why: "You don't need to carry a balance. Paying in full avoids interest and builds history." },
  ],
  debt_payoff: [
    { q: "Which method pays the smallest balance first?", o: ["Avalanche", "Snowball", "Consolidation", "Minimum-only"], a: 1, why: "Snowball targets the smallest balance first for quick wins and momentum." },
    { q: "Which method usually saves the most interest?", o: ["Snowball", "Avalanche (highest APR first)", "Paying randomly", "Paying the newest debt first"], a: 1, why: "Avalanche attacks the highest interest rate first, so less interest accrues overall." },
    { q: "Why do minimum payments keep you in debt so long?", o: ["They are illegal", "Most of the payment can go to interest early on", "They never change", "Banks lower your limit"], a: 1, why: "Early payments are mostly interest, so the balance shrinks slowly." },
    { q: "You get an extra $100 this month. Best use if you have a 24% APR card balance?", o: ["Put it on the 24% card", "Buy a lottery ticket", "Hold it in a checking account", "Pay a 0% balance instead"], a: 0, why: "Paying down a 24% balance is a guaranteed 24% 'return'." },
  ],
  investing: [
    { q: "What does diversification mean?", o: ["Owning one great stock", "Spreading money across many investments", "Selling when markets drop", "Only buying bonds"], a: 1, why: "Spreading risk means no single company or sector can sink your whole portfolio." },
    { q: "What is dollar-cost averaging?", o: ["Investing a fixed amount on a regular schedule", "Buying only when prices fall", "Timing the market", "Selling every month"], a: 0, why: "Regular fixed contributions remove the pressure of guessing the 'perfect' day." },
    { q: "Why do low expense ratios matter?", o: ["They don't", "Fees compound against you over decades", "They guarantee returns", "They only affect bonds"], a: 1, why: "A 1% yearly fee on a long-term portfolio can cost tens of thousands over time." },
    { q: "Which is a realistic mindset for beginners?", o: ["Get rich quickly", "Invest consistently for the long term and avoid panic selling", "Predict the next hot stock", "Only invest when you feel confident"], a: 1, why: "Time in the market and steady habits beat predictions for most people." },
  ],
  ai: [
    { q: "What should you never paste into an AI tool?", o: ["A budget with rounded numbers", "Account numbers, passwords, SSN", "A generic question", "A spending category list"], a: 1, why: "Never share account numbers, passwords, or identifiers with AI tools." },
    { q: "How should you treat AI financial output?", o: ["As a guaranteed answer", "As a starting point to verify", "As legal advice", "As a replacement for a professional"], a: 1, why: "AI can be wrong or outdated. Check numbers and sources before acting." },
    { q: "Which is a good use of AI for money?", o: ["Telling you exactly which stock to buy", "Organizing and categorizing your spending to spot patterns", "Filing your taxes without review", "Replacing a budget"], a: 1, why: "AI is strongest at structuring and explaining, not making final financial decisions." },
    { q: "Why include numbers and constraints in a prompt?", o: ["It's required", "Specific inputs produce more useful, tailored answers", "It makes the answer longer", "It hides your data"], a: 1, why: "Clear context and constraints lead to better responses." },
  ],
  careers: [
    { q: "What is a good informational interview request?", o: ["'Can you get me a job?'", "A short note asking for 15 minutes to hear about their path", "A long essay about yourself", "A call at 11 PM"], a: 1, why: "Small, specific asks are easy to say yes to." },
    { q: "Why track your applications and outreach?", o: ["To look busy", "So you can follow up on time and see what's working", "Companies require it", "It improves your GPA"], a: 1, why: "A simple tracker prevents missed follow-ups and shows patterns." },
    { q: "When comparing job offers, what matters beyond salary?", o: ["Nothing", "Benefits, 401(k) match, growth, location, and cost of living", "Office plants", "Company logo"], a: 1, why: "Total compensation and costs of living change what an offer is really worth." },
    { q: "What is a smart follow-up after no reply?", o: ["Send 10 messages a day", "One polite follow-up after about a week", "Never follow up", "Call their personal phone"], a: 1, why: "A single, polite nudge is professional and often works." },
  ],
  taxes_paychecks: [
    { q: "What is the difference between gross and net pay?", o: ["Gross is after taxes", "Net is what you take home after taxes and deductions", "They are the same", "Net is before taxes"], a: 1, why: "Gross is the headline salary. Net is what lands in your account." },
    { q: "Which taxes are withheld to fund Social Security and Medicare?", o: ["Sales tax", "FICA", "Property tax", "Estate tax"], a: 1, why: "FICA = 6.2% Social Security (up to a wage cap) + 1.45% Medicare for employees." },
    { q: "How does a progressive tax system work?", o: ["All income is taxed at one rate", "Each slice of income is taxed at its own bracket rate", "Higher earners pay no tax", "Only the last dollar is taxed"], a: 1, why: "Only income inside each bracket is taxed at that rate. A raise never lowers your take-home." },
    { q: "Why does a traditional 401(k) contribution lower your take-home pay less than the amount contributed?", o: ["It doesn't", "It's made before income tax, so you pay less tax now", "Employers pay it all", "It's a refund"], a: 1, why: "Pre-tax contributions reduce taxable income, so the real cost to take-home is smaller." },
  ],
  insurance_risk: [
    { q: "What is a deductible?", o: ["Your monthly bill", "What you pay before insurance starts paying", "The maximum payout", "A tax credit"], a: 1, why: "The deductible is your share of a covered loss before insurance contributes." },
    { q: "What is a premium?", o: ["The amount you pay regularly to keep coverage", "A bonus from insurers", "Your claim payment", "A tax"], a: 0, why: "Premiums are the recurring price of the policy." },
    { q: "Why does renters insurance matter for young adults?", o: ["It's required by law", "It covers belongings and liability for a low monthly cost", "It lowers rent", "It covers the building"], a: 1, why: "Renters insurance protects your stuff and covers liability, often for about the cost of a few coffees a month." },
    { q: "What does an emergency fund have to do with insurance?", o: ["Nothing", "It helps cover deductibles and costs insurance doesn't", "It replaces all insurance", "It lowers premiums automatically"], a: 1, why: "Savings cover deductibles and uncovered costs, so one bad event doesn't push you into debt." },
  ],
};
