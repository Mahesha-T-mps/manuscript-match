/**
 * Simple ValidationStep Component - Minimal version for debugging
 */

import React, { useState } from 'react';
import { StepComponentProps } from '../../types/workflow';

interface ValidationStepProps extends StepComponentProps {}

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
  },
  {
    id: 'Coauthor',
    label: 'Coauthor Analysis',
    description: 'Check for coauthorship with manuscript authors'
  },
  {
    id: 'Conflict of Interest',
    label: 'Conflict of Interest',
    description: 'Detect potential conflicts of interest with manuscript authors'
  },
  {
    id: 'Affiliation/Country match',
    label: 'Affiliation/Country Match',
    description: 'Verify affiliation and country consistency'
  },
  {
    id: 'Study Type Detection',
    label: 'Study Type Detection',
    description: 'Analyze study types in author publications'
  },
  {
    id: 'Sanction Country',
    label: 'Sanction Country Check',
    description: 'Check if author is from a sanctioned country'
  }
];

export const ValidationStepSimple: React.FC<ValidationStepProps> = ({
  processId,
  jobId,
  onNext,
  onPrevious,
  isLoading: externalLoading = false,
  stepData
}) => {
  const [selectedConditions, setSelectedConditions] = useState<string[]>([
    'Publications',
    'Coauthor',
    'Conflict of Interest',
    'Affiliation/Country match'
  ]);

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

  const handleValidateAuthors = () => {
    alert(`Validating authors with conditions:\n${selectedConditions.join('\n')}`);
  };

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      {/* Big visible header */}
      <div style={{
        backgroundColor: '#007bff',
        color: 'white',
        padding: '20px',
        textAlign: 'center',
        fontSize: '24px',
        fontWeight: 'bold',
        marginBottom: '20px'
      }}>
        🎯 VALIDATION STEP - SIMPLE VERSION
      </div>

      {/* Debug info */}
      <div style={{
        backgroundColor: '#f8f9fa',
        border: '1px solid #dee2e6',
        padding: '15px',
        marginBottom: '20px'
      }}>
        <strong>Debug Info:</strong><br />
        Process ID: {processId}<br />
        Job ID: {jobId}<br />
        Selected Conditions: {selectedConditions.length}<br />
        Total Conditions: {VALIDATION_CONDITIONS.length}
      </div>

      {/* Validation Conditions */}
      <div style={{
        border: '2px solid #28a745',
        padding: '20px',
        marginBottom: '20px'
      }}>
        <h2 style={{ color: '#28a745', marginBottom: '15px' }}>
          📋 Validation Conditions
        </h2>
        <p style={{ marginBottom: '15px' }}>
          Select which validation conditions to apply to the authors:
        </p>

        {/* Select All/None buttons */}
        <div style={{ marginBottom: '20px' }}>
          <button
            onClick={handleSelectAll}
            style={{
              backgroundColor: '#007bff',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              marginRight: '10px',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
          >
            Select All
          </button>
          <button
            onClick={handleSelectNone}
            style={{
              backgroundColor: '#6c757d',
              color: 'white',
              border: 'none',
              padding: '8px 16px',
              marginRight: '10px',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
          >
            Select None
          </button>
          <span style={{ color: '#6c757d' }}>
            {selectedConditions.length} of {VALIDATION_CONDITIONS.length} selected
          </span>
        </div>

        {/* Condition checkboxes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px' }}>
          {VALIDATION_CONDITIONS.map((condition) => (
            <div
              key={condition.id}
              style={{
                border: '1px solid #dee2e6',
                padding: '15px',
                borderRadius: '4px',
                backgroundColor: selectedConditions.includes(condition.id) ? '#e7f3ff' : '#fff'
              }}
            >
              <label style={{ display: 'flex', alignItems: 'flex-start', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={selectedConditions.includes(condition.id)}
                  onChange={(e) => handleConditionToggle(condition.id, e.target.checked)}
                  style={{ marginRight: '10px', marginTop: '2px' }}
                />
                <div>
                  <strong>{condition.label}</strong>
                  <br />
                  <small style={{ color: '#6c757d' }}>{condition.description}</small>
                </div>
              </label>
            </div>
          ))}
        </div>

        {/* Validate Authors Button */}
        <div style={{ marginTop: '20px', textAlign: 'center' }}>
          <button
            onClick={handleValidateAuthors}
            disabled={selectedConditions.length === 0}
            style={{
              backgroundColor: selectedConditions.length === 0 ? '#ccc' : '#28a745',
              color: 'white',
              border: 'none',
              padding: '15px 30px',
              fontSize: '18px',
              cursor: selectedConditions.length === 0 ? 'not-allowed' : 'pointer',
              borderRadius: '4px',
              width: '100%'
            }}
          >
            🎯 Validate Authors ({selectedConditions.length} conditions selected)
          </button>
          {selectedConditions.length === 0 && (
            <p style={{ color: '#dc3545', marginTop: '10px' }}>
              Please select at least one validation condition to proceed
            </p>
          )}
        </div>
      </div>

      {/* Navigation */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '20px' }}>
        <button
          onClick={onPrevious}
          style={{
            backgroundColor: '#6c757d',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            cursor: 'pointer',
            borderRadius: '4px'
          }}
        >
          ← Previous
        </button>
        <button
          onClick={() => onNext({ selectedConditions })}
          style={{
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            padding: '10px 20px',
            cursor: 'pointer',
            borderRadius: '4px'
          }}
        >
          Next →
        </button>
      </div>
    </div>
  );
};

export default ValidationStepSimple;