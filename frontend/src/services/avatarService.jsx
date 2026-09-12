import React from 'react';
import { User } from 'lucide-react';

/**
 * EcoLeak Standard User Account Profile Picture
 * Renders a clean, unified User icon for every account.
 */

export const DEFAULT_AVATAR = {
  id: 'pfp-user-default',
  name: 'Plant Operator',
  role: 'Plant Manager',
  theme: 'emerald',
};

export const RELATED_AVATARS = [DEFAULT_AVATAR];

/**
 * Return default user avatar profile metadata
 */
export function getAssignedAvatar() {
  return DEFAULT_AVATAR;
}

/**
 * Assigns the user avatar metadata and strips any external personal photos
 */
export function assignAvatarToUser(user) {
  if (!user) return user;
  return {
    ...user,
    avatarId: DEFAULT_AVATAR.id,
    picture: null,
    avatarName: DEFAULT_AVATAR.name,
    avatarTheme: DEFAULT_AVATAR.theme,
  };
}

/**
 * Clean, modern User Icon Component used for all accounts
 */
export function UserPfp({ user, size = 36, showRing = true, className = '' }) {
  const iconSize = Math.max(14, Math.round(size * 0.52));
  return (
    <div
      className={`user-thematic-pfp ${className}`}
      style={{
        width: size,
        height: size,
        borderRadius: Math.round(size * 0.28),
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, #072a1e 0%, #008f53 100%)',
        color: '#ffffff',
        border: '1.5px solid rgba(0, 184, 107, 0.4)',
        boxShadow: showRing ? '0 2px 8px rgba(0, 184, 107, 0.2)' : 'none',
        flexShrink: 0,
        overflow: 'hidden',
      }}
      title={user?.name || 'Operator Account'}
    >
      <User size={iconSize} strokeWidth={2.2} />
    </div>
  );
}
