import { LeadAssistant } from '../../../../../src/services/aiAssistant';
import { ConversationManager } from '../../../../../src/services/conversationManager';

const assistant = new LeadAssistant();
const conversationManager = new ConversationManager(assistant);
let initialized = false;

async function ensureInitialized() {
    if (!initialized) {
        await assistant.initialize();
        initialized = true;
    }
}

export async function POST(request) {
    await ensureInitialized();
    const { message } = await request.json();
    const userId = request.headers.get('x-user-id') || 'default';
    try {
        const response = await conversationManager.sendMessage(userId, message);
        return Response.json({
            message: response.content[0].text.value,
            actions: extractActions(response)
        });
    } catch (error) {
        console.error('Chat error:', error);
        return Response.json({ error: 'Failed to process message' }, { status: 500 });
    }
}

function extractActions(response) {
    const actions = [];
    if (response.content[0].text.value.includes('campaign')) {
        actions.push({ label: 'View Campaigns', action: 'navigate', target: '/campaigns' });
    }
    if (response.content[0].text.value.includes('lead')) {
        actions.push({ label: 'View Leads', action: 'navigate', target: '/leads' });
    }
    return actions;
}
