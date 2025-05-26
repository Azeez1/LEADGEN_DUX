function validateBasicInfo(lead) {
  return lead && lead.name && lead.email;
}

module.exports = { validateBasicInfo };
