const STREAK_KEY_DEFAULT = "hvui-streak-dates";
const STREAK_KEY_PREFIX = "hvui-streak-dates-";

function getStreakKey(userId?: string) {
  return userId ? `${STREAK_KEY_PREFIX}${userId}` : STREAK_KEY_DEFAULT;
}

export function recordTodayActivity(userId?: string) {
  const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD
  const key = getStreakKey(userId);
  const raw = localStorage.getItem(key);
  const dates: string[] = raw ? JSON.parse(raw) : [];
  
  if (!dates.includes(today)) {
    dates.push(today);
    // Keep only last 100 days to prevent excessive storage
    const uniqueDates = Array.from(new Set(dates)).sort();
    localStorage.setItem(key, JSON.stringify(uniqueDates.slice(-100)));
  }
}

export function getStreakStats(userId?: string) {
  const key = getStreakKey(userId);
  const raw = localStorage.getItem(key);
  const dates: string[] = raw ? JSON.parse(raw) : [];
  const dateSet = new Set(dates);
  
  // 1. Calculate current consecutive streak
  let streak = 0;
  let checkDate = new Date();
  
  // Check today first
  let todayStr = checkDate.toISOString().split("T")[0];
  if (dateSet.has(todayStr)) {
    streak++;
    checkDate.setDate(checkDate.getDate() - 1);
  } else {
    // If not today, check yesterday. If yesterday has it, today's streak is still "active" for count
    // but the displayed checkmark for today will be empty until they do something.
    // However, usually streak only counts up to "yesterday" if today isn't done yet.
    // Let's check yesterday to see if the streak is still alive.
    checkDate.setDate(checkDate.getDate() - 1);
    const yesterdayStr = checkDate.toISOString().split("T")[0];
    if (!dateSet.has(yesterdayStr)) {
      streak = 0; // Streak broken
    }
    // and then we fall through to the loop to count backwards from yesterday
  }

  // Count backwards
  if (streak > 0 || dateSet.has(checkDate.toISOString().split("T")[0])) {
    while (true) {
      const s = checkDate.toISOString().split("T")[0];
      if (dateSet.has(s)) {
        if (streak === 0 || s !== todayStr) streak++; 
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // 2. Calculate weekly status (Monday to Sunday)
  const now = new Date();
  const currentDay = now.getDay(); // 0 (Sun) to 6 (Sat)
  // Distance to Monday: (day + 6) % 7
  const distToMonday = (currentDay + 6) % 7;
  const monday = new Date(now);
  monday.setDate(now.getDate() - distToMonday);
  
  const weekData = [];
  const dayLabels = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
  
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateStr = d.toISOString().split("T")[0];
    weekData.push({
      label: dayLabels[i],
      date: dateStr,
      active: dateSet.has(dateStr),
      isToday: dateStr === todayStr
    });
  }

  return { streak, weekData };
}
