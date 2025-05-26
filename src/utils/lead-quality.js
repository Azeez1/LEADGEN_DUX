// Lead qualification and scoring utilities

const REQUIRED_FIELDS = ['name', 'email'];
const MINIMUM_ENRICHMENT_FIELDS = 2; // linkedin, website, company_info, social_profiles

const FIELD_WEIGHTS = {
  name: 10,
  email: 10,
  company: 15,
  title: 10,
  linkedin_url: 20,
  recent_activity: 15,
  company_info: 10,
  personal_interests: 10
};

const MINIMUM_SCORE_THRESHOLD = 45;

function isLeadQualified(lead) {
  const hasRequired = REQUIRED_FIELDS.every((field) => Boolean(lead[field]));
  const enrichmentCount = [
    Boolean(lead.linkedin_url),
    Boolean(lead.website_url),
    Boolean(lead.company_info),
    Boolean(lead.social_profiles)
  ].filter(Boolean).length;
  return hasRequired && enrichmentCount >= MINIMUM_ENRICHMENT_FIELDS;
}

function calculateLeadScore(lead) {
  let score = 0;
  for (const [field, weight] of Object.entries(FIELD_WEIGHTS)) {
    if (lead[field]) {
      score += weight;
    }
  }
  return Math.min(score, 100);
}

module.exports = {
  isLeadQualified,
  calculateLeadScore,
  MINIMUM_SCORE_THRESHOLD
};
