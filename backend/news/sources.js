const { fetchRedditNews } = require("./sources/reddit");
const { fetchXNews } = require("./sources/x");
const { fetchCompanyNews } = require("./sources/company");
const { fetchMagazineNews } = require("./sources/magazine");

// Returns array of news items from all open sources
async function getAllNews({ companies = [], limit = 100 }) {
  const [reddit, x, company, magazine] = await Promise.all([
    fetchRedditNews({ companies, limit }),
    fetchXNews({ companies, limit }),
    fetchCompanyNews({ companies, limit }),
    fetchMagazineNews({ companies, limit })
  ]);
  return [
    ...reddit,
    ...x,
    ...company,
    ...magazine,
  ].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0,limit);
}

module.exports = { getAllNews };
