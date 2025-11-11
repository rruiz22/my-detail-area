import { supabase } from '@/integrations/supabase/client';

/**
 * Extract @mentions from text
 * @param text - Text containing mentions like "@JohnDoe"
 * @returns Array of usernames (without @)
 */
export function extractMentions(text: string): string[] {
  const mentionRegex = /@(\w+)/g;
  const matches = text.match(mentionRegex);
  return matches ? matches.map(match => match.substring(1)) : [];
}

/**
 * Get user IDs from @FirstNameLastName mentions
 * Example: "@JohnDoe" → matches user with first_name="John" and last_name="Doe"
 *
 * @param mentions - Array of usernames like ["JohnDoe", "JaneSmith"]
 * @param dealerId - Dealer ID to filter team members
 * @returns Array of user IDs
 */
export async function resolveMentionsToUserIds(
  mentions: string[],
  dealerId: number
): Promise<string[]> {
  if (mentions.length === 0) return [];

  try {
    console.log(`🔍 Resolving ${mentions.length} mentions for dealer ${dealerId}:`, mentions);

    // Get all team members for this dealership
    const { data: memberships } = await supabase
      .from('dealer_memberships')
      .select(`
        user_id,
        profiles (
          id,
          first_name,
          last_name
        )
      `)
      .eq('dealer_id', dealerId)
      .eq('is_active', true);

    if (!memberships || memberships.length === 0) {
      console.warn('⚠️ No team members found for dealer:', dealerId);
      return [];
    }

    const userIds: string[] = [];

    // Match each mention to a user
    for (const mention of mentions) {
      // Try to split mention into first and last name
      // Example: "JohnDoe" → first="John", last="Doe"
      const match = mention.match(/^([A-Z][a-z]+)([A-Z][a-z]+)$/);

      if (!match) {
        console.warn(`⚠️ Invalid mention format: @${mention} (expected format: FirstNameLastName)`);
        continue;
      }

      const [, firstName, lastName] = match;

      // Find user with matching first and last name (case-insensitive)
      const member = memberships.find(m =>
        m.profiles &&
        m.profiles.first_name?.toLowerCase() === firstName.toLowerCase() &&
        m.profiles.last_name?.toLowerCase() === lastName.toLowerCase()
      );

      if (member?.profiles?.id) {
        userIds.push(member.profiles.id);
        console.log(`✅ Resolved @${mention} → User ID: ${member.profiles.id}`);
      } else {
        console.warn(`⚠️ Could not resolve @${mention} to a user`);
      }
    }

    console.log(`✅ Resolved ${userIds.length}/${mentions.length} mentions to user IDs`);
    return userIds;

  } catch (error) {
    console.error('❌ Error resolving mentions:', error);
    return [];
  }
}

/**
 * Create mention notifications for mentioned users
 * @param mentionedUserIds - Array of user IDs who were mentioned
 * @param params - Notification parameters
 */
export async function createMentionNotifications(
  mentionedUserIds: string[],
  params: {
    orderId: string;
    dealerId: number;
    module: 'sales_orders' | 'service_orders' | 'recon_orders' | 'car_wash';
    entityName: string;
    mentionerName: string;
    commentPreview: string;
  }
): Promise<void> {
  if (mentionedUserIds.length === 0) return;

  try {
    const { orderId, dealerId, module, entityName, mentionerName, commentPreview } = params;

    // Map module to entity type
    const entityTypeMap = {
      'sales_orders': 'sales_order',
      'service_orders': 'service_order',
      'recon_orders': 'recon_order',
      'car_wash': 'carwash_order'
    } as const;

    const entityType = entityTypeMap[module];

    // Create notification for each mentioned user
    const notifications = mentionedUserIds.map(userId => ({
      user_id: userId,
      dealer_id: dealerId,
      module: module,
      entity_type: entityType,
      entity_id: orderId,
      entity_name: entityName,
      action: 'mentioned_in_comment',
      title: `${mentionerName} mentioned you`,
      message: `${mentionerName} mentioned you in a comment: "${commentPreview}"`,
      action_url: `/${module.replace('_orders', '').replace('car_wash', 'carwash')}?order=${orderId}#comments`,
      priority: 'high', // Mentions are high priority
      is_read: false
    }));

    const { error } = await supabase
      .from('dealer_notifications')
      .insert(notifications);

    if (error) {
      console.error('❌ Failed to create mention notifications:', error);
    } else {
      console.log(`✅ Created ${notifications.length} mention notifications`);
    }

  } catch (error) {
    console.error('❌ Error creating mention notifications:', error);
  }
}
