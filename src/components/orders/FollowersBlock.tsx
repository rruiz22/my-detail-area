import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Users, 
  UserPlus, 
  Crown, 
  Shield,
  Mail,
  Phone
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/integrations/supabase/client';

interface Follower {
  id: string;
  user_name: string;
  email: string;
  role: string;
  avatar_url?: string;
  is_primary: boolean;
  phone?: string;
}

interface FollowersBlockProps {
  orderId: string;
  dealerId?: string;
}

export function FollowersBlock({ orderId, dealerId }: FollowersBlockProps) {
  const { t } = useTranslation();
  const [followers, setFollowers] = useState<Follower[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchFollowers();
  }, [orderId]);

  const fetchFollowers = async () => {
    try {
      setLoading(true);
      
      // Mock followers data (replace with actual database query when schema is ready)
      const mockFollowers: Follower[] = [
        {
          id: 'user1',
          user_name: 'John Smith',
          email: 'john.smith@premiumauto.com',
          role: 'Sales Manager',
          is_primary: true,
          phone: '+1-555-0123'
        },
        {
          id: 'user2',
          user_name: 'Sarah Johnson', 
          email: 'sarah.j@premiumauto.com',
          role: 'Detail User',
          is_primary: false,
          phone: '+1-555-0124'
        },
        {
          id: 'user3',
          user_name: 'Mike Wilson',
          email: 'mike.w@premiumauto.com', 
          role: 'Service Advisor',
          is_primary: false,
          phone: '+1-555-0125'
        }
      ];
      
      setFollowers(mockFollowers);
      
      // TODO: Replace with actual database query when tables are created
      // const { data, error } = await supabase
      //   .from('dealer_memberships')
      //   .select(`
      //     user_id,
      //     is_active,
      //     profiles (
      //       email,
      //       first_name,
      //       last_name,
      //       user_type
      //     )
      //   `)
      //   .eq('dealer_id', dealerId || 5)
      //   .eq('is_active', true);
      
    } catch (error) {
      console.error('Error fetching followers:', error);
    } finally {
      setLoading(false);
    }
  };

  const getRoleIcon = (role: string) => {
    if (role.includes('Admin') || role.includes('Manager')) {
      return <Crown className="h-3 w-3 text-yellow-600" />;
    }
    return <Shield className="h-3 w-3 text-blue-600" />;
  };

  const getRoleBadgeColor = (role: string) => {
    if (role.includes('Admin')) return 'bg-yellow-100 text-yellow-800';
    if (role.includes('Manager')) return 'bg-purple-100 text-purple-800';
    if (role.includes('Detail')) return 'bg-blue-100 text-blue-800';
    return 'bg-gray-100 text-gray-800';
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Followers
          </div>
          <Badge variant="outline" className="text-xs">
            {followers.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-3">
        {loading ? (
          <div className="text-center py-4">
            <div className="animate-spin w-6 h-6 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
            <p className="text-xs text-muted-foreground mt-2">Loading team...</p>
          </div>
        ) : followers.length === 0 ? (
          <div className="text-center py-6 text-muted-foreground">
            <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No followers</p>
            <Button variant="outline" size="sm" className="mt-2">
              <UserPlus className="h-3 w-3 mr-1" />
              Add Team Member
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {followers.slice(0, 4).map((follower) => (
                <div key={follower.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/30">
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={follower.avatar_url} />
                      <AvatarFallback className="text-xs">
                        {follower.user_name.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-sm font-medium">{follower.user_name}</span>
                        {follower.is_primary && (
                          <Crown className="h-3 w-3 text-yellow-600" />
                        )}
                      </div>
                      <div className="flex items-center gap-1">
                        <Badge variant="outline" className={`text-xs ${getRoleBadgeColor(follower.role)}`}>
                          {getRoleIcon(follower.role)}
                          <span className="ml-1">{follower.role}</span>
                        </Badge>
                      </div>
                    </div>
                  </div>
                  
                  {/* Quick Actions */}
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Mail className="h-3 w-3 text-blue-600" />
                    </Button>
                    <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                      <Phone className="h-3 w-3 text-green-600" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            
            {followers.length > 4 && (
              <Button variant="outline" size="sm" className="w-full text-xs">
                <UserPlus className="h-3 w-3 mr-1" />
                View All ({followers.length})
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}