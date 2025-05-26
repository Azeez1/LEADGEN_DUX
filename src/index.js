require('dotenv').config();
console.log('AI Lead Agent starting...');
console.log('Environment:', process.env.NODE_ENV);
console.log('Supabase URL:', process.env.SUPABASE_URL ? 'Connected' : 'Missing');
console.log('OpenAI Key:', process.env.OPENAI_API_KEY ? 'Set' : 'Missing');
