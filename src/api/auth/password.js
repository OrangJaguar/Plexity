import { base44 } from '@/api/base44Client';

export async function requestPasswordReset(email) {
  return base44.auth.resetPasswordRequest(email.trim());
}

export async function completePasswordReset({ resetToken, newPassword }) {
  return base44.auth.resetPassword({ resetToken, newPassword });
}

export async function changePassword({ userId, currentPassword, newPassword }) {
  return base44.auth.changePassword({ userId, currentPassword, newPassword });
}
