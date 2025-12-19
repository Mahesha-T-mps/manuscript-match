/**
 * Keyword Enhancement Component
 * Handles keyword enhancement, MeSH term generation, and search string creation
 */

import React, { useState, useCallback, useMemo } from 'react';
import { Zap, Sparkles, AlertCircle, Loader2, ArrowDown, ArrowUp, Plus, Copy, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';

import { Alert, AlertDescription } from '@/components/ui/alert';
import { useToast } from '@/hooks/use-toast';

import { useMetadata } from '@/hooks/useFiles';
import type { EnhancedKeywords } from '@/services/keywordService';

interface KeywordEnhancementProps {
  processId: string;
  onEnhancementComplete?: (keywords: any) => void;
  onKeywordStringChange?: (keywordString: string) => void;
  onTriggerEnhancement?: () => void;
  isEnhancing?: boolean;
  hasEnhanced?: boolean;
  enhancedKeywords?: EnhancedKeywords | null;
}

export const KeywordEnhancement: React.FC<KeywordEnhancementProps> = ({
  processId,
  onEnhancementComplete,
  onKeywordStringChange,
  onTriggerEnhancement,
  isEnhancing = false,
  hasEnhanced = false,
  enhancedKeywords,
}) => {
  const { toast } = useToast();
  
  // Local state
  const [selectedPrimaryKeywords, setSelectedPrimaryKeywords] = useState<string[]>([]);
  const [selectedSecondaryKeywords, setSelectedSecondaryKeywords] = useState<string[]>([]);
  const [primaryKeywords, setPrimaryKeywords] = useState<string[]>([]);
  const [secondaryKeywords, setSecondaryKeywords] = useState<string[]>([]);
  const [newPrimaryKeyword, setNewPrimaryKeyword] = useState('');
  const [newSecondaryKeyword, setNewSecondaryKeyword] = useState('');

  const [copiedKeywordString, setCopiedKeywordString] = useState(false);
  
  // API hooks
  const { data: metadata } = useMetadata(processId);

  // Initialize keyword lists when enhanced keywords are loaded
  React.useEffect(() => {
    if (enhancedKeywords && primaryKeywords.length === 0 && secondaryKeywords.length === 0) {
      setPrimaryKeywords(enhancedKeywords.primaryFocus);
      setSecondaryKeywords(enhancedKeywords.secondaryFocus);
    }
  }, [enhancedKeywords, primaryKeywords.length, secondaryKeywords.length]);

  const handleEnhanceKeywords = useCallback(() => {
    if (onTriggerEnhancement) {
      onTriggerEnhancement();
    }
  }, [onTriggerEnhancement]);

  const handlePrimaryKeywordToggle = useCallback((keyword: string, checked: boolean) => {
    setSelectedPrimaryKeywords(prev => {
      if (checked) {
        return [...prev, keyword];
      } else {
        return prev.filter(k => k !== keyword);
      }
    });
  }, []);

  const handleSecondaryKeywordToggle = useCallback((keyword: string, checked: boolean) => {
    setSelectedSecondaryKeywords(prev => {
      if (checked) {
        return [...prev, keyword];
      } else {
        return prev.filter(k => k !== keyword);
      }
    });
  }, []);

  const movePrimaryToSecondary = useCallback((keyword: string) => {
    setPrimaryKeywords(prev => prev.filter(k => k !== keyword));
    setSecondaryKeywords(prev => [...prev, keyword]);
    setSelectedPrimaryKeywords(prev => prev.filter(k => k !== keyword));
    
    toast({
      title: 'Keyword Moved',
      description: `"${keyword}" moved to Secondary Keywords`,
    });
  }, [toast]);

  const moveSecondaryToPrimary = useCallback((keyword: string) => {
    setSecondaryKeywords(prev => prev.filter(k => k !== keyword));
    setPrimaryKeywords(prev => [...prev, keyword]);
    setSelectedSecondaryKeywords(prev => prev.filter(k => k !== keyword));
    
    toast({
      title: 'Keyword Moved',
      description: `"${keyword}" moved to Primary Keywords`,
    });
  }, [toast]);

  const addPrimaryKeyword = useCallback(() => {
    const trimmed = newPrimaryKeyword.trim();
    if (!trimmed) {
      toast({
        title: 'Invalid Keyword',
        description: 'Please enter a keyword',
        variant: 'destructive',
      });
      return;
    }

    if (primaryKeywords.includes(trimmed) || secondaryKeywords.includes(trimmed)) {
      toast({
        title: 'Duplicate Keyword',
        description: 'This keyword already exists',
        variant: 'destructive',
      });
      return;
    }

    setPrimaryKeywords(prev => [...prev, trimmed]);
    setNewPrimaryKeyword('');
    
    toast({
      title: 'Keyword Added',
      description: `"${trimmed}" added to Primary Keywords`,
    });
  }, [newPrimaryKeyword, primaryKeywords, secondaryKeywords, toast]);

  const addSecondaryKeyword = useCallback(() => {
    const trimmed = newSecondaryKeyword.trim();
    if (!trimmed) {
      toast({
        title: 'Invalid Keyword',
        description: 'Please enter a keyword',
        variant: 'destructive',
      });
      return;
    }

    if (primaryKeywords.includes(trimmed) || secondaryKeywords.includes(trimmed)) {
      toast({
        title: 'Duplicate Keyword',
        description: 'This keyword already exists',
        variant: 'destructive',
      });
      return;
    }

    setSecondaryKeywords(prev => [...prev, trimmed]);
    setNewSecondaryKeyword('');
    
    toast({
      title: 'Keyword Added',
      description: `"${trimmed}" added to Secondary Keywords`,
    });
  }, [newSecondaryKeyword, primaryKeywords, secondaryKeywords, toast]);

  const handlePrimaryKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addPrimaryKeyword();
    }
  }, [addPrimaryKeyword]);

  const handleSecondaryKeyPress = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSecondaryKeyword();
    }
  }, [addSecondaryKeyword]);

  // Generate keyword string
  const keywordString = useMemo(() => {
    const parts: string[] = [];
    
    if (selectedPrimaryKeywords.length > 0) {
      const primaryPart = `(${selectedPrimaryKeywords.join(' OR ')})`;
      parts.push(primaryPart);
    }
    
    if (selectedSecondaryKeywords.length > 0) {
      const secondaryPart = `(${selectedSecondaryKeywords.join(' OR ')})`;
      parts.push(secondaryPart);
    }
    
    return parts.join(' AND ');
  }, [selectedPrimaryKeywords, selectedSecondaryKeywords]);

  // Notify parent when keyword string changes
  React.useEffect(() => {
    if (onKeywordStringChange && keywordString) {
      onKeywordStringChange(keywordString);
    }
  }, [keywordString, onKeywordStringChange]);

  const handleCopyKeywordString = useCallback(async () => {
    if (!keywordString) {
      toast({
        title: 'No Keywords Selected',
        description: 'Please select at least one keyword to generate a keyword string',
        variant: 'destructive',
      });
      return;
    }

    try {
      await navigator.clipboard.writeText(keywordString);
      setCopiedKeywordString(true);
      
      toast({
        title: 'Copied to Clipboard',
        description: 'Keyword string copied successfully',
      });

      setTimeout(() => setCopiedKeywordString(false), 2000);
    } catch (error) {
      toast({
        title: 'Copy Failed',
        description: 'Failed to copy keyword string to clipboard',
        variant: 'destructive',
      });
    }
  }, [keywordString, toast]);

  const renderKeywordSection = (
    title: string, 
    keywords: string[], 
    color: string, 
    selectedKeywords: string[],
    onToggle: (keyword: string, checked: boolean) => void,
    onMove?: (keyword: string) => void,
    moveIcon?: React.ReactNode,
    moveLabel?: string,
    addKeywordInput?: {
      value: string;
      onChange: (value: string) => void;
      onAdd: () => void;
      onKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
      placeholder: string;
    }
  ) => {
    return (
      <div className="space-y-3" role="group" aria-label={title}>
        <Label className="text-sm font-medium">{title}</Label>
        
        {/* Add keyword input */}
        {addKeywordInput && (
          <div className="flex gap-2 mb-3">
            <Input
              type="text"
              value={addKeywordInput.value}
              onChange={(e) => addKeywordInput.onChange(e.target.value)}
              onKeyPress={addKeywordInput.onKeyPress}
              placeholder={addKeywordInput.placeholder}
              className="flex-1"
            />
            <Button
              onClick={addKeywordInput.onAdd}
              size="sm"
              variant="outline"
              disabled={!addKeywordInput.value.trim()}
            >
              <Plus className="h-4 w-4 mr-1" />
              Add
            </Button>
          </div>
        )}

        {keywords.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword) => (
              <div key={keyword} className="flex items-center space-x-2">
                <Checkbox
                  id={`keyword-${keyword}`}
                  checked={selectedKeywords.includes(keyword)}
                  onCheckedChange={(checked) => onToggle(keyword, checked as boolean)}
                  aria-label={`Select keyword: ${keyword}`}
                />
                <Badge variant="outline" className={`${color} cursor-pointer`}>
                  {keyword}
                </Badge>
                {onMove && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onMove(keyword)}
                    className="h-6 w-6 p-0"
                    aria-label={moveLabel}
                    title={moveLabel}
                  >
                    {moveIcon}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };



  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <Zap className="w-5 h-5 text-primary" />
          <span>Keyword Enhancement</span>
        </CardTitle>
        <CardDescription>
          Enhance keywords and generate search terms for better reviewer matching
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Enhancement Trigger */}
        {!enhancedKeywords && (
          <div className="space-y-4">
            {metadata?.keywords && metadata.keywords.length > 0 && (
              <div className="space-y-3">
                <Label className="text-sm font-medium">Original Keywords from Manuscript</Label>
                <div className="flex flex-wrap gap-2">
                  {metadata.keywords.map((keyword) => (
                    <Badge key={keyword} variant="secondary">
                      {keyword}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            <Button
              onClick={handleEnhanceKeywords}
              disabled={isEnhancing}
              className="w-full"
            >
              {isEnhancing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Enhancing Keywords...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 mr-2" />
                  Enhance Keywords
                </>
              )}
            </Button>
          </div>
        )}
        


        {/* Enhanced Keywords Display */}
        {enhancedKeywords && (
          <div className="space-y-6">
            {renderKeywordSection(
              "Primary Keywords",
              primaryKeywords,
              "bg-blue-50 text-blue-700 border-blue-200",
              selectedPrimaryKeywords,
              handlePrimaryKeywordToggle,
              movePrimaryToSecondary,
              <ArrowDown className="h-4 w-4" />,
              "Move to Secondary Keywords",
              {
                value: newPrimaryKeyword,
                onChange: setNewPrimaryKeyword,
                onAdd: addPrimaryKeyword,
                onKeyPress: handlePrimaryKeyPress,
                placeholder: "Add a primary keyword..."
              }
            )}

            {renderKeywordSection(
              "Secondary Keywords",
              secondaryKeywords,
              "bg-green-50 text-green-700 border-green-200",
              selectedSecondaryKeywords,
              handleSecondaryKeywordToggle,
              moveSecondaryToPrimary,
              <ArrowUp className="h-4 w-4" />,
              "Move to Primary Keywords",
              {
                value: newSecondaryKeyword,
                onChange: setNewSecondaryKeyword,
                onAdd: addSecondaryKeyword,
                onKeyPress: handleSecondaryKeyPress,
                placeholder: "Add a secondary keyword..."
              }
            )}

            <Separator />

            <div className="text-sm text-muted-foreground">
              {selectedPrimaryKeywords.length} primary and {selectedSecondaryKeywords.length} secondary keywords selected
            </div>

            {/* Keyword String Display */}
            {keywordString && (
              <Card className="bg-purple-50 border-purple-200">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-purple-900">Final Keyword String</CardTitle>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopyKeywordString}
                      className="h-8 w-8 p-0"
                      aria-label={copiedKeywordString ? 'Copied keyword string' : 'Copy keyword string to clipboard'}
                    >
                      {copiedKeywordString ? (
                        <Check className="h-4 w-4 text-green-600" aria-hidden="true" />
                      ) : (
                        <Copy className="h-4 w-4" aria-hidden="true" />
                      )}
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <code className="text-xs bg-white p-3 rounded block overflow-x-auto text-purple-900">
                    {keywordString}
                  </code>
                </CardContent>
              </Card>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};