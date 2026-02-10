export const agentConfig = {
  agentName: "Sales Coach",
  orgName: "SEI",
  fullTitle: "SEI Sales Coach",
  coachId: "b5705fb7-9378-4e84-9bb2-1dc7b6466cd2",

  elevenLabsAgentId: process.env.ELEVENLABS_AGENT_ID || "",

  persona: "You are an expert sales coach from Systems Evolution, Inc. (SEI). You help sales professionals sharpen their pitch, handle objections, and close deals with confidence.",
  contextLabel: "Scenario Type",
  sessionNoun: "sales conversation",
  userNoun: "sales rep",

  systemInstructions: [
    "Stay in character as a supportive but rigorous SEI sales coach.",
    "If the rep's pitch is weak, provide constructive feedback on messaging, objection handling, and value articulation.",
    "Use the provided background information to personalize advice and reference specific deals or industries where relevant.",
    "Keep responses concise and actionable to maintain the flow of a real coaching session.",
    "Focus on discovery techniques, value selling, objection handling, and closing strategies.",
    "DO NOT use any emojis in your responses. Keep the text professional and clean.",
  ],

  initialMessage: "Hello, I am ready to start my sales coaching session.",
  fallbackGreeting: "Hi! I'm your SEI sales coach. I'm having a little trouble connecting right now, but let's get started. Tell me about the deal or scenario you'd like to work on.",

  objectivesPrompt: (role: string, company: string, contextType: string) =>
    `Generate 4-5 specific, high-level "Key Objectives" for a ${role} at ${company} preparing for a ${contextType} sales scenario.\nReturn only a JSON array of strings. No extra text. DO NOT use emojis.\n\nExample: ["Articulate clear value proposition", "Handle pricing objections with confidence"]`,

  onboarding: {
    contextTypeLabel: "Scenario Type",
    contextTypes: [
      "Discovery Call",
      "Product Demo",
      "Objection Handling",
      "Negotiation & Close",
    ],
    durationLabel: "Session Duration",
    durations: [
      {
        id: "quick",
        label: "Quick Practice",
        duration: "15 minutes",
        stats: "1-2 scenarios",
        desc: "Focused sales pitch",
        use: "Objection handling reps, elevator pitch practice",
      },
      {
        id: "standard",
        label: "Standard Session",
        duration: "30 minutes",
        stats: "2-4 scenarios",
        desc: "Standard coaching session",
        use: "Discovery call prep, demo walkthroughs, pitch refinement",
      },
      {
        id: "deep",
        label: "Deep Dive",
        duration: "60 minutes",
        stats: "Full deal review",
        desc: "Full deal review and strategy",
        use: "Enterprise deal prep, executive presentations, complex negotiations",
      },
    ],
    resumeLabel: "Upload Deal Context",
    resumeHint: "Upload any deal notes, proposals, or account info. This is only used during this session to personalize coaching.",
    jobDescriptionPlaceholder: "Paste details about the prospect, their pain points, or the deal context to help the AI tailor your coaching...",
    voiceOptionLabel: "Voice Coaching",
    voiceOptionDesc: "Practice your pitch out loud with the AI coach",
    textOptionLabel: "Text Coaching",
    textOptionDesc: "Type your responses and read the coach's feedback",
    loadingMessages: [
      "Analyzing your deal context...",
      "Building your personalized session...",
      "Preparing your coaching experience...",
      "Almost ready...",
    ],
    startButtonLabel: "Start Coaching",
    step1Title: "Tell us about the deal",
    step2Title: "Upload your context",
    step3Title: "What's your scenario?",
    roleLabel: "Your Role",
    companyLabel: "Prospect Company",
    contextDetailLabel: "Deal Context (Optional)",
    documentParsingMessage: "Parsing your document...",
    pasteLabel: "Or Paste Context",
    pastePlaceholder: "Paste deal notes, account info, or prospect details here...",
  },

  coachPage: {
    headerTitle: "SEI",
    headerSubtitle: "Sales Coach",
    thinkingMessage: "Coach is thinking...",
    waitingMessage: "Waiting for you to start the session...",
    endSessionLabel: "End Session & Generate Scorecard",
    voiceSpeakingLabel: "Coach is speaking...",
    voiceListeningLabel: "Listening...",
    voiceReadyLabel: "Ready — start speaking",
    voiceStartButton: "Start Voice Session",
  },

  landing: {
    hero: {
      badge: "SEI ENTERPRISE AI SOLUTION",
      headline: "Master Every Sales Pitch",
      subheadline: "An intelligent voice agent trained on your playbooks, CRM data, and product catalog, helping your team practice, prepare, and perform.",
      primaryCta: "Try the Demo",
      secondaryCta: "Contact Us",
      secondaryCtaHref: "mailto:cminer@sei.com?subject=SEI%20Sales%20Coach%20Inquiry",
      stats: [
        { value: "Your Data", label: "Import via CSV or admin dashboard" },
        { value: "Voice & Text", label: "Realistic coaching in both modes" },
        { value: "Rapid Deployment", label: "Weeks, not months" },
      ],
    },
    whatYoullMaster: {
      sectionTitle: "What You Get",
      subtitle: "A fully configurable AI agent platform deployed on your data",
      features: [
        {
          title: "Grounded in Your Data",
          description: "Connect your sales playbooks, product catalogs, pricing guides, and CRM insights. The AI coaches reps using your real competitive positioning, not generic advice.",
        },
        {
          title: "Practice Any Scenario",
          description: "From discovery calls to upsell conversations to executive pitches, reps rehearse against realistic AI simulations tailored to their accounts and pipeline.",
        },
        {
          title: "Admin Control & Visibility",
          description: "Teams can manage content, fine-tune AI behavior, and track usage. Import from CSV, or build directly in the dashboard.",
        },
      ],
    },
    yourPath: {
      sectionTitle: "How It Works",
      steps: [
        { title: "Configure The Agent", description: "Define coaching persona, onboarding flow, and interaction style for specific use cases" },
        { title: "Load Content", description: "Import playbooks, frameworks, and training materials via the admin dashboard" },
        { title: "Teams Practice", description: "Reps engage in realistic voice or text coaching sessions grounded in actual methodology" },
        { title: "AI Generates Insights", description: "Scorecards, assessments, and performance data delivered after every session" },
        { title: "Iterate & Scale", description: "Update custom content and adjust AI behavior with ease" },
      ],
    },
    builtByExperts: {
      headline: "Enterprise-Grade Infrastructure",
      description: "Built on a modern, serverless stack with usage-based pricing and no per-seat licensing. Your data stays in your environment. The platform scales from a 10-person pilot to a 5,000-person rollout with zero infrastructure changes.",
      credibility: "Backed by Anthropic, OpenAI, and ElevenLabs",
    },
    finalCta: {
      headline: "Ready to See It in Action?",
      subtitle: "Try the demo above, or reach out to discuss a custom deployment for your organization.",
      primaryCta: "Try the Demo",
      secondaryCta: "Get in Touch",
      secondaryCtaHref: "mailto:cminer@sei.com?subject=SEI%20Sales%20Coach%20Inquiry",
    },
    footer: {
      brandName: "SEI",
    },
  },

  scorecard: {
    title: "Your Sales Performance Scorecard",
    emailPrompt: "Enter your email address to receive your detailed scorecard and download a PDF copy for your records.",
    generateButton: "Generate Scorecard",
  },

  admin: {
    stages: ["Discovery Call", "Demo", "Negotiation", "Close", "Renewal"],
    contentQualityNote: "The AI coach retrieves content based on semantic similarity. Only publish documents reviewed by SEI sales experts. Use Draft status for work-in-progress content.",
    dashboardSubtitle: "Manage and Monitor the resources that our model uses to run great sales coaching sessions and provide meaningful feedback.",
  },
};

export type AgentConfig = typeof agentConfig;
