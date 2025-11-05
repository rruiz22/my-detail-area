import { formatDistanceToNow } from 'date-fns';
import { es, enUS, ptBR } from 'date-fns/locale';
import type { VehicleActivity } from '@/hooks/useVehicleActivityLog';

/**
 * Get date-fns locale based on i18n language
 */
export function getDateLocale(language: string) {
  switch (language) {
    case 'es':
      return es;
    case 'pt-BR':
      return ptBR;
    default:
      return enUS;
  }
}

/**
 * Format relative timestamp (e.g., "2 hours ago", "yesterday")
 */
export function formatRelativeTime(date: string, language: string): string {
  try {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: getDateLocale(language),
    });
  } catch (error) {
    console.error('Error formatting relative time:', error);
    return date;
  }
}

/**
 * Group activities by date ranges (Today, Yesterday, This Week, Older)
 */
export interface GroupedActivities {
  label: string;
  date: string;
  activities: VehicleActivity[];
}

export function groupActivitiesByDate(
  activities: VehicleActivity[] | undefined,
  t: (key: string) => string
): GroupedActivities[] {
  if (!activities || activities.length === 0) {
    return [];
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 7);

  const groups: Record<string, VehicleActivity[]> = {
    today: [],
    yesterday: [],
    thisWeek: [],
    older: [],
  };

  activities.forEach((activity) => {
    const activityDate = new Date(activity.created_at);

    if (activityDate >= today) {
      groups.today.push(activity);
    } else if (activityDate >= yesterday && activityDate < today) {
      groups.yesterday.push(activity);
    } else if (activityDate >= weekAgo && activityDate < yesterday) {
      groups.thisWeek.push(activity);
    } else {
      groups.older.push(activity);
    }
  });

  const result: GroupedActivities[] = [];

  if (groups.today.length > 0) {
    result.push({
      label: t('get_ready.activity_log.date_groups.today'),
      date: 'today',
      activities: groups.today,
    });
  }

  if (groups.yesterday.length > 0) {
    result.push({
      label: t('get_ready.activity_log.date_groups.yesterday'),
      date: 'yesterday',
      activities: groups.yesterday,
    });
  }

  if (groups.thisWeek.length > 0) {
    result.push({
      label: t('get_ready.activity_log.date_groups.this_week'),
      date: 'thisWeek',
      activities: groups.thisWeek,
    });
  }

  if (groups.older.length > 0) {
    result.push({
      label: t('get_ready.activity_log.date_groups.older'),
      date: 'older',
      activities: groups.older,
    });
  }

  return result;
}

/**
 * Format user name from activity
 */
export function formatUserName(activity: VehicleActivity, t?: (key: string) => string): string {
  // Handle system actions (when action_by is NULL)
  if (!activity.profiles && !activity.action_by) {
    return t ? t('user.system') : 'System';
  }

  if (!activity.profiles) {
    return t ? t('user.system') : 'System';
  }

  const { first_name, last_name } = activity.profiles;

  if (first_name || last_name) {
    return `${first_name || ''} ${last_name || ''}`.trim();
  }

  return t ? t('user.team_member') : 'User';
}
