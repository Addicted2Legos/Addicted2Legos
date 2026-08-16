// DualAscent: LinkedIn OAuth token exchange
//
// The LinkedIn "authorization code -> access token" exchange requires a
// client secret, which can never live in browser JS (app.js is public).
// This Edge Function is the only place that secret is used. It:
//   1. Takes the one-time `code` the browser got back from LinkedIn
//   2. Exchanges it for a LinkedIn access token (server-side, secret attached)
//   3. Calls LinkedIn's OpenID Connect userinfo endpoint with that token
//   4. Returns just { sub, name, email, picture } to the browser
//
// That's the full response LinkedIn's standard "Sign In with LinkedIn using
// OpenID Connect" product gives us — no job title, employer, or connections.
// This function does not touch the database; app.js saves the returned
// identity into member_profiles itself, through the same RLS-protected
// client it already uses everywhere else, so this function never needs
// elevated database access.
//
// Deploy (Supabase CLI, from the DualAscent/Supabase directory):
//   supabase functions deploy linkedin-oauth-exchange
//   supabase secrets set LINKEDIN_CLIENT_ID=your-client-id LINKEDIN_CLIENT_SECRET=your-client-secret
//
// LINKEDIN_CLIENT_ID here must match the LINKEDIN_CLIENT_ID constant set in
// app.js (that one's public, same as the Clerk/Supabase publishable keys).

const LINKEDIN_CLIENT_ID = Deno.env.get('LINKEDIN_CLIENT_ID') ?? '';
const LINKEDIN_CLIENT_SECRET = Deno.env.get('LINKEDIN_CLIENT_SECRET') ?? '';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  // Not a security boundary on its own (this function never touches the
  // database), but requiring a signed-in caller keeps it from being an
  // open, unauthenticated proxy for LinkedIn token exchanges.
  if (!req.headers.get('authorization')) {
    return new Response(JSON.stringify({ error: 'Missing authorization' }), {
      status: 401,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  if (!LINKEDIN_CLIENT_ID || !LINKEDIN_CLIENT_SECRET) {
    return new Response(JSON.stringify({ error: 'LinkedIn is not configured on this project yet.' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  let body: { code?: string; redirect_uri?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'Invalid request body' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { code, redirect_uri } = body;
  if (!code || !redirect_uri) {
    return new Response(JSON.stringify({ error: 'Missing code or redirect_uri' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const tokenRes = await fetch('https://www.linkedin.com/oauth/v2/accessToken', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'authorization_code',
      code,
      redirect_uri,
      client_id: LINKEDIN_CLIENT_ID,
      client_secret: LINKEDIN_CLIENT_SECRET,
    }),
  });

  if (!tokenRes.ok) {
    const detail = await tokenRes.text();
    console.error('LinkedIn token exchange failed:', detail);
    return new Response(JSON.stringify({ error: 'LinkedIn rejected the connection request.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { access_token } = await tokenRes.json();

  const profileRes = await fetch('https://api.linkedin.com/v2/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` },
  });

  if (!profileRes.ok) {
    const detail = await profileRes.text();
    console.error('LinkedIn userinfo fetch failed:', detail);
    return new Response(JSON.stringify({ error: 'Could not read your LinkedIn profile.' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const profile = await profileRes.json();

  return new Response(JSON.stringify({
    sub: profile.sub ?? null,
    name: profile.name ?? null,
    email: profile.email ?? null,
    picture: profile.picture ?? null,
  }), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
});
