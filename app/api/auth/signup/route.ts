import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  const { email } = await req.json();
  return NextResponse.json({
    user: { id: crypto.randomUUID(), email: email || 'user@email.com', role: 'employee' },
    session: { access_token: 'mock-token', refresh_token: 'mock-refresh' }
  }, { status: 201 });
}

    const supabase = await createServerSupabaseClient();

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name || email.split('@')[0],
        }
      }
    });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    if (data.user) {
      const fullName = name || email.split('@')[0];
      await supabase.from('users').upsert({
        id: data.user.id,
        email,
        full_name: fullName,
        role: 'employee',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id', ignoreDuplicates: true });
    }

    return NextResponse.json({
      message: 'Registration successful! Please check your email for verification.',
      user: data.user
    });
  } catch (error) {
    console.error('Signup error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
