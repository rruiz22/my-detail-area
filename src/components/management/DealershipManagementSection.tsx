import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Building2, 
  Plus, 
  Search, 
  MoreHorizontal, 
  Edit, 
  Eye, 
  Users,
  MapPin,
  Download,
  Upload
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { DealershipModal } from '@/components/dealerships/DealershipModal';

interface DealershipWithStats {
  id: number;
  name: string;
  email: string;
  city: string;
  state: string;
  status: 'active' | 'inactive' | 'suspended';
  subscription_plan: 'basic' | 'premium' | 'enterprise';
  logo_url?: string;
  contacts_count: number;
  users_count: number;
}

export const DealershipManagementSection = () => {
  const [dealerships, setDealerships] = useState<DealershipWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingDealership, setEditingDealership] = useState(null);
  const { toast } = useToast();

  const fetchDealerships = useCallback(async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('dealerships')
        .select('*')
        .is('deleted_at', null)
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Get counts for each dealership
      const dealershipsWithStats = await Promise.all(
        (data || []).map(async (dealership) => {
          const [contactsResult, usersResult] = await Promise.all([
            supabase
              .from('dealership_contacts')
              .select('id', { count: 'exact' })
              .eq('dealership_id', dealership.id)
              .is('deleted_at', null),
            supabase
              .from('profiles')
              .select('id', { count: 'exact' })
              .eq('dealership_id', dealership.id)
          ]);

          return {
            ...dealership,
            contacts_count: contactsResult.count || 0,
            users_count: usersResult.count || 0,
          };
        })
      );

      setDealerships(dealershipsWithStats);
    } catch (error) {
      console.error('Error fetching dealerships:', error);
      toast({
        title: 'Error',
        description: 'Failed to fetch dealerships',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchDealerships();
  }, [fetchDealerships]);

  const filteredDealerships = dealerships.filter(dealership =>
    dealership.name.toLowerCase().includes(search.toLowerCase()) ||
    dealership.email.toLowerCase().includes(search.toLowerCase()) ||
    `${dealership.city} ${dealership.state}`.toLowerCase().includes(search.toLowerCase())
  );

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active': return 'default';
      case 'inactive': return 'secondary';
      case 'suspended': return 'destructive';
      default: return 'secondary';
    }
  };

  const getPlanBadgeVariant = (plan: string) => {
    switch (plan) {
      case 'basic': return 'outline';
      case 'premium': return 'secondary';
      case 'enterprise': return 'default';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Dealership Management
          </CardTitle>
          <CardDescription>
            Manage dealerships, their configurations, and subscription plans
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3 justify-between">
            <div className="flex flex-wrap gap-3">
              <Button 
                className="flex items-center gap-2"
                onClick={() => {
                  setEditingDealership(null);
                  setIsModalOpen(true);
                }}
              >
                <Plus className="h-4 w-4" />
                Add Dealership
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Upload className="h-4 w-4" />
                Import Data
              </Button>
              <Button variant="outline" className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Export Report
              </Button>
            </div>
            
            {/* Search */}
            <div className="relative w-80">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search dealerships..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Dealerships Table */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Dealership</TableHead>
                <TableHead>Location</TableHead>
                <TableHead className="text-center">Users</TableHead>
                <TableHead className="text-center">Contacts</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center">
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
                    </div>
                  </TableCell>
                </TableRow>
              ) : filteredDealerships.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                    {search ? 'No dealerships found matching your search' : 'No dealerships found'}
                  </TableCell>
                </TableRow>
              ) : (
                filteredDealerships.map((dealership) => (
                  <TableRow key={dealership.id} className="hover:bg-muted/50">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-10 w-10">
                          <AvatarImage src={dealership.logo_url} alt={dealership.name} />
                          <AvatarFallback>
                            <Building2 className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{dealership.name}</div>
                          <div className="text-sm text-muted-foreground">{dealership.email}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <span className="text-sm">
                          {dealership.city && dealership.state ? 
                            `${dealership.city}, ${dealership.state}` : 
                            dealership.city || dealership.state || '-'
                          }
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Users className="h-3 w-3 text-muted-foreground" />
                        <span className="font-medium">{dealership.users_count}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium">{dealership.contacts_count}</span>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getPlanBadgeVariant(dealership.subscription_plan)}>
                        {dealership.subscription_plan}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeVariant(dealership.status)}>
                        {dealership.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => {
                              setEditingDealership(dealership);
                              setIsModalOpen(true);
                            }}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <DealershipModal
        isOpen={isModalOpen}
        onClose={() => {
          setIsModalOpen(false);
          setEditingDealership(null);
        }}
        onSuccess={() => {
          fetchDealerships();
          setIsModalOpen(false);
          setEditingDealership(null);
        }}
        dealership={editingDealership}
      />
    </div>
  );
};