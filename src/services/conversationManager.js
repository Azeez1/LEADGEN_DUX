class ConversationManager {
    constructor(assistant) {
        this.assistant = assistant;
        this.threads = new Map(); // userId -> threadId
    }

    async getOrCreateThread(userId) {
        if (this.threads.has(userId)) {
            return this.threads.get(userId);
        }

        const thread = await this.assistant.openai.beta.threads.create({
            metadata: {
                user_id: userId,
                created_at: new Date().toISOString()
            }
        });

        this.threads.set(userId, thread.id);
        await this.saveThreadMapping(userId, thread.id);
        return thread.id;
    }

    async sendMessage(userId, message) {
        const threadId = await this.getOrCreateThread(userId);
        await this.assistant.openai.beta.threads.messages.create(threadId, {
            role: "user",
            content: message
        });
        const run = await this.assistant.openai.beta.threads.runs.create(threadId, {
            assistant_id: this.assistant.assistant.id
        });
        return await this.waitForCompletion(threadId, run.id);
    }

    async waitForCompletion(threadId, runId) {
        while (true) {
            const run = await this.assistant.openai.beta.threads.runs.retrieve(
                threadId,
                runId
            );

            if (run.status === 'completed') {
                return await this.getLatestMessage(threadId);
            }

            if (run.status === 'requires_action') {
                await this.handleToolCalls(threadId, runId, run);
            }

            if (run.status === 'failed' || run.status === 'cancelled') {
                throw new Error(`Run ${run.status}: ${run.last_error?.message}`);
            }

            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    async handleToolCalls(threadId, runId, run) {
        const toolOutputs = [];
        for (const toolCall of run.required_action.submit_tool_outputs.tool_calls) {
            try {
                const result = await this.assistant.handleToolCall(toolCall);
                toolOutputs.push({
                    tool_call_id: toolCall.id,
                    output: JSON.stringify(result)
                });
            } catch (error) {
                toolOutputs.push({
                    tool_call_id: toolCall.id,
                    output: JSON.stringify({ error: error.message })
                });
            }
        }
        await this.assistant.openai.beta.threads.runs.submitToolOutputs(
            threadId,
            runId,
            { tool_outputs: toolOutputs }
        );
    }

    async getLatestMessage(threadId) {
        const messages = await this.assistant.openai.beta.threads.messages.list(
            threadId,
            { limit: 1 }
        );
        return messages.data[0];
    }

    async saveThreadMapping(userId, threadId) {
        // Placeholder for persistence logic
        return this.assistant.supabase
            .from('conversation_threads')
            .upsert({ user_id: userId, thread_id: threadId });
    }
}

module.exports = { ConversationManager };
