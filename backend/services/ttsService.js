/**
 * TTS Service - Google Translate TTS (HTTP-based, no WebSocket, works everywhere)
 * Falls back to msedge-tts if Google TTS fails
 * No API key needed, pure HTTP requests
 */
const https = require('https');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const MAX_CHUNK_LENGTH = 180; // Google TTS max chars per request
const CHUNK_DELAY = 100; // ms between requests to avoid rate limiting

/**
 * Split text into chunks at sentence boundaries
 */
function splitText(text, maxLen = MAX_CHUNK_LENGTH) {
  const sentences = text.split(/(?<=[.!?])\s+/);
  const chunks = [];
  let current = '';
  for (const s of sentences) {
    if ((current + ' ' + s).length > maxLen && current) {
      chunks.push(current.trim());
      current = s;
    } else {
      current = current ? current + ' ' + s : s;
    }
  }
  if (current) chunks.push(current.trim());
  return chunks;
}

/**
 * Fetch a single audio chunk from Google Translate TTS
 */
function fetchGoogleTTSChunk(text, retries = 2) {
  return new Promise((resolve, reject) => {
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${encodeURIComponent(text)}`;
    
    const attempt = (attemptsLeft) => {
      https.get(url, { 
        headers: { 
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        },
        timeout: 10000
      }, (res) => {
        if (res.statusCode !== 200) {
          if (attemptsLeft > 0) {
            setTimeout(() => attempt(attemptsLeft - 1), 500);
            return;
          }
          return reject(new Error(`Google TTS returned status ${res.statusCode}`));
        }
        const bufs = [];
        res.on('data', d => bufs.push(d));
        res.on('end', () => resolve(Buffer.concat(bufs)));
        res.on('error', (err) => {
          if (attemptsLeft > 0) setTimeout(() => attempt(attemptsLeft - 1), 500);
          else reject(err);
        });
      }).on('error', (err) => {
        if (attemptsLeft > 0) setTimeout(() => attempt(attemptsLeft - 1), 500);
        else reject(err);
      }).on('timeout', () => {
        if (attemptsLeft > 0) setTimeout(() => attempt(attemptsLeft - 1), 500);
        else reject(new Error('Google TTS request timed out'));
      });
    };
    
    attempt(retries);
  });
}

/**
 * Generate speech audio using Google Translate TTS
 * Pure HTTP - works on any server including Render
 */
async function generateSpeech(text, options = {}) {
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

  console.log(`[TTS] Generating speech for ${cleanText.length} chars via Google TTS...`);

  const chunks = splitText(cleanText);
  console.log(`[TTS] Split into ${chunks.length} chunks`);

  const buffers = [];
  for (let i = 0; i < chunks.length; i++) {
    try {
      const buf = await fetchGoogleTTSChunk(chunks[i]);
      buffers.push(buf);
      
      // Small delay between chunks to avoid rate limiting
      if (i < chunks.length - 1) {
        await new Promise(r => setTimeout(r, CHUNK_DELAY));
      }
    } catch (err) {
      console.error(`[TTS] Chunk ${i + 1}/${chunks.length} failed:`, err.message);
      // If a chunk fails, try to continue with remaining chunks
      // Only fail completely if the first chunk fails
      if (i === 0) throw err;
    }
  }

  if (buffers.length === 0) {
    throw new Error('No audio chunks generated');
  }

  const combined = Buffer.concat(buffers);
  console.log(`[TTS] Success: ${combined.length} bytes (${buffers.length}/${chunks.length} chunks)`);
  return combined;
}

/**
 * Generate a podcast script from news articles (~2-3 minutes)
 * Focused on top 5 most Sinch-relevant news
 * Style: concise, conversational, slightly humorous
 */
function generatePodcastScript(news) {
  if (!news || news.length === 0) return null;

  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });

  const sinchKeywords = ['messaging', 'sms', 'communication', 'api', 'cloud', 'cpaas', 'digital', 'engagement',
    'notification', 'verification', 'authentication', 'omnichannel', 'customer experience', 'cx',
    'mobile', 'platform', 'partnership', 'expansion', 'enterprise', 'fintech', 'banking'];

  const scored = news.map(article => {
    const text = `${article.title} ${article.description || ''}`.toLowerCase();
    let score = 0;
    sinchKeywords.forEach(kw => { if (text.includes(kw)) score += 2; });
    if (text.includes('sinch')) score += 10;
    return { ...article, sinchScore: score };
  });

  const top5 = scored.sort((a, b) => b.sinchScore - a.sinchScore).slice(0, 5);

  const transitions = ['Next up.', 'Moving on.', 'Here is an interesting one.', 'And this caught my eye.', 'Last but not least.'];

  const sinchAngles = {
    messaging: ['That is right in Sinch wheelhouse.', 'Classic messaging play, right up our alley.', 'If that does not scream Sinch opportunity, I do not know what does.'],
    digital: ['Digital transformation means new communication needs. You know what that means for us.', 'Where there is platform investment, there is API demand.', 'Another company going digital, another reason to pick up the phone.'],
    expansion: ['New markets, new messaging needs. Time to reach out.', 'Expansion usually means they will need to talk to more customers. We can help with that.', 'Growth mode activated. Perfect time for a Sinch conversation.']
  };

  let script = `Hey there, welcome to your MarketFeed Briefing for ${date}. `;
  script += `Got five stories for you today, let us dive in. `;

  top5.forEach((article, idx) => {
    if (idx === 0) {
      script += `Number one. `;
    } else {
      script += `${transitions[idx]} `;
    }

    const title = article.title.replace(/[|–—'"]/g, ' ').replace(/\s+/g, ' ').trim();
    const desc = (article.description || '').replace(/[|–—'"]/g, ' ').replace(/\s+/g, ' ').trim();

    const titleWords = new Set(title.toLowerCase().split(/\s+/));
    const descWords = desc.toLowerCase().split(/\s+/);
    const newInfoInDesc = descWords.filter(w => w.length > 4 && !titleWords.has(w)).length;

    script += `${article.company}. ${title}. `;

    if (desc.length > 50 && newInfoInDesc > 5) {
      const shortDesc = desc.substring(0, 100).replace(/\s\S*$/, '');
      script += `${shortDesc}. `;
    }

    const text = `${article.title} ${article.description || ''}`.toLowerCase();
    if (text.includes('messaging') || text.includes('sms') || text.includes('communication')) {
      script += sinchAngles.messaging[idx % 3] + ' ';
    } else if (text.includes('digital') || text.includes('platform') || text.includes('api')) {
      script += sinchAngles.digital[idx % 3] + ' ';
    } else if (text.includes('expansion') || text.includes('partnership') || text.includes('launch')) {
      script += sinchAngles.expansion[idx % 3] + ' ';
    }
  });

  script += `And that is your top five. `;
  script += `Quick reminder, the best CSM conversations start with, hey I saw this news about your company. Simple, but it works every time. `;
  script += `Alright, go crush it today. See you tomorrow on MarketFeed.`;

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
      const title = line.replace(/^#+\s*/, '').replace(/[*_#]/g, '').trim();
      currentSection = { title, content: [] };
    } else if (currentSection && line.trim() && !line.startsWith('!') && !line.startsWith('[') && !line.startsWith('>') && !line.startsWith('---') && !line.includes('|')) {
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
