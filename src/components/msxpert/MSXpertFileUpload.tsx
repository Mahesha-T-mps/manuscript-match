import React, { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, FileText, Download, Loader2, CheckCircle, AlertCircle, Wifi, WifiOff } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface MSXpertFileUploadProps {
  onLogout?: () => void;
}

interface EvaluationResult {
  message: string;
  json_report: any;
  html_report: string;
}

type UploadStatus = 'idle' | 'uploading' | 'processing' | 'completed' | 'error';

export const MSXpertFileUpload: React.FC<MSXpertFileUploadProps> = ({ onLogout }) => {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<UploadStatus>('idle');
  const [evaluationResult, setEvaluationResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<string>('');
  const [apiStatus, setApiStatus] = useState<'checking' | 'online' | 'offline'>('checking');
  const { toast } = useToast();

  // Check API server status on component mount
  useEffect(() => {
    const checkApiStatus = async () => {
      try {
        const response = await fetch('http://192.168.2.187:8001/health', {
          method: 'GET',
          signal: AbortSignal.timeout(5000) // 5 second timeout
        });
        setApiStatus(response.ok ? 'online' : 'offline');
      } catch {
        setApiStatus('offline');
      }
    };

    checkApiStatus();
  }, []);

  const handleFileSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Validate file type
      const allowedTypes = [
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
        'application/msword' // .doc
      ];
      
      if (!allowedTypes.includes(file.type) && !file.name.toLowerCase().endsWith('.doc') && !file.name.toLowerCase().endsWith('.docx')) {
        toast({
          title: 'Invalid File Type',
          description: 'Please select a Word document (.doc or .docx)',
          variant: 'destructive',
        });
        return;
      }

      setSelectedFile(file);
      setError(null);
      setEvaluationResult(null);
      setUploadStatus('idle');
      setUploadProgress('');
    }
  }, [toast]);

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
  }, []);

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      // Create a proper ChangeEvent-like object
      const fileInput = document.getElementById('file-input') as HTMLInputElement;
      if (fileInput) {
        // Create a new FileList-like object
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInput.files = dataTransfer.files;
        
        // Create a proper change event
        const changeEvent = new Event('change', { bubbles: true });
        Object.defineProperty(changeEvent, 'target', {
          writable: false,
          value: fileInput
        });
        
        handleFileSelect(changeEvent as unknown as React.ChangeEvent<HTMLInputElement>);
      }
    }
  }, [handleFileSelect]);

  const handleUpload = async () => {
    if (!selectedFile) return;

    setUploadStatus('uploading');
    setError(null);
    setUploadProgress('Preparing document...');

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      // Add timeout and better error handling
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 5 minute timeout

      setUploadProgress('Uploading document...');

      const response = await fetch('http://192.168.2.187:8001/evaluate_msxpert', {
        method: 'POST',
        body: formData,
        signal: controller.signal,
        headers: {
          // Don't set Content-Type, let browser set it with boundary for FormData
        }
      });

      clearTimeout(timeoutId);
      setUploadProgress('Processing document...');

      if (!response.ok) {
        let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
        
        try {
          const errorData = await response.json();
          errorMessage = errorData.detail || errorMessage;
        } catch {
          // If response is not JSON, use the status text
        }
        
        throw new Error(errorMessage);
      }

      setUploadProgress('Finalizing results...');
      const result: EvaluationResult = await response.json();
      setEvaluationResult(result);
      setUploadStatus('completed');
      
      toast({
        title: 'Evaluation Complete',
        description: 'Document has been successfully evaluated.',
      });

    } catch (err) {
      let errorMessage = 'Failed to evaluate document';
      
      if (err instanceof Error) {
        if (err.name === 'AbortError') {
          errorMessage = 'Request timed out. The document evaluation is taking too long.';
        } else if (err.message.includes('Failed to fetch') || err.message.includes('NetworkError')) {
          errorMessage = 'Cannot connect to the evaluation service. Please ensure the API server is running on port 8001.';
        } else {
          errorMessage = err.message;
        }
      }
      
      setError(errorMessage);
      setUploadStatus('error');
      
      toast({
        title: 'Evaluation Failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setUploadProgress('');
    }
  };

  const handleDownloadReport = () => {
    if (!evaluationResult?.html_report) return;

    const blob = new Blob([evaluationResult.html_report], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `msxpert_report_${selectedFile?.name?.replace(/\.[^/.]+$/, '')}_${new Date().toISOString().slice(0, 10)}.html`;
    document.body.appendChild(link);
    link.click();
    link.remove(); // Use remove() instead of removeChild()
    URL.revokeObjectURL(url);

    toast({
      title: 'Report Downloaded',
      description: 'HTML report has been downloaded successfully.',
    });
  };

  const handleReset = () => {
    setSelectedFile(null);
    setEvaluationResult(null);
    setError(null);
    setUploadStatus('idle');
    setUploadProgress('');
  };

  const isUploading = uploadStatus === 'uploading' || uploadStatus === 'processing';

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-academic-light">
      {/* Header */}
      <header className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <h1 className="text-xl font-bold">MSXpert Document Evaluator</h1>
              
              {/* API Status Indicator */}
              <div className="flex items-center space-x-2 text-sm">
                {apiStatus === 'checking' && (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-gray-500" />
                    <span className="text-gray-500">Checking API...</span>
                  </>
                )}
                {apiStatus === 'online' && (
                  <>
                    <Wifi className="w-4 h-4 text-green-500" />
                    <span className="text-green-600">API Online</span>
                  </>
                )}
                {apiStatus === 'offline' && (
                  <>
                    <WifiOff className="w-4 h-4 text-red-500" />
                    <span className="text-red-600">API Offline</span>
                  </>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.location.href = '/apps'}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Application Portal
              </Button>
              <Button variant="ghost" size="sm" onClick={onLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="space-y-8">
          {/* Upload Section */}
          {uploadStatus !== 'completed' && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="w-5 h-5" />
                  <span>Upload Document</span>
                </CardTitle>
                <CardDescription>
                  Upload a Word document (.doc or .docx) for evaluation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* File Drop Zone */}
                <button
                  type="button"
                  className={`w-full border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                    isUploading 
                      ? 'border-blue-300 bg-blue-50 cursor-not-allowed' 
                      : 'border-gray-300 hover:border-gray-400 cursor-pointer'
                  }`}
                  onDragOver={handleDragOver}
                  onDrop={handleDrop}
                  onClick={() => !isUploading && document.getElementById('file-input')?.click()}
                  disabled={isUploading}
                  aria-label="Click to select file or drag and drop file here"
                >
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-lg font-medium text-gray-900 mb-2">
                    {selectedFile ? selectedFile.name : 'Drop your document here'}
                  </p>
                  <p className="text-sm text-gray-500">
                    {selectedFile 
                      ? `File size: ${(selectedFile.size / 1024 / 1024).toFixed(2)} MB`
                      : 'or click to browse files'
                    }
                  </p>
                  <input
                    id="file-input"
                    type="file"
                    accept=".doc,.docx"
                    onChange={handleFileSelect}
                    className="hidden"
                    disabled={isUploading}
                  />
                </button>

                {/* Progress Display */}
                {isUploading && uploadProgress && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 flex items-center space-x-3">
                    <Loader2 className="w-5 h-5 text-blue-500 animate-spin flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-800">Processing Document</h4>
                      <p className="text-sm text-blue-700 mt-1">{uploadProgress}</p>
                      <p className="text-xs text-blue-600 mt-1">This may take several minutes depending on document complexity...</p>
                    </div>
                  </div>
                )}

                {/* Error Display */}
                {error && uploadStatus === 'error' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-start space-x-3">
                    <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-sm font-medium text-red-800">Evaluation Failed</h4>
                      <p className="text-sm text-red-700 mt-1">{error}</p>
                      <p className="text-xs text-red-600 mt-2">
                        Please check that the API server is running on port 8001 and try again.
                      </p>
                    </div>
                  </div>
                )}

                {/* Upload Button */}
                <div className="flex justify-center">
                  <Button
                    onClick={handleUpload}
                    disabled={!selectedFile || isUploading}
                    size="lg"
                    className="min-w-[200px]"
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        {uploadProgress || 'Evaluating...'}
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4 mr-2" />
                        Evaluate Document
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Results Section */}
          {uploadStatus === 'completed' && evaluationResult && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span>Evaluation Complete</span>
                </CardTitle>
                <CardDescription>
                  Document evaluation has been completed successfully
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Success Message */}
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <p className="text-sm text-green-800">
                    {evaluationResult.message}
                  </p>
                </div>

                {/* File Info */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-2">Evaluated File</h4>
                  <p className="text-sm text-gray-600">{selectedFile?.name}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Generated on: {evaluationResult.json_report?.generation_time}
                  </p>
                  <p className="text-xs text-gray-500">
                    Processing time: {evaluationResult.json_report?.time_taken}
                  </p>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center space-x-4">
                  <Button
                    onClick={handleDownloadReport}
                    size="lg"
                    className="min-w-[200px]"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download HTML Report
                  </Button>
                  
                  <Button
                    onClick={handleReset}
                    variant="outline"
                    size="lg"
                  >
                    Evaluate Another Document
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};