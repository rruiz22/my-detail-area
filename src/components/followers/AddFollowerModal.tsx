import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Search,
  UserPlus,
  X,
  Bell,
  BellOff,
  Users
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { AvatarSystem } from '@/components/ui/avatar-system';

interface TeamMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  userType: string;
  avatarUrl?: string;
  isAlreadyFollowing: boolean;
}

interface AddFollowerModalProps {
  open: boolean;
  onClose: () => void;
  onAddFollower: (userId: string, notificationLevel: string) => Promise<void>;
  existingFollowerIds: string[];
  dealerId?: string;
}

export function AddFollowerModal({
  open,
  onClose,
  onAddFollower,
  existingFollowerIds,
  dealerId
}: AddFollowerModalProps) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [notificationLevel, setNotificationLevel] = useState<string>('important');
  const [adding, setAdding] = useState(false);

  // Fetch team members when modal opens
  useEffect(() => {
    if (open) {
      fetchTeamMembers();
    }
  }, [open, dealerId]);

  const fetchTeamMembers = async () => {
    if (!user) return;

    setLoading(true);
    try {
      console.log('👥 Fetching team members for dealership:', dealerId || user.dealershipId);

      const { data, error } = await supabase
        .from('dealer_memberships')
        .select(`
          user_id,
          is_active,
          profiles (
            id,
            first_name,
            last_name,
            email,
            user_type,
            avatar_seed,
            avatar_variant
          )
        `)
        .eq('dealer_id', dealerId || user.dealershipId || 5)
        .eq('is_active', true);

      if (error) {
        console.error('❌ Error fetching team members:', error);
        return;
      }

      // Transform and filter data
      const members: TeamMember[] = (data || [])
        .filter(member => member.profiles?.id) // Only members with valid profiles
        .map(member => ({
          id: member.profiles!.id,
          firstName: member.profiles!.first_name || '',
          lastName: member.profiles!.last_name || '',
          email: member.profiles!.email || '',
          userType: member.profiles!.user_type || 'regular',
          avatarUrl: member.profiles!.avatar_seed || undefined,
          isAlreadyFollowing: existingFollowerIds.includes(member.profiles!.id)
        }))
        .filter(member => member.id !== user.id); // Don't include current user

      console.log(`✅ Loaded ${members.length} team members`);
      setTeamMembers(members);

    } catch (error) {
      console.error('❌ Error fetching team members:', error);
    } finally {
      setLoading(false);
    }
  };

  // Filter team members based on search
  const filteredMembers = teamMembers.filter(member =>
    `${member.firstName} ${member.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Handle adding follower
  const handleAdd = async () => {
    if (!selectedUserId) return;

    setAdding(true);
    try {
      await onAddFollower(selectedUserId, notificationLevel);
      onClose();
      setSelectedUserId('');
      setNotificationLevel('important');
    } catch (error) {
      console.error('❌ Error adding follower:', error);
    } finally {
      setAdding(false);
    }
  };

  const getUserTypeBadgeColor = (userType: string) => {
    switch (userType) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'manager': return 'bg-purple-100 text-purple-800';
      case 'detail': return 'bg-blue-100 text-blue-800';
      case 'regular': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5" />
            {t('followers.add_follower_title', 'Add Team Member as Follower')}
          </DialogTitle>
          <DialogDescription>
            {t('followers.add_follower_description', 'Select a team member to follow this order and receive notifications about updates.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="space-y-2">
            <Label>{t('followers.search_team', 'Search Team Members')}</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('followers.search_placeholder', 'Search by name or email...')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Team Members List */}
          <div className="space-y-2 max-h-60 overflow-y-auto">
            {loading ? (
              <div className="text-center py-4">
                <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
                <p className="text-xs text-muted-foreground mt-2">{t('followers.loading_team', 'Loading team...')}</p>
              </div>
            ) : filteredMembers.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <Users className="h-6 w-6 mx-auto mb-2 opacity-50" />
                <p className="text-sm">{t('followers.no_team_members', 'No team members found')}</p>
              </div>
            ) : (
              filteredMembers.map((member) => (
                <div
                  key={member.id}
                  className={`flex items-center justify-between p-2 rounded-lg border cursor-pointer transition-colors ${
                    selectedUserId === member.id
                      ? 'border-primary bg-primary/5'
                      : member.isAlreadyFollowing
                      ? 'border-muted bg-muted/30 opacity-50'
                      : 'border-muted hover:border-muted-foreground hover:bg-muted/30'
                  }`}
                  onClick={() => !member.isAlreadyFollowing && setSelectedUserId(member.id)}
                >
                  <div className="flex items-center gap-2">
                    <AvatarSystem
                      name={`${member.firstName} ${member.lastName}`}
                      src={member.avatarUrl}
                      size="sm"
                    />
                    <div>
                      <div className="text-sm font-medium">
                        {member.firstName} {member.lastName}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs text-muted-foreground">{member.email}</span>
                        <Badge variant="outline" className={`text-xs ${getUserTypeBadgeColor(member.userType)}`}>
                          {member.userType}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {member.isAlreadyFollowing ? (
                    <Badge variant="secondary" className="text-xs">
                      {t('followers.already_following', 'Following')}
                    </Badge>
                  ) : selectedUserId === member.id ? (
                    <div className="w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                      <div className="w-2 h-2 rounded-full bg-white"></div>
                    </div>
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-muted-foreground"></div>
                  )}
                </div>
              ))
            )}
          </div>

          {/* Notification Level Selection */}
          {selectedUserId && (
            <div className="space-y-2">
              <Label>{t('followers.notification_level', 'Notification Level')}</Label>
              <Select value={notificationLevel} onValueChange={(value: 'all' | 'important' | 'none') => setNotificationLevel(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-green-600" />
                      {t('followers.all_notifications', 'All notifications')}
                    </div>
                  </SelectItem>
                  <SelectItem value="important">
                    <div className="flex items-center gap-2">
                      <Bell className="h-4 w-4 text-yellow-600" />
                      {t('followers.important_only', 'Important only')}
                    </div>
                  </SelectItem>
                  <SelectItem value="none">
                    <div className="flex items-center gap-2">
                      <BellOff className="h-4 w-4 text-gray-400" />
                      {t('followers.no_notifications', 'No notifications')}
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2">
            <Button variant="outline" onClick={onClose} className="flex-1">
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              onClick={handleAdd}
              disabled={!selectedUserId || adding}
              className="flex-1"
            >
              {adding ? (
                <>
                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                  {t('followers.adding', 'Adding...')}
                </>
              ) : (
                <>
                  <UserPlus className="h-4 w-4 mr-2" />
                  {t('followers.add_follower', 'Add Follower')}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}