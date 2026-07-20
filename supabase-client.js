// ============================================================
// SURAKKHA Backend — Supabase client & auth helpers
// Loaded on every page alongside site-shared.js.
//
// SETUP: fill in your project's URL and anon key below. Find both
// in your Supabase project: Settings → API.
// The anon key is safe to expose in client-side code — it only
// grants what your Row Level Security policies allow.
// ============================================================
const SUPABASE_URL = 'https://fyeahfvbctiiobekssav.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ5ZWFoZnZiY3RpaW9iZWtzc2F2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ0NDI1OTEsImV4cCI6MjEwMDAxODU5MX0.V8-nVHHjSlcGLG_45XdhhVSaNiraC1U3siDaZRb_FaE';

let _sb = null;
function sb(){
  if(_sb) return _sb;
  if(typeof supabase === 'undefined'){
    console.error('Supabase library not loaded — check the <script> tag on this page.');
    return null;
  }
  if(SUPABASE_URL.startsWith('YOUR_') || SUPABASE_ANON_KEY.startsWith('YOUR_')){
    console.warn('Supabase is not configured yet — set SUPABASE_URL and SUPABASE_ANON_KEY in supabase-client.js');
    return null;
  }
  _sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  return _sb;
}

// ---------------------------------------------------------------
// Session cache — avoids re-fetching the profile on every check.
// ---------------------------------------------------------------
let _cachedSession = undefined; // undefined = not yet checked, null = checked & logged out

async function getCurrentUser(){
  if(_cachedSession !== undefined) return _cachedSession;
  const client = sb();
  if(!client) return (_cachedSession = null);

  const { data: { session } } = await client.auth.getSession();
  if(!session){ return (_cachedSession = null); }

  const { data: profile, error } = await client
    .from('profiles')
    .select('*')
    .eq('id', session.user.id)
    .single();

  if(error || !profile){ return (_cachedSession = null); }

  _cachedSession = { authUser: session.user, profile };
  return _cachedSession;
}

function clearUserCache(){ _cachedSession = undefined; }

async function isApprovedUser(){
  const u = await getCurrentUser();
  return !!(u && u.profile.status === 'approved');
}

async function isAdmin(){
  const u = await getCurrentUser();
  return !!(u && u.profile.status === 'approved' && u.profile.role === 'admin');
}

// ---------------------------------------------------------------
// Registration — creates a real Supabase Auth account, plus a
// pending profile row an admin must approve before it grants access.
// ---------------------------------------------------------------
async function registerAccount({ email, password, full_name, designation, organization, phone, whatsapp }){
  const client = sb();
  if(!client) throw new Error('Backend is not configured yet.');

  const { data: signUpData, error: signUpError } = await client.auth.signUp({ email, password });
  if(signUpError) throw signUpError;
  if(!signUpData.user) throw new Error('Sign-up did not return a user — check if email confirmation is required in your Supabase Auth settings.');

  // If "Confirm email" is turned on in Supabase, signUp() succeeds but
  // there's no active session yet — the profile insert below would be
  // rejected by the database's security rules with a confusing, empty
  // error. Catch that specific case here with a clear message instead.
  const { data: { session } } = await client.auth.getSession();
  if(!session){
    throw new Error('Your account was created, but needs to be confirmed by email first — check your inbox for a confirmation link, then register again to finish setting up your profile. (If you keep seeing this, ask whoever manages the backend to turn off "Confirm email" in Supabase Auth settings.)');
  }

  const { error: profileError } = await client.from('profiles').insert({
    id: signUpData.user.id,
    full_name, designation, organization, phone, whatsapp, email,
  });
  if(profileError) throw profileError;

  return signUpData;
}

// ---------------------------------------------------------------
// Login / logout
// ---------------------------------------------------------------
async function loginAccount(email, password){
  const client = sb();
  if(!client) throw new Error('Backend is not configured yet.');
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if(error) throw error;
  clearUserCache();
  return data;
}

async function logoutAccount(){
  const client = sb();
  if(client) await client.auth.signOut();
  clearUserCache();
}

// ---------------------------------------------------------------
// Password reset — sends a reset link by email, then reset-password.html
// handles the second half (setting the new password).
// ---------------------------------------------------------------
async function requestPasswordReset(email){
  const client = sb();
  if(!client) throw new Error('Backend is not configured yet.');
  const redirectTo = window.location.origin + window.location.pathname.replace(/[^/]*$/, '') + 'reset-password.html';
  const { error } = await client.auth.resetPasswordForEmail(email, { redirectTo });
  if(error) throw error;
}

async function updatePassword(newPassword){
  const client = sb();
  if(!client) throw new Error('Backend is not configured yet.');
  const { error } = await client.auth.updateUser({ password: newPassword });
  if(error) throw error;
}
