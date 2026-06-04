const { execFile } = require('child_process');
const fs = require('fs');
const path = require('path');
const os = require('os');

// Professional voices - warm, confident, authoritative
const VOICE = 'en-US-ChristopherNeural'; // Reliable, Authority - like a famous news anchor
const FALLBACK_VOICE = 'en-US-GuyNeural';

/**
 * Generate speech audio from text using Microsoft Edge TTS (free, no API key needed)
 * Returns a Buffer containing MP3 audio data
 */
async function generateSpeech(text, options = {}) {
  const voice = options.voice || VOICE;
  const maxLength = options.maxLength || 5000;
  
  // Clean text for speech
  const cleanText = text
    .replace(/[#*_\[\](){}|>]/g, '')  // Remove markdown
    .replace(/!\[.*?\]\(.*?\)/g, '')   // Remove image links
    .replace(/https?:\/\/\S+/g, '')    // Remove URLs
    .replace(/\n{2,}/g, '. ')          // Replace double newlines with pause
    .replace(/\n/g, ' ')              // Replace single newlines with space
    .replace(/\s{2,}/g, ' ')          // Collapse whitespace
    .substring(0, maxLength)
    .trim();

  if (!cleanText || cleanText.length < 10) {
    throw new Error('No text to synthesize');
  }

  // Write text to temp file (avoids shell arg length limits)
  const tmpTextFile = path.join(os.tmpdir(), `tts_input_${Date.now()}.txt`);
  const tmpAudioFile = path.join(os.tmpdir(), `tts_output_${Date.now()}.mp3`);

  fs.writeFileSync(tmpTextFile, cleanText, 'utf8');

  return new Promise((resolve, reject) => {
    const args = [
      '--voice', voice,
      '--file', tmpTextFile,
      '--write-media', tmpAudioFile
    ];

    const tryVoice = (voiceName, isRetry = false) => {
      args[1] = voiceName;
      execFile('edge-tts', args, { timeout: 60000 }, (error) => {
        if (error) {
          if (!isRetry && voiceName !== FALLBACK_VOICE) {
            console.log(`[TTS] Voice ${voiceName} failed, trying fallback...`);
            tryVoice(FALLBACK_VOICE, true);
            return;
          }
          cleanup(tmpTextFile);
          cleanup(tmpAudioFile);
          reject(new Error(`TTS failed: ${error.message}`));
          return;
        }

        fs.readFile(tmpAudioFile, (err, data) => {
          cleanup(tmpTextFile);
          cleanup(tmpAudioFile);
          if (err || !data || data.length < 100) {
            reject(new Error('Generated audio is empty or unreadable'));
          } else {
            resolve(data);
          }
        });
      });
    };

    tryVoice(voice);
  });
}

function cleanup(filePath) {
  try { fs.unlinkSync(filePath); } catch (e) { /* ignore */ }
}

/**
 * Generate a podcast script from news articles (no AI needed)
 */
function generatePodcastScript(news) {
  if (!news || news.length === 0) return null;

  const date = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
  const companies = [...new Set(news.map(n => n.company))];
  
  let script = `Good morning and welcome to your MarketFeed Strategic Briefing for ${date}. `;
  script += `I'm your host, and today we're covering developments across ${companies.length} companies in the Asia-Pacific and global markets. Let's dive right in. `;

  // Group by company and pick top stories
  const grouped = {};
  news.forEach(n => {
    if (!grouped[n.company]) grouped[n.company] = [];
    grouped[n.company].push(n);
  });

  // Cover top 5 companies with most news
  const topCompanies = Object.entries(grouped)
    .sort((a, b) => b[1].length - a[1].length)
    .slice(0, 5);

  topCompanies.forEach(([company, articles], idx) => {
    const topArticle = articles[0];
    script += `Moving to story number ${idx + 1}. `;
    script += `${company} is making headlines today. `;
    
    // Clean title for speech
    const title = topArticle.title.replace(/[|–—]/g, ',').replace(/\s+/g, ' ').trim();
    script += `${title}. `;
    
    if (topArticle.description) {
      const desc = topArticle.description.substring(0, 120).replace(/[|–—]/g, ',').trim();
      if (desc.length > 30) script += `${desc}. `;
    }
    if (articles.length > 1) {
      script += `We're also tracking ${articles.length - 1} other development${articles.length > 2 ? 's' : ''} from ${company}. `;
    }
  });

  script += `That wraps up today's strategic briefing. Remember, staying informed means staying ahead of the competition. `;
  script += `We'll see you next time on MarketFeed. Have a great day. `;

  return script;
}

/**
 * Generate a report summary script (no AI needed)
 */
function generateReportScript(reportText) {
  if (!reportText) return null;
  
  let script = `Here is your strategic report audio summary. `;
  
  // Extract key sections from markdown
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

  sections.slice(0, 5).forEach(section => {
    if (section.title) script += `${section.title}. `;
    const content = section.content.slice(0, 2).join('. ');
    if (content) script += `${content}. `;
  });

  script += `End of report summary. For full details, please review the written report. Thank you for listening.`;
  return script;
}

module.exports = { generateSpeech, generatePodcastScript, generateReportScript };
