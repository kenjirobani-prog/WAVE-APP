import type { UserProfile } from '@/types'

const STORAGE_KEY = 'wave_app_user_profile'

export const DEFAULT_PROFILE: UserProfile = {
  level: 'intermediate',
  boardType: 'funboard',
  preferredSize: 'waist-chest',
  favoriteSpots: [],
  onboardingDone: true,
}

export function getUserProfile(): UserProfile {
  if (typeof window === 'undefined') return DEFAULT_PROFILE
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_PROFILE
    return { ...DEFAULT_PROFILE, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_PROFILE
  }
}

export function saveUserProfile(profile: UserProfile): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
}

export function updateUserProfile(partial: Partial<UserProfile>): UserProfile {
  const current = getUserProfile()
  const updated = { ...current, ...partial }
  saveUserProfile(updated)
  return updated
}

export function clearUserProfile(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEY)
}
