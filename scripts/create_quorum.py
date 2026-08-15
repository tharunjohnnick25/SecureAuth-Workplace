import os
import psycopg2
from dotenv import load_dotenv

load_dotenv('.env.local')

DATABASE_URL = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:54322/postgres")

def create_table():
    try:
        conn = psycopg2.connect(DATABASE_URL)
        cursor = conn.cursor()
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS public.quorum_requests (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                requester_id UUID REFERENCES public.users(id),
                action_type TEXT,
                status TEXT DEFAULT 'PENDING',
                approver_id UUID REFERENCES public.users(id),
                created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
            );
        """)
        conn.commit()
        print("Table created successfully")
        cursor.close()
        conn.close()
    except Exception as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    create_table()
