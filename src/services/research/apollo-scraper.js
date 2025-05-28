const fetch = require('node-fetch');
const logger = require('../../utils/logger');

// Allow overriding the Apify actor ID via environment variable.
const DEFAULT_ACTOR_ID = 'code_crafter~apollo-io-scraper';

class ApolloScraperService {
    /**
     * Create a new ApolloScraperService.
     *
     * @param {Object} [options]
     * @param {string} [options.actorId] - Optional custom Apify actor ID.
     */
    constructor(options = {}) {
        this.apiToken = process.env.APIFY_API_TOKEN;
        // Allow providing actor ID via options or environment variable
        this.actorId = options.actorId || process.env.APIFY_ACTOR_ID || DEFAULT_ACTOR_ID;
        this.baseApolloURL = 'https://app.apollo.io/#/people';
    }

    buildApolloURL(criteria) {
        const queryParts = [];
        queryParts.push('sortByField=recommendations_score');
        queryParts.push('sortAscending=false');
        queryParts.push('page=1');

        const addArrayParams = (param, values) => {
            if (!values || !Array.isArray(values)) return;
            values.forEach(val => {
                const decoded = val.replace(/\+/g, ' ');
                queryParts.push(`${param}[]=${encodeURIComponent(decoded)}`);
            });
        };

        if (criteria.job_title) {
            const titles = Array.isArray(criteria.job_title) ? criteria.job_title : [criteria.job_title];
            addArrayParams('personTitles', titles);
        }

        if (criteria.location) {
            const locations = Array.isArray(criteria.location) ? criteria.location : [criteria.location];
            addArrayParams('personLocations', locations);
        }

        if (criteria.business) {
            const businesses = Array.isArray(criteria.business) ? criteria.business : [criteria.business];
            addArrayParams('qOrganizationKeywordTags', businesses);
        }

        queryParts.push('includedOrganizationKeywordFields[]=tags');
        queryParts.push('includedOrganizationKeywordFields[]=name');

        const queryString = queryParts.join('&');
        return `${this.baseApolloURL}?${queryString}`;
    }

    async searchLeads(criteria, options = {}) {
        const asyncMode = options.async === true;
        const pollInterval = options.pollInterval !== undefined
            ? options.pollInterval
            : (process.env.NODE_ENV === 'test' ? 0 : 5); // seconds
        const timeout = options.timeout || 180;
        const apolloURL = this.buildApolloURL(criteria);
        logger.info(`Launching Apollo scraper. async=${asyncMode}`);
        const requestBody = {
            getPersonalEmails: true,
            getWorkEmails: true,
            totalRecords: criteria.totalRecords || 500,
            url: apolloURL
        };

        // Include optional file name parameter if provided
        if (criteria.fileName || criteria.file_name) {
            requestBody.fileName = criteria.fileName || criteria.file_name;
        }

        let rawResults;

        const startRun = async () => {
            const startRes = await fetch(
                `https://api.apify.com/v2/acts/${this.actorId}/runs?token=${this.apiToken}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                }
            );

            if (!startRes.ok) {
                logger.error(`Actor start failed with status ${startRes.status}`);
                throw new Error(`Apollo scraper failed: ${startRes.statusText}`);
            }

            const startData = await startRes.json();
            return startData.data?.id || startData.id;
        };

        if (asyncMode) {
            logger.info('Starting asynchronous Apify actor run');
            const runId = await startRun();
            logger.info(`Run started with ID ${runId}`);
            const endTime = Date.now() + timeout * 1000;
            let runData;
            while (Date.now() < endTime) {
                await this.wait(pollInterval);
                const runRes = await fetch(
                    `https://api.apify.com/v2/actor-runs/${runId}?token=${this.apiToken}`
                );
                if (!runRes.ok) {
                    logger.error(`Run status check failed with ${runRes.status}`);
                    throw new Error(`Apollo run check failed: ${runRes.statusText}`);
                }
                runData = await runRes.json();
                const status = runData.data?.status || runData.status;
                if (status === 'SUCCEEDED') break;
                if (status === 'FAILED') {
                    logger.error('Apollo scraper run failed');
                    throw new Error('Apollo scraper run failed');
                }
            }

            const finalStatus = runData.data?.status || runData.status;
            if (finalStatus !== 'SUCCEEDED') {
                logger.error('Apollo scraper run timed out');
                throw new Error('Apollo scraper run timed out');
            }
            const datasetId = runData.data?.defaultDatasetId || runData.defaultDatasetId;
            logger.info(`Fetching dataset ${datasetId}`);
            const datasetRes = await fetch(
                `https://api.apify.com/v2/datasets/${datasetId}/items?token=${this.apiToken}`
            );
            if (!datasetRes.ok) {
                logger.error(`Dataset fetch failed with ${datasetRes.status}`);
                throw new Error(`Apollo dataset fetch failed: ${datasetRes.statusText}`);
            }
            rawResults = await datasetRes.json();
        } else {
            logger.info('Running Apify actor and waiting for results');
            const runId = await startRun();
            const endTime = Date.now() + timeout * 1000;
            let runData;
            while (Date.now() < endTime) {
                await this.wait(pollInterval);
                const runRes = await fetch(
                    `https://api.apify.com/v2/actor-runs/${runId}?token=${this.apiToken}`
                );
                if (!runRes.ok) {
                    logger.error(`Run status check failed with ${runRes.status}`);
                    throw new Error(`Apollo run check failed: ${runRes.statusText}`);
                }
                runData = await runRes.json();
                const status = runData.data?.status || runData.status;
                if (status === 'SUCCEEDED') break;
                if (status === 'FAILED') {
                    logger.error('Apollo scraper run failed');
                    throw new Error('Apollo scraper run failed');
                }
            }

            const finalStatus = runData.data?.status || runData.status;
            if (finalStatus !== 'SUCCEEDED') {
                logger.error('Apollo scraper run timed out');
                throw new Error('Apollo scraper run timed out');
            }
            const datasetId = runData.data?.defaultDatasetId || runData.defaultDatasetId;
            logger.info(`Fetching dataset ${datasetId}`);
            const datasetRes = await fetch(
                `https://api.apify.com/v2/datasets/${datasetId}/items?token=${this.apiToken}`
            );
            if (!datasetRes.ok) {
                logger.error(`Dataset fetch failed with ${datasetRes.status}`);
                throw new Error(`Apollo dataset fetch failed: ${datasetRes.statusText}`);
            }
            rawResults = await datasetRes.json();
        }

        const processed = this.extractInfo(rawResults);
        logger.info(`Fetched ${processed.length} leads`);
        return processed.filter(l => l.emailStatus === 'verified');
    }

    extractInfo(rawResults) {
        return rawResults.map(result => ({
            firstName: result.first_name,
            lastName: result.last_name,
            emailAddress: result.email,
            emailStatus: result.email_status,
            linkedInURL: result.linkedin_url,
            phoneNumber: result.organization?.primary_phone?.sanitized_number || null,
            location: result.city && result.state ? `${result.city}, ${result.state}` : '',
            country: result.country,
            jobTitle: result.employment_history?.[0]?.title || '',
            companyName: result.employment_history?.[0]?.organization_name || '',
            seniority: result.seniority,
            websiteURL: result.organization_website_url,
            businessIndustry: result.organization?.industry || '',
            name: `${result.first_name} ${result.last_name}`.trim(),
            _raw: result
        }));
    }

    formatForDatabase(leads) {
        return leads.map(lead => ({
            name: lead.name,
            email: lead.emailAddress,
            company: lead.companyName,
            title: lead.jobTitle,
            linkedin_url: lead.linkedInURL,
            website_url: lead.websiteURL,
            phone: lead.phoneNumber,
            location: lead.location,
            country: lead.country,
            status: 'new',
            source: 'apollo_search',
            score: this.calculateLeadScore(lead),
            apollo_data: {
                seniority: lead.seniority,
                industry: lead.businessIndustry,
                email_verified: true,
                scraped_at: new Date().toISOString()
            }
        }));
    }

    calculateLeadScore(lead) {
        let score = 0;
        if (lead.emailAddress) score += 25;
        if (lead.linkedInURL) score += 20;
        if (lead.phoneNumber) score += 15;
        if (lead.jobTitle) score += 15;
        if (lead.companyName) score += 15;
        if (lead.websiteURL) score += 10;
        return Math.min(score, 100);
    }

    async wait(seconds = 45) {
        await new Promise(resolve => setTimeout(resolve, seconds * 1000));
    }
}

module.exports = ApolloScraperService;
