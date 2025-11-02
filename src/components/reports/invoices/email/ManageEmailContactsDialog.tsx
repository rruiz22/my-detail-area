// =====================================================
// MANAGE EMAIL CONTACTS DIALOG
// Created: 2025-11-03
// Description: Modal to manage email contacts for a dealership
// =====================================================

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Plus, Pencil, Trash2, Star, Search, Users } from 'lucide-react';
import { EmailContactForm } from './EmailContactForm';
import {
  useEmailContacts,
  useCreateEmailContact,
  useUpdateEmailContact,
  useDeleteEmailContact,
  useToggleDefaultContact,
} from '@/hooks/useEmailContacts';
import type { EmailContact, EmailContactInput } from '@/types/email';

interface ManageEmailContactsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  dealershipId: number;
  dealershipName: string;
}

export const ManageEmailContactsDialog: React.FC<ManageEmailContactsDialogProps> = ({
  open,
  onOpenChange,
  dealershipId,
  dealershipName,
}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<EmailContact | null>(null);
  const [deleteContactId, setDeleteContactId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const { data: contacts = [], isLoading } = useEmailContacts(dealershipId);
  const createMutation = useCreateEmailContact();
  const updateMutation = useUpdateEmailContact();
  const deleteMutation = useDeleteEmailContact();
  const toggleDefaultMutation = useToggleDefaultContact();

  const filteredContacts = contacts.filter(contact =>
    contact.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    contact.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (contact.job_title && contact.job_title.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleAdd = () => {
    setEditingContact(null);
    setShowForm(true);
  };

  const handleEdit = (contact: EmailContact) => {
    setEditingContact(contact);
    setShowForm(true);
  };

  const handleDelete = (contactId: string) => {
    setDeleteContactId(contactId);
  };

  const confirmDelete = () => {
    if (deleteContactId) {
      deleteMutation.mutate(
        { id: deleteContactId, dealershipId },
        {
          onSuccess: () => setDeleteContactId(null),
        }
      );
    }
  };

  const handleSubmit = (data: EmailContactInput) => {
    if (editingContact) {
      updateMutation.mutate(
        { id: editingContact.id, updates: data },
        {
          onSuccess: () => {
            setShowForm(false);
            setEditingContact(null);
          },
        }
      );
    } else {
      createMutation.mutate(data, {
        onSuccess: () => {
          setShowForm(false);
        },
      });
    }
  };

  const handleToggleDefault = (contact: EmailContact) => {
    toggleDefaultMutation.mutate({
      id: contact.id,
      dealershipId: contact.dealership_id,
      isDefault: !contact.is_default,
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <DialogTitle className="text-2xl">Email Contacts</DialogTitle>
                <DialogDescription>{dealershipName}</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {showForm ? (
            <div className="mt-6">
              <h3 className="text-lg font-semibold mb-4">
                {editingContact ? 'Edit Contact' : 'Add New Contact'}
              </h3>
              <EmailContactForm
                dealershipId={dealershipId}
                contact={editingContact || undefined}
                onSubmit={handleSubmit}
                onCancel={() => {
                  setShowForm(false);
                  setEditingContact(null);
                }}
                isLoading={createMutation.isPending || updateMutation.isPending}
              />
            </div>
          ) : (
            <div className="space-y-4 mt-6">
              {/* Search and Add */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search contacts..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Button onClick={handleAdd}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Contact
                </Button>
              </div>

              {/* Contacts Table */}
              {isLoading ? (
                <div className="text-center py-8 text-muted-foreground">
                  Loading contacts...
                </div>
              ) : filteredContacts.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  {searchTerm ? 'No contacts found' : 'No contacts yet. Add your first contact!'}
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-gray-50">
                        <TableHead className="w-[30%]">Name</TableHead>
                        <TableHead className="w-[30%]">Email</TableHead>
                        <TableHead className="w-[20%]">Job Title</TableHead>
                        <TableHead className="w-[10%] text-center">Default</TableHead>
                        <TableHead className="w-[10%] text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredContacts.map((contact) => (
                        <TableRow key={contact.id}>
                          <TableCell className="font-medium">
                            {contact.name}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {contact.email}
                          </TableCell>
                          <TableCell className="text-sm">
                            {contact.job_title || '-'}
                          </TableCell>
                          <TableCell className="text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggleDefault(contact)}
                              disabled={toggleDefaultMutation.isPending}
                            >
                              <Star
                                className={`h-4 w-4 ${
                                  contact.is_default
                                    ? 'fill-yellow-400 text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                              />
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(contact)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(contact.id)}
                                disabled={deleteMutation.isPending}
                              >
                                <Trash2 className="h-4 w-4 text-red-500" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {/* Close button */}
              <div className="flex justify-end pt-4">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteContactId} onOpenChange={(open) => !open && setDeleteContactId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contact?</AlertDialogTitle>
            <AlertDialogDescription>
              This contact will be removed from your list. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};
