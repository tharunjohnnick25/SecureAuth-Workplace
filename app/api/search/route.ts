import { NextResponse } from 'next/server';

// Simulated Google Search Results for demonstration purposes
const MOCK_WEB_PAGES = [
  {
    title: 'Google Cloud Platform - Official Site',
    url: 'https://cloud.google.com/',
    snippet: 'Google Cloud Platform lets you build, deploy, and scale applications, websites, and services on the same infrastructure as Google.',
    displayUrl: 'https://cloud.google.com'
  },
  {
    title: 'Google Workspace: Business Apps & Collaboration Tools',
    url: 'https://workspace.google.com/',
    snippet: 'Google Workspace includes apps you know and love, like Gmail, Calendar, Drive, Docs, Meet, and more, in one integrated workspace.',
    displayUrl: 'https://workspace.google.com'
  },
  {
    title: 'Google Admin Console',
    url: 'https://admin.google.com/',
    snippet: 'Manage Google Workspace for your organization. Add users, manage devices, and configure security and settings.',
    displayUrl: 'https://admin.google.com'
  },
  {
    title: 'React – A JavaScript library for building user interfaces',
    url: 'https://reactjs.org/',
    snippet: 'A JavaScript library for building user interfaces. Declarative, Component-Based, and Learn Once, Write Anywhere.',
    displayUrl: 'https://reactjs.org'
  },
  {
    title: 'Next.js by Vercel - The React Framework',
    url: 'https://nextjs.org/',
    snippet: 'Next.js gives you the best developer experience with all the features you need for production: hybrid static & server rendering, smart bundling, route pre-fetching, and more.',
    displayUrl: 'https://nextjs.org'
  },
  {
    title: 'GitHub: Let’s build from here',
    url: 'https://github.com/',
    snippet: 'GitHub is where over 100 million developers shape the future of software, together. Contribute to the open source community, manage your Git repositories...',
    displayUrl: 'https://github.com'
  },
  {
    title: 'Vercel: Develop. Preview. Ship.',
    url: 'https://vercel.com/',
    snippet: 'Vercel is the platform for frontend developers, providing the speed and reliability innovators need to create at the moment of inspiration.',
    displayUrl: 'https://vercel.com'
  },
  {
    title: 'Stripe: Financial Infrastructure for the Internet',
    url: 'https://stripe.com/',
    snippet: 'Stripe is a suite of payment APIs that powers commerce for online businesses of all sizes, including fraud prevention, and subscription management.',
    displayUrl: 'https://stripe.com'
  },
  {
    title: 'MDN Web Docs',
    url: 'https://developer.mozilla.org/',
    snippet: 'The MDN Web Docs site provides information about Open Web technologies including HTML, CSS, and APIs for both Web sites and progressive web apps.',
    displayUrl: 'https://developer.mozilla.org'
  },
  {
    title: 'Tailwind CSS - Rapidly build modern websites without ever leaving your HTML.',
    url: 'https://tailwindcss.com/',
    snippet: 'A utility-first CSS framework packed with classes like flex, pt-4, text-center and rotate-90 that can be composed to build any design, directly in your markup.',
    displayUrl: 'https://tailwindcss.com'
  }
];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q')?.toLowerCase();

  if (!query) {
    return NextResponse.json({ success: true, data: [] });
  }

  // Simulate network delay to make it feel like a real Google search
  await new Promise(resolve => setTimeout(resolve, 600 + Math.random() * 800));

  const results = MOCK_WEB_PAGES.filter(page => 
    page.title.toLowerCase().includes(query) || 
    page.snippet.toLowerCase().includes(query) ||
    page.url.toLowerCase().includes(query)
  );

  return NextResponse.json({ 
    success: true, 
    data: results,
    metadata: {
      total_results: results.length,
      search_time: '0.42 seconds'
    }
  });
}
