export const agentConfig = {
  agentName: "Sales Coach",
  orgName: "SEI",
  fullTitle: "SEI Sales Coach",
  coachId: "104f2b5e-a45a-4729-a536-70d2ea936445",

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
      "Executive Pitch",
      "Renewal / Upsell",
    ],
    durationLabel: "Session Duration",
    durations: [
      {
        id: "quick",
        label: "Quick Practice",
        duration: "15 minutes",
        stats: "1-2 scenarios",
        desc: "Focused drill on one skill",
        use: "Objection handling reps, elevator pitch practice",
      },
      {
        id: "standard",
        label: "Standard Session",
        duration: "30 minutes",
        stats: "2-4 scenarios",
        desc: "Full coaching session",
        use: "Discovery call prep, demo walkthroughs, pitch refinement",
      },
      {
        id: "deep",
        label: "Deep Dive",
        duration: "60 minutes",
        stats: "Full deal review",
        desc: "Comprehensive deal strategy",
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
      badge: "SEI Sales Coach",
      headline: "Master Every Sales Conversation",
      subheadline: "Backed by decades of sales methodology and real-world deal experience. Practice with precision, close with confidence.",
      stats: [
        { value: "$2B+", label: "Revenue Influenced" },
        { value: "30+", label: "Years Experience" },
        { value: "Expert-Backed", label: "Proven Methodology" },
      ],
    },
    whatYoullMaster: {
      sectionTitle: "What You'll Practice",
      subtitle: "Comprehensive sales coaching tailored to your deals and goals",
      features: [
        {
          title: "Discovery & Qualification",
          description: "Master the art of uncovering pain points, asking powerful questions, and qualifying opportunities to focus your time on deals that close.",
        },
        {
          title: "Objection Handling",
          description: "Build confidence navigating pricing pushback, competitor comparisons, and status quo objections with proven frameworks.",
        },
        {
          title: "Closing & Negotiation",
          description: "Develop strategies for creating urgency, structuring proposals, and guiding prospects through complex buying decisions.",
        },
      ],
    },
    yourPath: {
      steps: [
        { title: "Set Your Sales Scenario", description: "Share the deal context, prospect details, and what you're preparing for" },
        { title: "Practice with Our AI Coach", description: "Engage in a realistic sales conversation tailored to your deal and experience level" },
        { title: "Get Your Performance Scorecard", description: "Receive detailed feedback on your discovery, messaging, and closing technique" },
        { title: "Refine Your Approach", description: "Practice again to sharpen your pitch and build confidence with each session" },
        { title: "Close with Confidence", description: "Walk into your next meeting prepared, articulate, and ready to win" },
      ],
    },
    builtByExperts: {
      headline: "Built by a Team of Sales Leaders",
      description: "Our methodology comes from decades of enterprise sales experience across industries, deal sizes, and buying committees. We know what wins deals because we've closed them ourselves.",
      credibility: "Refined through thousands of real sales engagements",
    },
    finalCta: {
      subtitle: "Join sales professionals who trust SEI's expertise to elevate their performance",
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
