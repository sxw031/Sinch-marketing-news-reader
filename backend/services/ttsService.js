/**
 * TTS Service - Pure Node.js using msedge-tts package
 * No Python dependency - works on any Node.js environment including Render
 */
const { MsEdgeTTS, OUTPUT_FORMAT } = require('msedge-tts');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const VOICE = 'en-US-ChristopherNeural';
const FORMAT = OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3;

/**
 * Generate speech audio using msedge-tts (pure Node.js WebSocket)
 * @param {string} text - Text to synthesize
 * @param {object} options - Options (voice, maxLength)
 * @returns {Promise<Buffer>} - MP3 audio buffer
 */
async function generateSpeech(text, options = {}) {
  const voice = options.voice || VOICE;
  const maxLength = options.maxLength || 5000;

  // Clean text for speech
  const cleanText = text
    .replace(/[#*_\[\](){}|>]/g, '')
    .replace(/!\[.*?\]\(.*?\)/g, '')
    .replace(/https?:\/\/\S+/g, '')
    .replace(/\n{2,}/g, '. ')
    .replace(/\n/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .substring(0, maxLength)
    .trim();

  if (!cleanText || cleanText.length < 10) {
    throw new Error('No text to synthesize');
  }

  // Create temp directory for output
  const tmpId = crypto.randomBytes(8).toString('hex');
  const outputDir = path.join(os.tmpdir(), `tts_${tmpId}`);
  fs.mkdirSync(outputDir, { recursive: true });

  try {
    const tts = new MsEdgeTTS();
    await tts.setMetadata(voice, FORMAT);

    const result = await tts.toFile(outputDir, cleanText);
    const audioPath = result.audioFilePath;

    if (!audioPath || !fs.existsSync(audioPath)) {
      throw new Error('TTS output file not created');
    }

    const audioBuffer = fs.readFileSync(audioPath);
    if (audioBuffer.length < 100) {
      throw new Error('TTS output file is too small');
    }

    console.log(`[TTS] Generated ${audioBuffer.length} bytes of audio`);
    return audioBuffer;
  } finally {
    // Cleanup temp directory
    try {
      const files = fs.readdirSync(outputDir);
      files.forEach(f => fs.unlinkSync(path.join(outputDir, f)));
      fs.rmdirSync(outputDir);
    } catch (e) { /* ignore cleanup errors */ }
  }
}

/**
 * Generate a podcast script from news articles (~3 minutes)
 * Focused on top 5 most Sinch-relevant news
 * Style: concise, conversational, slightly humorous, no repetition
 */
function generatePodcastScript(news) {
  if (!news || news.length === 0) return null;

  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  // Sinch relevance keywords for scoring
  const sinchKeywords = ['messaging', 'sms', 'communication', 'api', 'cloud', 'cpaas', 'digital', 'engagement',
    'notification', 'verification', 'authentication', 'omnichannel', 'customer experience', 'cx',
    'mobile', 'platform', 'partnership', 'expansion', 'enterprise', 'fintech', 'banking'];

  // Score each article by Sinch relevance
  const scored = news.map(article => {
    const text = `${article.title} ${article.description || ''}`.toLowerCase();
    let score = 0;
    sinchKeywords.forEach(kw => { if (text.includes(kw)) score += 2; });
    if (text.includes('sinch')) score += 10;
    return { ...article, sinchScore: score };
  });

  // Get top 5 most relevant
  const top5 = scored.sort((a, b) => b.sinchScore - a.sinchScore).slice(0, 5);

  // Transition phrases for variety
  const transitions = [
    'Next up,',
    'Moving on,',
    'Here\'s an interesting one.',
    'And this caught my eye.',
    'Last but not least,'
  ];

  // Sinch angle phrases - varied and concise
  const sinchAngles = {
    messaging: [
      'That\'s right in Sinch\'s wheelhouse.',
      'Classic messaging play, right up our alley.',
      'If that doesn\'t scream Sinch opportunity, I don\'t know what does.'
    ],
    digital: [
      'Digital transformation means new communication needs. You know what that means for us.',
      'Where there\'s platform investment, there\'s API demand.',
      'Another company going digital, another reason to pick up the phone.'
    ],
    expansion: [
      'New markets, new messaging needs. Time to reach out.',
      'Expansion usually means they\'ll need to talk to more customers. We can help with that.',
      'Growth mode activated. Perfect time for a Sinch conversation.'
    ]
  };

  let script = `Hey there, welcome to your MarketFeed Briefing for ${date}. `;
  script += `I'm Christopher, your daily dose of strategic intel. Got five stories for you today, let's dive in.\n\n`;

  top5.forEach((article, idx) => {
    // Use transition phrase
    if (idx === 0) {
      script += `Number one. `;
    } else {
      script += `${transitions[idx]}  `;
    }

    // Combine title and description into one concise summary instead of reading both
    const title = article.title.replace(/[|–—]/g, ',').replace(/\s+/g, ' ').trim();
    const desc = (article.description || '').replace(/[|–—]/g, ',').replace(/\s+/g, ' ').trim();

    // If description adds meaningful new info beyond the title, blend them; otherwise just use title
    const titleWords = new Set(title.toLowerCase().split(/\s+/));
    const descWords = desc.toLowerCase().split(/\s+/);
    const newInfoInDesc = descWords.filter(w => w.length > 4 && !titleWords.has(w)).length;

    script += `${article.company}: ${title}. `;

    // Only add description snippet if it has substantial new info (not repeating the title)
    if (desc.length > 50 && newInfoInDesc > 5) {
      const shortDesc = desc.substring(0, 120).replace(/\s\S*$/, '');
      script += `In short, ${shortDesc}. `;
    }

    // Add concise Sinch angle with variety
    const text = `${article.title} ${article.description || ''}`.toLowerCase();
    if (text.includes('messaging') || text.includes('sms') || text.includes('communication')) {
      script += sinchAngles.messaging[idx % sinchAngles.messaging.length] + ' ';
    } else if (text.includes('digital') || text.includes('platform') || text.includes('api')) {
      script += sinchAngles.digital[idx % sinchAngles.digital.length] + ' ';
    } else if (text.includes('expansion') || text.includes('partnership') || text.includes('launch')) {
      script += sinchAngles.expansion[idx % sinchAngles.expansion.length] + ' ';
    }
    script += '\n\n';
  });

  // Closing - concise with a touch of humor
  script += `And that's your top five. `;
  script += `Quick reminder: the best CSM conversations start with, hey I saw this news about your company. Simple, but it works every time. `;
  script += `Alright, go crush it today. See you tomorrow on MarketFeed!`;

  return script;
}

/**
 * Generate a report summary script for TTS
 */
function generateReportScript(reportText) {
  if (!reportText) return null;

  let script = `Here is your strategic report audio summary. `;
  const lines = reportText.split('\n').filter(l => l.trim());
  const sections = [];
  let currentSection = null;

  lines.forEach(line => {
    if (line.startsWith('#')) {
      if (currentSection) sections.push(currentSection);
      const title = line.replace(/^#+\s*/, '').replace(/[*_#🚀🤝💰💻⚠️🎯📊🏢📋]/g, '').trim();
      currentSection = { title, content: [] };
    } else if (currentSection && line.trim() && !line.startsWith('!') && !line.startsWith('[') && !line.startsWith('>') && !line.startsWith('---')) {
      const clean = line.replace(/[*_#\[\]()>|]/g, '').replace(/https?:\/\/\S+/g, '').trim();
      if (clean.length > 10) currentSection.content.push(clean);
    }
  });
  if (currentSection) sections.push(currentSection);

  sections.slice(0, 6).forEach(section => {
    if (section.title) script += `${section.title}. `;
    const content = section.content.slice(0, 3).join('. ');
    if (content) script += `${content}. `;
  });

  script += `End of report summary. For full details, please review the written report.`;
  return script;
}

module.exports = { generateSpeech, generatePodcastScript, generateReportScript };
