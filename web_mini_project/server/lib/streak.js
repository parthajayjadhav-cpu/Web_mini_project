/**
 * Streak rules (per Doc 1 + Doc 2):
 *   - When member X completes a task and was the last one to complete a
 *     task, increment their streak. If their resulting streak is >= 2 they
 *     earn a 1.5x bonus on this task's points (rounded down).
 *   - When a different member completes a task, X's streak resets to 0 and
 *     the new member's streak becomes 1 with no bonus.
 *
 * Returns the awarded points and whether a streak bonus fired.
 */
export function applyStreakOnComplete({ workspace, member, basePoints }) {
  const isContinuation = workspace.lastCompletedBy === member.name
  if (isContinuation) {
    member.streak = (member.streak || 0) + 1
  } else {
    // Reset everyone else's streak; this member starts at 1.
    for (const m of workspace.members) {
      if (m.name !== member.name) m.streak = 0
    }
    member.streak = 1
  }

  const bonusActive = member.streak >= 2
  const awarded = bonusActive ? Math.floor(basePoints * 1.5) : basePoints

  member.longestStreak = Math.max(member.longestStreak || 0, member.streak)
  workspace.lastCompletedBy = member.name

  return { awarded, bonus: bonusActive, streak: member.streak }
}

/**
 * When a "done" task gets moved back to todo/inprogress, reverse the points
 * award (best-effort) but DON'T retroactively rewrite streaks — the docs
 * don't specify, and undoing streaks would create weird race conditions.
 */
export function reversePoints({ member, awarded }) {
  member.points = Math.max(0, (member.points || 0) - awarded)
  member.tasksCompleted = Math.max(0, (member.tasksCompleted || 0) - 1)
}
