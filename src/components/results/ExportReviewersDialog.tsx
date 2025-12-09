/**
 * Export Reviewers Dialog Component
 * Provides UI for exporting reviewer recommendations in CSV or JSON format
 */

import React, { useState } from 'react';
import { Download, FileText, FileJson } from 'lucide-react';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { toast } from 'sonner';
import type { Reviewer } from '@/features/scholarfinder/types/api';

interface ExportReviewersDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  reviewers: Reviewer[];
  onExport: (format: 'csv' | 'json') => void;
}

interface ExportOption {
  format: 'csv' | 'json';
  label: string;
  description: string;
  icon: React.ReactNode;
  fileExtension: string;
}

const exportOptions: ExportOption[] = [
  {
    format: 'csv',
    label: 'CSV (Comma Separated Values)',
    description: 'Simple spreadsheet format compatible with Excel, Google Sheets, and other tools',
    icon: <FileText className="h-5 w-5 text-green-600" />,
    fileExtension: 'csv'
  },
  {
    format: 'json',
    label: 'JSON (JavaScript Object Notation)',
    description: 'Structured data format suitable for programmatic processing and data analysis',
    icon: <FileJson className="h-5 w-5 text-blue-600" />,
    fileExtension: 'json'
  }
];

export const ExportReviewersDialog: React.FC<ExportReviewersDialogProps> = ({
  open,
  onOpenChange,
  reviewers,
  onExport
}) => {
  const [selectedFormat, setSelectedFormat] = useState<'csv' | 'json'>('csv');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    if (reviewers.length === 0) {
      toast.error('No reviewers to export');
      return;
    }

    try {
      setIsExporting(true);
      await onExport(selectedFormat);
      
      toast.success(
        `Export Started`,
        {
          description: `Exporting ${reviewers.length} reviewer${reviewers.length !== 1 ? 's' : ''} as ${selectedFormat.toUpperCase()}. The download will start shortly.`
        }
      );

      onOpenChange(false);
    } catch (error) {
      console.error('Export error:', error);
      toast.error(
        'Export Failed',
        {
          description: error instanceof Error ? error.message : 'Failed to export reviewers. Please try again.'
        }
      );
    } finally {
      setIsExporting(false);
    }
  };

  const selectedOption = exportOptions.find(option => option.format === selectedFormat);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Export Reviewers</DialogTitle>
          <DialogDescription>
            Export {reviewers.length} selected reviewer{reviewers.length !== 1 ? 's' : ''} in your preferred format.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-base font-medium">Choose Export Format</Label>
            <RadioGroup
              value={selectedFormat}
              onValueChange={(value) => setSelectedFormat(value as 'csv' | 'json')}
              className="mt-3"
            >
              <div className="space-y-3">
                {exportOptions.map((option) => (
                  <div key={option.format} className="flex items-center space-x-3">
                    <RadioGroupItem value={option.format} id={option.format} />
                    <Label htmlFor={option.format} className="flex-1 cursor-pointer">
                      <Card className="hover:bg-gray-50 transition-colors">
                        <CardHeader className="pb-2">
                          <div className="flex items-center gap-3">
                            {option.icon}
                            <div>
                              <CardTitle className="text-sm">{option.label}</CardTitle>
                              <CardDescription className="text-xs">
                                {option.description}
                              </CardDescription>
                            </div>
                          </div>
                        </CardHeader>
                      </Card>
                    </Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          </div>

          {selectedOption && (
            <Card className="bg-blue-50 border-blue-200">
              <CardContent className="pt-4">
                <div className="flex items-center gap-3">
                  <Download className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      Ready to export as {selectedOption.label}
                    </p>
                    <p className="text-xs text-blue-700">
                      File will be downloaded as: reviewers-{new Date().toISOString().split('T')[0]}.{selectedOption.fileExtension}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="bg-gray-50 rounded-lg p-4">
            <h4 className="text-sm font-medium mb-2">Export Contents</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              <li>• Reviewer names and contact information</li>
              <li>• Affiliation and institutional details</li>
              <li>• Publication counts and metrics</li>
              <li>• Validation scores and criteria satisfied</li>
              <li>• All publication statistics (last 10, 5, 2 years)</li>
              <li>• Conflict of interest indicators</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isExporting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={isExporting || reviewers.length === 0}
          >
            {isExporting ? (
              <>
                <Download className="h-4 w-4 mr-2 animate-spin" />
                Exporting...
              </>
            ) : (
              <>
                <Download className="h-4 w-4 mr-2" />
                Export {selectedOption?.fileExtension.toUpperCase()}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
