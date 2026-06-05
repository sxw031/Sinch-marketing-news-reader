/**
 * TTS Service - Uses Python edge-tts CLI (most reliable, free, no API key)
 * Falls back gracefully if edge-tts is not installed
 */
const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const VOICE = 'en-US-ChristopherNeural';

// Possible edge-tts locations on Render/Linux
const EDGE_TTS_PATHS = [
  'edge-tts',
  '/usr/local/bin/edge-tts',
  '/opt/render/.local/bin/edge-tts',
  path.join(os.homedir(), '.local/bin/edge-tts')
];

let edgeTtsPath = null;

function findEdgeTts() {
  if (edgeTtsPath) return edgeTtsPath;
  const { execSync } = require('child_process');
  for (const p of EDGE_TTS_PATHS) {
    try {
      if (p === 'edge-tts') {
        execSync('which edge-tts', { timeout: 3000 });
        edgeTtsPath = 'edge-tts';
        return edgeTtsPath;
      } else if (fs.existsSync(p)) {
        edgeTtsPath = p;
        return edgeTtsPath;
      }
    } catch (e) { /* continue */ }
  }
  // Try pip install as last resort
  try {
    execSync('pip3 install edge-tts --quiet', { timeout: 30000 });
    edgeTtsPath = 'edge-tts';
    return edgeTtsPath;
  } catch (e) {
    throw new Error('edge-tts not found. Install with: pip3 install edge-tts');
  }
}

/**
 * Generate speech audio using edge-tts Python CLI
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

  // Write text to a temp file to avoid shell escaping issues
  const tmpId = crypto.randomBytes(8).toString('hex');
  const textFile = path.join(os.tmpdir(), `tts_input_${tmpId}.txt`);
  const outputFile = path.join(os.tmpdir(), `tts_output_${tmpId}.mp3`);

  try {
    fs.writeFileSync(textFile, cleanText, 'utf8');

    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('TTS timeout after 60s')), 60000);

      const ttsCmd = findEdgeTts();
      execFile(ttsCmd, [
        '--file', textFile,
        '--voice', voice,
        '--write-media', outputFile
      ], { timeout: 60000 }, (error, stdout, stderr) => {
        clearTimeout(timeout);
        if (error) {
          reject(new Error(`edge-tts failed: ${error.message}`));
        } else {
          resolve();
        }
      });
    });

    // Read the generated MP3
    if (!fs.existsSync(outputFile)) {
      throw new Error('TTS output file not created');
    }

    const audioBuffer = fs.readFileSync(outputFile);
    if (audioBuffer.length < 100) {
      throw new Error('TTS output file is too small');
    }

    return audioBuffer;
  } finally {
    // Cleanup temp files
    try { fs.unlinkSync(textFile); } catch (e) {}
    try { fs.unlinkSync(outputFile); } catch (e) {}
  }
}

/**
 * Generate a podcast script from news articles (~3 minutes)
 */
function generatePodcastScript(news) {
  if (!news || news.length === 0) return null;

  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const companies = [...new Set(news.map(n => n.company))];

  let script = `Good morning and welcome to your MarketFeed Strategic Briefing for ${date}. `;
  script += `I'm your host, and today we're covering key developments across ${companies.length} companies in the Asia-Pacific and global markets. Let's dive right in.\n\n`;

  // Group by company and pick top stories
  const grouped = {};
  news.forEach(n => {
    if (!grouped[n.company]) grouped[n.company] = [];
    grouped[n.company].push(n);
  });

  // Cover top 8 companies with most news for a ~3 min podcast
  const topCompanies = Object.entries(grouped)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 8);

  topCompanies.forEach(([company, articles], idx) => {
    const topArticle = articles[0];
    script += `Story number ${idx + 1}. `;
    script += `${company} is making headlines today. `;
    const title = topArticle.title.replace(/[|–—]/g, ',').replace(/\s+/g, ' ').trim();
    script += `${title}. `;
    if (topArticle.description) {
      const desc = topArticle.description.substring(0, 200).replace(/[|–—]/g, ',').trim();
      if (desc.length > 30) script += `${desc}. `;
    }
    if (articles.length > 1) {
      const second = articles[1];
      const title2 = second.title.replace(/[|–—]/g, ',').replace(/\s+/g, ' ').trim();
      script += `Additionally, ${title2}. `;
    }
    script += '\n\n';
  });

  script += `That wraps up today's strategic briefing from MarketFeed. `;
  script += `Remember, staying informed means staying ahead of the competition. `;
  script += `For Sinch customer success managers, these developments represent potential engagement opportunities with your enterprise clients. `;
  script += `We'll see you next time. Have a great day.`;

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
