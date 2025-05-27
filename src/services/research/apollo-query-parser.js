class ApolloQueryParser {
    parseNaturalLanguage(query) {
        const criteria = { job_title: [], location: [], business: [], totalRecords: 500 };

        const titlePatterns = {
            'owners': ['owner'],
            'ceos': ['CEO', 'Chief Executive Officer'],
            'ctos': ['CTO', 'Chief Technology Officer'],
            'founders': ['founder', 'co-founder'],
            'vps': ['VP', 'Vice President'],
            'directors': ['director'],
            'managers': ['manager']
        };

        const locationPatterns = {
            'houston': 'Houston+united+states',
            'austin': 'Austin+texas',
            'dallas': 'Dallas+texas',
            'san francisco': 'San+Francisco+california',
            'new york': 'New+York+united+states',
            'los angeles': 'Los+Angeles+california'
        };

        const industryPatterns = {
            'real estate': 'Real+Estate+agency',
            'software': 'Software+company',
            'saas': 'SaaS+company',
            'healthcare': 'Healthcare+services',
            'finance': 'Financial+services',
            'marketing': 'Marketing+agency',
            'consulting': 'Consulting+firm'
        };

        const lowerQuery = query.toLowerCase();

        for (const [key, values] of Object.entries(titlePatterns)) {
            if (lowerQuery.includes(key)) {
                criteria.job_title.push(...values);
            }
        }

        for (const [key, value] of Object.entries(locationPatterns)) {
            if (lowerQuery.includes(key)) {
                criteria.location.push(value);
            }
        }

        for (const [key, value] of Object.entries(industryPatterns)) {
            if (lowerQuery.includes(key)) {
                criteria.business.push(value);
            }
        }

        const numberMatch = query.match(/(\d+)\s*(leads?|contacts?|people)/i);
        if (numberMatch) {
            criteria.totalRecords = Math.min(parseInt(numberMatch[1], 10), 1000);
        }

        return criteria;
    }

    formatLocation(city, state) {
        return `${city.replace(/\s+/g, '+')}+${state.replace(/\s+/g, '+')}`;
    }

    formatIndustry(industry) {
        return industry.replace(/\s+/g, '+');
    }
}

module.exports = ApolloQueryParser;
