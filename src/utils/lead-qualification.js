const REQUIRED_FIELDS = ['name', 'email'];
const MINIMUM_ENRICHMENT_FIELDS = 2;

function isLeadQualified(lead) {
  const hasRequired = REQUIRED_FIELDS.every(field => !!lead[field]);
  const enrichmentCount = [
    'linkedin_url',
    'website_url',
    'company_info',
    'social_profiles'
  ].reduce((count, field) => count + (lead[field] ? 1 : 0), 0);

  return hasRequired && enrichmentCount >= MINIMUM_ENRICHMENT_FIELDS;
}

module.exports = { isLeadQualified };
