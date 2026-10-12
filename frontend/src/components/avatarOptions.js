export const AVATAR_OPTIONS = [
  {
    value: '/model.glb',
    label: 'Original interviewer',
    scale: 1.2,
    offset: [0, 0, 0],
    voiceConfig: {
      langMatches: ['en-US', 'en-GB'],
      keywords: ['Guy', 'David', 'Daniel', 'George', 'Male', 'Natural'],
      gender: 'male',
      pitch: 0.96,
      rate: 0.93,
      greeting: "Hello, I am your lead interviewer. We're ready to get started whenever you are."
    }
  },
  {
    value: '/facial_animation.glb',
    label: 'Facial animation interviewer',
    scale: 1.79,
    offset: [0.22, -0.90, -1.3],
    voiceConfig: {
      langMatches: ['en-US', 'en-GB'],
      keywords: ['Samantha', 'Jenny', 'Zira', 'Victoria', 'Female', 'Natural'],
      gender: 'female',
      pitch: 1.18,
      rate: 0.97,
      greeting: "Hi there! I will be conducting your interview today. Feel free to answer at your own pace."
    }
  },
  {
    value: '/animated_google_ceo_sundar_pichai_avatar.glb',
    label: 'Sundar Pichai avatar',
    scale: 0.6,
    offset: [0, 0, 0],
    voiceConfig: {
      langMatches: ['en-IN', 'en-GB', 'en-US'],
      keywords: ['India', 'Indian', 'Ravi', 'Heera', 'David', 'Google'],
      gender: 'male',
      pitch: 0.85,
      rate: 0.88,
      greeting: "Hello, wonderful to connect with you. I look forward to learning all about your technical experiences."
    }
  },
];

export const selectVoiceForAvatar = (voices, config) => {
  if (!voices || voices.length === 0 || !config) return null;
  const englishVoices = voices.filter(v => v.lang.toLowerCase().startsWith('en'));
  const candidatePool = englishVoices.length > 0 ? englishVoices : voices;

  // 1. Language code match (e.g. en-IN)
  if (config.langMatches && config.langMatches.length > 0) {
    for (const code of config.langMatches) {
      const match = candidatePool.find(v => v.lang.toLowerCase().includes(code.toLowerCase()));
      if (match) return match;
    }
  }

  // 2. Preferred name keywords
  if (config.keywords && config.keywords.length > 0) {
    for (const kw of config.keywords) {
      const match = candidatePool.find(v => v.name.toLowerCase().includes(kw.toLowerCase()));
      if (match) return match;
    }
  }

  // 3. Gender preference match
  if (config.gender === 'female') {
    const femaleMatch = candidatePool.find(v => 
      /female|woman|zira|samantha|jenny|victoria|karen|fiona|catherine/i.test(v.name)
    );
    if (femaleMatch) return femaleMatch;
  } else if (config.gender === 'male') {
    const maleMatch = candidatePool.find(v => 
      /male|man|david|guy|daniel|george|mark|alex|richard/i.test(v.name) &&
      !/female|woman|zira|samantha|jenny/i.test(v.name)
    );
    if (maleMatch) return maleMatch;
  }

  return candidatePool[0] || null;
};
