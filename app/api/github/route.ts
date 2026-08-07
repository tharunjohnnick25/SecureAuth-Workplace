import { NextResponse } from 'next/server';
import { MockDB } from '@/lib/mock-db';

export async function GET(request: Request) {
  try {
    // 1. Gather all unique github usernames from our employees
    const employeesWithGithub = MockDB.employees.filter((e: any) => e.github_username);
    const usernames = Array.from(new Set(employeesWithGithub.map((e: any) => e.github_username)));

    if (usernames.length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    // 2. Fetch public events for each user from GitHub API
    // (In production, use PAT to increase rate limit, here we use public endpoint)
    const fetchPromises = usernames.map(async (username) => {
      try {
        const res = await fetch(`https://api.github.com/users/${username}/events/public?per_page=5`, {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            // 'User-Agent': 'SecureAuth-Internal'
          },
          next: { revalidate: 60 } // Cache for 60 seconds
        });
        if (!res.ok) return [];
        const events = await res.json();
        
        // Map to our own standardized format
        return events.map((ev: any) => ({
          id: ev.id,
          type: ev.type,
          actor: ev.actor.login,
          avatar_url: ev.actor.avatar_url,
          repo: ev.repo.name,
          repo_url: `https://github.com/${ev.repo.name}`,
          created_at: ev.created_at,
          payload: ev.payload,
          // Find which employee this belongs to
          employee: employeesWithGithub.find((e: any) => e.github_username === ev.actor.login)?.full_name || username
        }));
      } catch (err) {
        console.error(`Error fetching GitHub events for ${username}:`, err);
        return [];
      }
    });

    const results = await Promise.all(fetchPromises);
    
    // Flatten and sort by date descending
    let allEvents = results.flat();
    allEvents.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Take top 20 recent events
    allEvents = allEvents.slice(0, 20);

    // If real API is rate-limited or users have no events, use mock data so UI is functional
    if (allEvents.length === 0) {
      const now = new Date();
      allEvents = [
        {
          id: 'mock-1',
          type: 'PushEvent',
          actor: 'octocat',
          avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4',
          repo: 'octocat/Hello-World',
          repo_url: 'https://github.com/octocat/Hello-World',
          created_at: new Date(now.getTime() - 1000 * 60 * 5).toISOString(),
          employee: 'John Doe',
          payload: {}
        },
        {
          id: 'mock-2',
          type: 'PullRequestEvent',
          actor: 'github',
          avatar_url: 'https://avatars.githubusercontent.com/u/9919?v=4',
          repo: 'github/docs',
          repo_url: 'https://github.com/github/docs',
          created_at: new Date(now.getTime() - 1000 * 60 * 45).toISOString(),
          employee: 'Alice Admin',
          payload: {}
        },
        {
          id: 'mock-3',
          type: 'IssuesEvent',
          actor: 'octocat',
          avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4',
          repo: 'octocat/Spoon-Knife',
          repo_url: 'https://github.com/octocat/Spoon-Knife',
          created_at: new Date(now.getTime() - 1000 * 60 * 60 * 2).toISOString(),
          employee: 'John Doe',
          payload: {}
        }
      ];
    }

    return NextResponse.json({ success: true, data: allEvents });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
