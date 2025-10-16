import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, UserPlus, X } from 'lucide-react';
import { useDealershipUsers, DealershipUser } from '@/hooks/useDealershipUsers';

interface AssignUserDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentAssignedUserId?: string | null;
  onAssign: (userId: string | null) => Promise<void>;
  taskTitle?: string;
}

export const AssignUserDialog: React.FC<AssignUserDialogProps> = ({
  open,
  onOpenChange,
  currentAssignedUserId,
  onAssign,
  taskTitle
}) => {
  const { users, isLoading, getDisplayName, getInitials } = useDealershipUsers();
  const [searchQuery, setSearchQuery] = useState('');
  const [isAssigning, setIsAssigning] = useState(false);

  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const displayName = getDisplayName(user).toLowerCase();
    const email = user.email.toLowerCase();
    const query = searchQuery.toLowerCase();
    return displayName.includes(query) || email.includes(query);
  });

  const handleAssign = async (userId: string | null) => {
    setIsAssigning(true);
    try {
      await onAssign(userId);
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to assign user:', error);
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserPlus className="w-5 h-5" />
            Assign Task
          </DialogTitle>
          {taskTitle && (
            <DialogDescription>
              Assign "{taskTitle}" to a team member
            </DialogDescription>
          )}
        </DialogHeader>

        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Unassign Option */}
          {currentAssignedUserId && (
            <Button
              variant="outline"
              className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground"
              onClick={() => handleAssign(null)}
              disabled={isAssigning}
            >
              <X className="w-4 h-4" />
              Remove Assignment
            </Button>
          )}

          {/* Users List */}
          <ScrollArea className="h-[300px] pr-4">
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 animate-pulse">
                    <div className="w-10 h-10 bg-muted rounded-full" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 bg-muted rounded w-3/4" />
                      <div className="h-3 bg-muted rounded w-1/2" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <UserPlus className="w-12 h-12 mx-auto mb-3 opacity-50" />
                <p className="text-sm">No users found</p>
                {searchQuery && (
                  <p className="text-xs mt-1">
                    Try adjusting your search
                  </p>
                )}
              </div>
            ) : (
              <div className="space-y-1">
                {filteredUsers.map((user) => (
                  <button
                    key={user.id}
                    onClick={() => handleAssign(user.id)}
                    disabled={isAssigning}
                    className={`
                      w-full flex items-center gap-3 p-3 rounded-lg
                      transition-colors text-left
                      ${currentAssignedUserId === user.id
                        ? 'bg-primary/10 ring-2 ring-primary'
                        : 'hover:bg-muted'
                      }
                      disabled:opacity-50 disabled:cursor-not-allowed
                    `}
                  >
                    <Avatar>
                      <AvatarImage src={user.avatar_url || undefined} />
                      <AvatarFallback>
                        {getInitials(user)}
                      </AvatarFallback>
                    </Avatar>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-sm truncate">
                          {getDisplayName(user)}
                        </p>
                        {currentAssignedUserId === user.id && (
                          <Badge variant="secondary" className="text-xs">
                            Current
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground truncate">
                        {user.email}
                      </p>
                    </div>

                    {user.user_type && (
                      <Badge variant="outline" className="text-xs">
                        {user.user_type}
                      </Badge>
                    )}
                  </button>
                ))}
              </div>
            )}
          </ScrollArea>

          {/* Footer */}
          <div className="flex justify-between items-center text-xs text-muted-foreground pt-2 border-t">
            <span>{filteredUsers.length} team member{filteredUsers.length !== 1 ? 's' : ''}</span>
            <span>Click to assign</span>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

