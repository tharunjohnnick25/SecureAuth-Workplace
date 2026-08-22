const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmptyTables() {
    // We can query pg_tables to get all user tables in the 'public' schema
    const { data: tables, error: tableError } = await supabase
        .rpc('get_tables_info'); // If we have an RPC, otherwise we have to list manually
    
    // Instead of RPC which might not exist, we can use the REST API on pg_class or just hardcode known tables
    // Or we can query information_schema if enabled, but Supabase REST API doesn't expose information_schema directly.
    
    // Let's try selecting from all known tables if we know them, or we can use the postgres meta API.
    // The easiest way without direct PG access is just to list the typical tables we created.
    const knownTables = ['users', 'roles', 'audit_logs', 'sessions', 'user_devices', 'organizations', 'companies', 'biometric_data'];
    
    console.log("Checking tables for empty status...");
    const emptyTables = [];
    const populatedTables = [];
    const unknownTables = [];

    for (const table of knownTables) {
        const { count, error } = await supabase
            .from(table)
            .select('*', { count: 'exact', head: true });
            
        if (error) {
            if (error.code === 'PGRST205' || error.code === '42P01') {
                unknownTables.push(table);
            } else {
                console.error(`Error checking ${table}:`, error.message);
            }
        } else {
            if (count === 0) {
                emptyTables.push(table);
            } else {
                populatedTables.push(`${table} (${count} rows)`);
            }
        }
    }

    console.log("\n--- RESULTS ---");
    console.log("Populated Tables:");
    console.log(populatedTables.length ? populatedTables.join('\n') : "None");
    
    console.log("\nEmpty Tables:");
    console.log(emptyTables.length ? emptyTables.join('\n') : "None");

    console.log("\nTables that don't exist yet:");
    console.log(unknownTables.length ? unknownTables.join('\n') : "None");
}

checkEmptyTables();
