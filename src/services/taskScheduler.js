const cron = require('node-cron');
const parser = require('cron-parser');

class TaskScheduler {
    constructor(supabase, assistant, options = {}) {
        this.supabase = supabase;
        this.assistant = assistant;
        this.enabled =
            options.enable !== false &&
            process.env.NODE_ENV !== 'test' &&
            process.env.DISABLE_SCHEDULER !== 'true';
        this.scheduledTasks = new Map();
        if (this.enabled) {
            this.loadScheduledTasks();
        }
    }

    async loadScheduledTasks() {
        const { data: tasks, error } = await this.supabase
            .from('scheduled_tasks')
            .select('*')
            .eq('active', true);

        if (error) {
            console.error('Failed to load scheduled tasks', error);
            return;
        }

        (tasks || []).forEach(task => {
            this.scheduleTask(task);
        });
    }

    async createTask(taskData) {
        const schedule = await this.parseSchedule(taskData.schedule);
        const { data: task, error } = await this.supabase
            .from('scheduled_tasks')
            .insert({
                ...taskData,
                cron_expression: schedule,
                active: true,
                created_by: 'ai_assistant'
            })
            .select()
            .single();

        if (error) throw error;

        this.scheduleTask(task);
        return task;
    }

    async parseSchedule(scheduleInput) {
        const naturalLanguagePatterns = {
            'every morning': '0 9 * * *',
            'every evening': '0 18 * * *',
            'every monday': '0 9 * * 1',
            'twice a day': '0 9,17 * * *',
            'every hour': '0 * * * *',
            'every 30 minutes': '*/30 * * * *'
        };
        const lower = scheduleInput.toLowerCase();
        for (const [pattern, cronExp] of Object.entries(naturalLanguagePatterns)) {
            if (lower.includes(pattern)) {
                return cronExp;
            }
        }
        try {
            parser.parseExpression(scheduleInput);
            return scheduleInput;
        } catch (error) {
            return await this.assistant.interpretScheduleWithAI(scheduleInput);
        }
    }

    scheduleTask(task) {
        if (!this.enabled) {
            // Still track the task but do not start the cron job
            this.scheduledTasks.set(task.id, { stop: () => {} });
            return;
        }
        if (this.scheduledTasks.has(task.id)) {
            this.scheduledTasks.get(task.id).stop();
        }
        const job = cron.schedule(task.cron_expression, async () => {
            await this.executeTask(task);
        });
        this.scheduledTasks.set(task.id, job);
    }

    async executeTask(task) {
        console.log(`Executing scheduled task: ${task.description}`);
        try {
            switch (task.task_type) {
                case 'campaign_check':
                    await this.assistant.checkCampaignPerformance();
                    break;
                case 'lead_research':
                    await this.assistant.researchNewLeads();
                    break;
                case 'send_report':
                    await this.assistant.generateAndSendReport(task.parameters);
                    break;
                case 'custom':
                    await this.assistant.executeCustomTask(task.parameters);
                    break;
            }
            await this.supabase
                .from('task_executions')
                .insert({
                    task_id: task.id,
                    status: 'completed',
                    executed_at: new Date()
                });
        } catch (error) {
            console.error(`Task execution failed: ${error.message}`);
            await this.supabase
                .from('task_executions')
                .insert({
                    task_id: task.id,
                    status: 'failed',
                    error: error.message,
                    executed_at: new Date()
                });
        }
    }

    stopAll() {
        for (const job of this.scheduledTasks.values()) {
            if (job && typeof job.stop === 'function') {
                job.stop();
            }
        }
        this.scheduledTasks.clear();
    }
}

module.exports = { TaskScheduler };
