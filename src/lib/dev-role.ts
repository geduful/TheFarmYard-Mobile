/**
 * M0 scaffolding only.
 *
 * The tab bar is role-dependent, and toggling triggers after mount remounts
 * the navigator and resets navigation state. So the real implementation must
 * resolve the role *before* rendering tabs. M1 replaces this with the
 * `profiles.role` query behind a loading gate; until then, flip this constant
 * to exercise both layouts.
 */

export type Role = 'farmer' | 'buyer';

export const DEV_ROLE: Role = 'buyer';

export function useDevRole(): Role {
  return DEV_ROLE;
}
