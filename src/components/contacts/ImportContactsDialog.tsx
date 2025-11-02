import React, { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Upload, FileText, CheckCircle, XCircle, AlertCircle, Building2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { parseContactsCSV } from '@/utils/contactExport';
import { Contact } from '@/hooks/useContacts';

interface ImportContactsDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentDealershipId: number | 'all';
  currentDealershipName: string;
}

interface ImportResult {
  total: number;
  success: number;
  failed: number;
  errors: string[];
}

export function ImportContactsDialog({ open, onClose, onSuccess, currentDealershipId, currentDealershipName }: ImportContactsDialogProps) {
  const { t } = useTranslation();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [previewData, setPreviewData] = useState<Partial<Contact>[]>([]);

  const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.csv')) {
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('contacts.import.invalid_file_type', 'Please select a CSV file'),
      });
      return;
    }

    setSelectedFile(file);

    // Parse and preview the file
    try {
      const text = await file.text();
      const parsed = parseContactsCSV(text);
      setPreviewData(parsed.slice(0, 5)); // Show first 5 rows as preview
    } catch (error) {
      console.error('Error parsing CSV:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('contacts.import.parse_error', 'Failed to parse CSV file'),
      });
      setSelectedFile(null);
    }
  };

  const handleImport = async () => {
    if (!selectedFile || currentDealershipId === 'all') {
      toast({
        variant: 'destructive',
        description: t('contacts.import.missing_fields', 'Please select a file and dealership'),
      });
      return;
    }

    try {
      setImporting(true);
      setProgress(0);
      setResult(null);

      const text = await selectedFile.text();
      const contacts = parseContactsCSV(text);

      const importResult: ImportResult = {
        total: contacts.length,
        success: 0,
        failed: 0,
        errors: [],
      };

      // Import contacts one by one with progress tracking
      for (let i = 0; i < contacts.length; i++) {
        const contact = contacts[i];

        try {
          const { error } = await supabase
            .from('dealership_contacts')
            .insert({
              ...contact,
              dealership_id: currentDealershipId as number,
            });

          if (error) {
            importResult.failed++;
            importResult.errors.push(
              `Row ${i + 2}: ${error.message}`
            );
          } else {
            importResult.success++;
          }
        } catch (err) {
          importResult.failed++;
          importResult.errors.push(
            `Row ${i + 2}: ${err instanceof Error ? err.message : 'Unknown error'}`
          );
        }

        setProgress(((i + 1) / contacts.length) * 100);
      }

      setResult(importResult);

      if (importResult.success > 0) {
        toast({
          title: t('common.success'),
          description: t('contacts.import.success', {
            count: importResult.success,
            defaultValue: `Successfully imported ${importResult.success} contacts`,
          }),
        });

        // Wait a bit to show results before closing
        setTimeout(() => {
          onSuccess();
          handleClose();
        }, 2000);
      } else {
        toast({
          variant: 'destructive',
          title: t('common.error'),
          description: t('contacts.import.all_failed', 'All contacts failed to import'),
        });
      }
    } catch (error) {
      console.error('Error importing contacts:', error);
      toast({
        variant: 'destructive',
        title: t('common.error'),
        description: t('contacts.import.error', 'Failed to import contacts'),
      });
    } finally {
      setImporting(false);
    }
  };

  const handleClose = () => {
    setSelectedFile(null);
    setProgress(0);
    setResult(null);
    setPreviewData([]);
    onClose();
  };

  const handleDownloadTemplate = () => {
    const csvContent = [
      'First Name,Last Name,Email,Phone,Mobile Phone,Position,Department,Vehicle,License Plate,Dealership,Status,Primary Contact,Language,Can Receive Notifications',
      'John,Doe,john.doe@example.com,555-1234,555-5678,Sales Manager,sales,2024 BMW X5,ABC-1234,,active,Yes,en,Yes',
      'Jane,Smith,jane.smith@example.com,555-2345,555-6789,Service Manager,service,2023 Mercedes C300,XYZ-5678,,active,No,en,Yes',
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'contacts_template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5" />
            {t('contacts.import.title', 'Import Contacts')}
          </DialogTitle>
          <DialogDescription>
            {t('contacts.import.description', 'Import contacts from a CSV file')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Template Download */}
          <Alert>
            <FileText className="h-4 w-4" />
            <AlertDescription>
              <div className="flex items-center justify-between">
                <span className="text-sm">
                  {t('contacts.import.template_info', 'Download the template to see the required format')}
                </span>
                <Button variant="link" size="sm" onClick={handleDownloadTemplate}>
                  {t('contacts.import.download_template', 'Download Template')}
                </Button>
              </div>
            </AlertDescription>
          </Alert>

          {/* Dealership Info */}
          <Alert>
            <Building2 className="h-4 w-4" />
            <AlertDescription>
              {t('contacts.import.importing_to', 'Importing contacts to')}: <strong>{currentDealershipName}</strong>
            </AlertDescription>
          </Alert>

          {/* File Upload */}
          <div>
            <Label htmlFor="file">{t('contacts.import.csv_file', 'CSV File')} *</Label>
            <div className="flex gap-2">
              <Input
                id="file"
                type="file"
                accept=".csv"
                ref={fileInputRef}
                onChange={handleFileSelect}
                disabled={importing}
              />
              {selectedFile && (
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => {
                    setSelectedFile(null);
                    setPreviewData([]);
                    if (fileInputRef.current) {
                      fileInputRef.current.value = '';
                    }
                  }}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              )}
            </div>
          </div>

          {/* Preview */}
          {previewData.length > 0 && !importing && !result && (
            <div>
              <Label>{t('contacts.import.preview', 'Preview (first 5 rows)')}</Label>
              <div className="mt-2 rounded-md border">
                <div className="max-h-48 overflow-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr>
                        <th className="px-2 py-1 text-left">{t('contacts.name')}</th>
                        <th className="px-2 py-1 text-left">{t('contacts.email')}</th>
                        <th className="px-2 py-1 text-left">{t('contacts.department')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((contact, index) => (
                        <tr key={index} className="border-t">
                          <td className="px-2 py-1">
                            {contact.first_name} {contact.last_name}
                          </td>
                          <td className="px-2 py-1">{contact.email}</td>
                          <td className="px-2 py-1">{contact.department}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* Progress */}
          {importing && (
            <div className="space-y-2">
              <Label>{t('contacts.import.importing', 'Importing...')}</Label>
              <Progress value={progress} />
              <p className="text-sm text-muted-foreground text-center">
                {Math.round(progress)}%
              </p>
            </div>
          )}

          {/* Results */}
          {result && (
            <div className="space-y-3">
              <Alert variant={result.failed === 0 ? 'default' : 'destructive'}>
                {result.failed === 0 ? (
                  <CheckCircle className="h-4 w-4" />
                ) : (
                  <AlertCircle className="h-4 w-4" />
                )}
                <AlertDescription>
                  <div className="space-y-2">
                    <div>
                      <strong>{t('contacts.import.results', 'Import Results')}:</strong>
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <span className="font-medium">{t('common.total')}:</span> {result.total}
                      </div>
                      <div className="text-green-600">
                        <span className="font-medium">{t('common.success')}:</span> {result.success}
                      </div>
                      <div className="text-red-600">
                        <span className="font-medium">{t('common.failed')}:</span> {result.failed}
                      </div>
                    </div>

                    {result.errors.length > 0 && (
                      <div className="mt-2">
                        <details className="text-xs">
                          <summary className="cursor-pointer font-medium">
                            {t('contacts.import.view_errors', 'View Errors')}
                          </summary>
                          <ul className="mt-2 space-y-1 max-h-32 overflow-auto">
                            {result.errors.slice(0, 10).map((error, index) => (
                              <li key={index} className="text-red-600">• {error}</li>
                            ))}
                            {result.errors.length > 10 && (
                              <li className="text-muted-foreground">
                                ...and {result.errors.length - 10} more errors
                              </li>
                            )}
                          </ul>
                        </details>
                      </div>
                    )}
                  </div>
                </AlertDescription>
              </Alert>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={importing}>
            {t('common.cancel')}
          </Button>
          <Button
            onClick={handleImport}
            disabled={!selectedFile || currentDealershipId === 'all' || importing || !!result}
          >
            {importing ? t('contacts.import.importing') : t('contacts.import.start', 'Import')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
