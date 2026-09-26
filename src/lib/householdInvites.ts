import { createHash, randomBytes } from 'crypto';

export const INVITE_TTL_DAYS = 7;

export const normalizeEmail = (email: string) => email.trim().toLowerCase();

export const hashInviteCode = (code: string) =>
  createHash('sha256').update(code.trim().toUpperCase()).digest('hex');

export const createInviteCode = () =>
  randomBytes(9).toString('base64url').toUpperCase();

export const inviteExpiry = () =>
  new Date(Date.now() + INVITE_TTL_DAYS * 24 * 60 * 60 * 1000);
