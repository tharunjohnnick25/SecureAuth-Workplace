const { Client } = require('pg');
const dotenv = require('dotenv');
const { resolve } = require('path');

dotenv.config({ path: resolve(process.cwd(), '.env.local') });

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:postgres@127.0.0.1:54322/postgres';
const client = new Client({ connectionString });

async function createTable() {
    try {
        await client.connect();
        await client.query(`
            CREATE TABLE IF NOT EXISTS public.quorum_requests (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                requester_id UUID REFERENCES public.users(id),
                action_type TEXT,
                status TEXT DEFAULT 'PENDING',
                approver_id UUID REFERENCES public.users(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        `);
        console.log('Table created successfully');
    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

createTable();
