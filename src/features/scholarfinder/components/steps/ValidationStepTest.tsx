/**
 * Simple test version of ValidationStep to debug the conditions display issue
 */

import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Settings } from 'lucide-react';

// Available validation conditions from backend
const VALIDATION_CONDITIONS = [
  {
    id: 'Publications',
    label: 'Publications',
    description: 'Check publication count in last 10 years (≥8) and last 5 years, last 2 years and last year'
  },
  {
    id: 'First/Last Author in publications',
    label: 'First/Last Author Publications',
    description: 'Analyze first and last author publications'
  },
  {
    id: 'Relevant Publications',
    label: 'Relevant Publications',
    description: 'Check relevant publications in last 5 years and last 2 years'
  },
  {
    id: 'Publication Types',
    label: 'Publication Types',
    description: 'Analyze publication types of Clinical Trial, Clinical Study, Case Report and Retracted Publication if any'
  },
  {
    id: 'T&F Publications last year',
    label: 'Taylor & Francis Publications',
    description: 'Check Taylor & Francis publications in the last year'
  }
];

export const ValidationStepTest: React.FC = () => {
  const [selectedConditions, setSelectedConditions] = useState<string[]>([]);

  const handleConditionToggle = (conditionId: string, checked: boolean) => {
    setSelectedConditions(prev => {
      if (checked) {
        return [...prev, conditionId];
      } else {
        return prev.filter(id => id !== conditionId);
      }
    });
  };

  const handleSelectAll = () => {
    setSelectedConditions(VALIDATION_CONDITIONS.map(c => c.id));
  };

  const handleSelectNone = () => {
    setSelectedConditions([]);
  };

  return (
    <div className="space-y-6 p-6">
      <h1 className="text-2xl font-bold">Validation Step Test</h1>
      
      {/* Simple test card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Settings className="h-5 w-5 text-green-600" />
            <span>Validation Conditions Test</span>
          </CardTitle>
          <CardDescription>
            Testing validation conditions display
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Debug info */}
          <div className="text-xs text-gray-500 mb-2 p-2 bg-yellow-50 border border-yellow-200 rounded">
            Debug: conditions count = {VALIDATION_CONDITIONS.length}, 
            selected = {selectedConditions.length}
          </div>
          
          {/* Select All/None buttons */}
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectAll}
            >
              Select All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleSelectNone}
            >
              Select None
            </Button>
            <div className="ml-auto text-sm text-muted-foreground">
              {selectedConditions.length} of {VALIDATION_CONDITIONS.length} selected
            </div>
          </div>

          {/* Test: Simple list first */}
          <div className="mb-4 p-2 bg-blue-50 border border-blue-200 rounded">
            <h4 className="font-medium mb-2">Simple List Test:</h4>
            {VALIDATION_CONDITIONS.map((condition, index) => (
              <div key={condition.id} className="text-sm">
                {index + 1}. {condition.label}
              </div>
            ))}
          </div>

          {/* Test: Checkboxes */}
          <div className="space-y-2">
            <h4 className="font-medium">Checkbox Test:</h4>
            {VALIDATION_CONDITIONS.map((condition) => (
              <div
                key={condition.id}
                className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50"
              >
                <Checkbox
                  id={condition.id}
                  checked={selectedConditions.includes(condition.id)}
                  onCheckedChange={(checked) => 
                    handleConditionToggle(condition.id, checked as boolean)
                  }
                />
                <div className="flex-1 space-y-1">
                  <label
                    htmlFor={condition.id}
                    className="text-sm font-medium leading-none cursor-pointer"
                  >
                    {condition.label}
                  </label>
                  <p className="text-xs text-muted-foreground">
                    {condition.description}
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Selected conditions display */}
          <div className="mt-4 p-2 bg-green-50 border border-green-200 rounded">
            <h4 className="font-medium mb-2">Selected Conditions:</h4>
            {selectedConditions.length === 0 ? (
              <p className="text-sm text-gray-500">None selected</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {selectedConditions.map((conditionId) => (
                  <span
                    key={conditionId}
                    className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
                  >
                    {conditionId}
                  </span>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ValidationStepTest;