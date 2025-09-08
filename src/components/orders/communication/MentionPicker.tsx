import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, AtSign } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  role?: string;
  department?: string;
}

interface MentionPickerProps {
  users: User[];
  onSelect: (user: User) => void;
  onClose: () => void;
}

export function MentionPicker({ users, onSelect, onClose }: MentionPickerProps) {
  const { t } = useTranslation();
  const [searchTerm, setSearchTerm] = useState('');

  const filteredUsers = users.filter(user =>
    user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AtSign className="w-4 h-4 text-primary" />
          <h4 className="font-semibold text-sm">{t('communication.mention_someone')}</h4>
        </div>
        <Button variant="ghost" size="sm" onClick={onClose}>
          ×
        </Button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder={t('communication.search_users')}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10"
          autoFocus
        />
      </div>

      {/* User List */}
      <div className="max-h-40 overflow-y-auto space-y-1">
        {filteredUsers.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground text-sm">
            {t('communication.no_users_found')}
          </div>
        ) : (
          filteredUsers.map(user => (
            <Button
              key={user.id}
              variant="ghost"
              className="w-full justify-start h-auto p-2"
              onClick={() => onSelect(user)}
            >
              <div className="flex items-center gap-3">
                <Avatar className="w-8 h-8">
                  <AvatarImage src={user.avatar} />
                  <AvatarFallback className="text-xs">
                    {user.name.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 text-left">
                  <div className="font-medium text-sm">{user.name}</div>
                  <div className="text-xs text-muted-foreground">{user.email}</div>
                </div>
                {user.role && (
                  <Badge variant="outline" className="text-xs">
                    {user.role}
                  </Badge>
                )}
              </div>
            </Button>
          ))
        )}
      </div>
    </Card>
  );
}