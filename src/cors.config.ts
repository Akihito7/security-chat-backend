const frontendUrl = process.env.FRONTEND_URL ?? 'http://localhost:5173';

export const allowedOrigins = [frontendUrl.trim().replace(/\/+$/, '')];
