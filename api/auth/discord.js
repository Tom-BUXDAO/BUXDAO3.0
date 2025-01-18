import express from 'express';
import crypto from 'crypto';

const router = express.Router();

const FRONTEND_URL = process.env.NODE_ENV === 'production' 
  ? 'https://buxdao.com'
  : 'http://localhost:5173';

const REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || (
  process.env.NODE_ENV === 'production'
    ? 'https://buxdao.com/api/auth/discord/callback'
    : 'http://localhost:3001/api/auth/discord/callback'
);

router.get('/', async (req, res) => {
  try {
    console.log('Discord auth request:', {
      sessionID: req.sessionID,
      hasSession: !!req.session,
      cookies: req.headers.cookie,
      secure: req.secure,
      protocol: req.protocol,
      'x-forwarded-proto': req.headers['x-forwarded-proto']
    });

    // Generate random state
    const state = crypto.randomBytes(32).toString('hex');
    
    // Initialize session
    if (!req.session) {
      req.session = {};
    }

    // Store state in session and cookies
    req.session.discord_state = state;
    res.cookie('discord_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax'
    });
    
    // Force session save before redirect
    await new Promise((resolve) => req.session.save(resolve));

    // Build Discord OAuth URL
    const params = new URLSearchParams({
      client_id: process.env.DISCORD_CLIENT_ID,
      redirect_uri: REDIRECT_URI,
      response_type: 'code',
      scope: 'identify guilds.join',
      state: state,
      prompt: 'consent'
    });

    res.redirect(`https://discord.com/api/oauth2/authorize?${params.toString()}`);
  } catch (error) {
    console.error('Discord auth error:', error);
    res.redirect(`${FRONTEND_URL}/verify?error=auth_failed`);
  }
});

export default router; 