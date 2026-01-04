import React, { useState, useCallback } from 'react';
import { NodeProps } from '@xyflow/react';
import { Upload, FileText, File, X, Eye, Loader2, CheckCircle2, AlertCircle, FileCode, FileType } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { BaseNode } from './BaseNode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Progress } from '@/components/ui/progress';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { useFlowStore, NodeData } from '@/store/flowStore';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ACCEPTED_FILES = {
  'application/pdf': ['.pdf'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'text/html': ['.html', '.htm'],
};

interface FileMetadata {
  fileName: string;
  fileType: string;
  pages?: number;
  characterCount: number;
  wordCount: number;
  extractedAt: string;
}

const FILE_TYPE_CONFIG: Record<string, { label: string; badgeClass: string; iconClass: string }> = {
  pdf: { 
    label: 'PDF', 
    badgeClass: 'bg-red-500/20 text-red-400 border-red-500/30 hover:bg-red-500/30',
    iconClass: 'text-red-400'
  },
  docx: { 
    label: 'DOCX', 
    badgeClass: 'bg-blue-500/20 text-blue-400 border-blue-500/30 hover:bg-blue-500/30',
    iconClass: 'text-blue-400'
  },
  text: { 
    label: 'TXT', 
    badgeClass: 'bg-gray-500/20 text-gray-400 border-gray-500/30 hover:bg-gray-500/30',
    iconClass: 'text-gray-400'
  },
  markdown: { 
    label: 'MD', 
    badgeClass: 'bg-purple-500/20 text-purple-400 border-purple-500/30 hover:bg-purple-500/30',
    iconClass: 'text-purple-400'
  },
  html: { 
    label: 'HTML', 
    badgeClass: 'bg-orange-500/20 text-orange-400 border-orange-500/30 hover:bg-orange-500/30',
    iconClass: 'text-orange-400'
  },
};

export const FileUploadNode: React.FC<NodeProps> = (props) => {
  const { updateNodeData } = useFlowStore();
  const nodeData = props.data as NodeData;
  const { 
    fileUploadData,
    isProcessing, 
    isComplete,
    error 
  } = nodeData;
  
  const [uploadProgress, setUploadProgress] = useState(0);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [isExtracting, setIsExtracting] = useState(false);

  const getFileTypeConfig = (type?: string) => {
    return FILE_TYPE_CONFIG[type || 'text'] || FILE_TYPE_CONFIG.text;
  };

  const getFileTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      'pdf': 'PDF Document',
      'docx': 'Word Document',
      'text': 'Text File',
      'markdown': 'Markdown',
      'html': 'HTML Document',
    };
    return labels[type] || 'Document';
  };

  const getFileIcon = (type?: string, size: 'sm' | 'lg' = 'lg') => {
    const config = getFileTypeConfig(type);
    const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-6 h-6';
    
    switch (type) {
      case 'pdf':
        return <FileText className={cn(sizeClass, config.iconClass)} />;
      case 'docx':
        return <FileText className={cn(sizeClass, config.iconClass)} />;
      case 'markdown':
        return <FileType className={cn(sizeClass, config.iconClass)} />;
      case 'html':
        return <FileCode className={cn(sizeClass, config.iconClass)} />;
      default:
        return <File className={cn(sizeClass, config.iconClass)} />;
    }
  };

  const uploadFile = async (file: File) => {
    setUploadProgress(10);
    updateNodeData(props.id, { isProcessing: true, error: undefined });

    try {
      // Simulate upload progress
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => Math.min(prev + 10, 40));
      }, 200);

      const fileExt = file.name.split('.').pop();
      const filePath = `documents/${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('user_assets')
        .upload(filePath, file);

      clearInterval(progressInterval);
      setUploadProgress(50);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('user_assets')
        .getPublicUrl(filePath);

      // Determine file type
      let fileType = 'text';
      if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
        fileType = 'pdf';
      } else if (file.type.includes('wordprocessingml') || file.name.endsWith('.docx')) {
        fileType = 'docx';
      } else if (file.name.endsWith('.md') || file.name.endsWith('.markdown')) {
        fileType = 'markdown';
      } else if (file.name.endsWith('.html') || file.name.endsWith('.htm')) {
        fileType = 'html';
      }

      // Update with file info
      updateNodeData(props.id, {
        fileUploadData: {
          fileName: file.name,
          fileType,
          fileSize: file.size,
          fileUrl: urlData.publicUrl,
        },
      });

      setUploadProgress(60);

      // Extract text content
      await extractTextContent(urlData.publicUrl, fileType, file.name);

      toast.success(`${file.name} uploaded and processed`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      updateNodeData(props.id, {
        error: errorMessage,
        isProcessing: false,
      });
      toast.error(errorMessage);
    } finally {
      setUploadProgress(0);
    }
  };

  const extractTextContent = async (url: string, type: string, name: string) => {
    setIsExtracting(true);
    setUploadProgress(70);

    try {
      const { data, error } = await supabase.functions.invoke('extract-text', {
        body: { url, type, fileName: name },
      });

      setUploadProgress(90);

      if (error) throw error;

      const metadata: FileMetadata = data?.metadata || {
        fileName: name,
        fileType: type,
        characterCount: data?.text?.length || 0,
        wordCount: data?.text?.split(/\s+/).filter((w: string) => w).length || 0,
        extractedAt: new Date().toISOString(),
      };

      updateNodeData(props.id, {
        fileUploadData: {
          ...nodeData.fileUploadData,
          extractedText: data?.text || '',
          metadata,
        },
        extractedText: data?.text || '', // Also set at node level for compatibility
        isProcessing: false,
        isComplete: true,
      });

      setUploadProgress(100);
    } catch (err) {
      console.error('Text extraction failed:', err);
      updateNodeData(props.id, {
        error: 'Text extraction failed',
        isProcessing: false,
      });
    } finally {
      setIsExtracting(false);
      setTimeout(() => setUploadProgress(0), 500);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      uploadFile(file);
    }
  }, [props.id]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: ACCEPTED_FILES,
    maxFiles: 1,
    disabled: isProcessing,
    maxSize: 20 * 1024 * 1024, // 20MB
  });

  const handleRunExtraction = async () => {
    if (!fileUploadData?.fileUrl) return;
    
    updateNodeData(props.id, { isProcessing: true, error: undefined });
    await extractTextContent(
      fileUploadData.fileUrl, 
      fileUploadData.fileType || 'text', 
      fileUploadData.fileName || 'document'
    );
  };

  const clearFile = () => {
    updateNodeData(props.id, {
      fileUploadData: undefined,
      extractedText: undefined,
      isComplete: false,
      error: undefined,
    });
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const getTextPreview = (): string => {
    const text = fileUploadData?.extractedText || '';
    if (text.length <= 300) return text;
    return text.substring(0, 300) + '...';
  };

  const renderFileInfo = () => {
    if (!fileUploadData?.fileName) return null;

    const metadata = fileUploadData.metadata;
    const typeConfig = getFileTypeConfig(fileUploadData.fileType);
    const fileName = fileUploadData.fileName;
    const isLongName = fileName.length > 20;

    return (
      <div className="space-y-2">
        {/* File Header with Type Badge */}
        <div className={cn(
          "flex items-center gap-3 p-2.5 rounded-lg border transition-colors",
          "bg-background/50",
          fileUploadData.fileType === 'pdf' && "border-red-500/30",
          fileUploadData.fileType === 'docx' && "border-blue-500/30",
          fileUploadData.fileType === 'markdown' && "border-purple-500/30",
          fileUploadData.fileType === 'html' && "border-orange-500/30",
          fileUploadData.fileType === 'text' && "border-gray-500/30",
          !fileUploadData.fileType && "border-border/50"
        )}>
          {/* Icon with colored background */}
          <div className={cn(
            "w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0",
            fileUploadData.fileType === 'pdf' && "bg-red-500/10",
            fileUploadData.fileType === 'docx' && "bg-blue-500/10",
            fileUploadData.fileType === 'markdown' && "bg-purple-500/10",
            fileUploadData.fileType === 'html' && "bg-orange-500/10",
            fileUploadData.fileType === 'text' && "bg-gray-500/10",
            !fileUploadData.fileType && "bg-muted"
          )}>
            {getFileIcon(fileUploadData.fileType, 'lg')}
          </div>
          
          <div className="flex-1 min-w-0">
            {/* File name with tooltip for long names */}
            {isLongName ? (
              <Tooltip>
                <TooltipTrigger asChild>
                  <p className="text-xs font-medium text-foreground truncate cursor-default">
                    {fileName}
                  </p>
                </TooltipTrigger>
                <TooltipContent side="top" className="max-w-xs">
                  <p className="break-all">{fileName}</p>
                </TooltipContent>
              </Tooltip>
            ) : (
              <p className="text-xs font-medium text-foreground truncate">
                {fileName}
              </p>
            )}
            
            {/* Type badge and file size */}
            <div className="flex items-center gap-2 mt-1">
              <Badge 
                variant="outline" 
                className={cn("text-[9px] px-1.5 py-0 h-4 font-semibold", typeConfig.badgeClass)}
              >
                {typeConfig.label}
              </Badge>
              {fileUploadData.fileSize && (
                <span className="text-[10px] text-muted-foreground">
                  {formatFileSize(fileUploadData.fileSize)}
                </span>
              )}
            </div>
          </div>
          
          {/* Action buttons */}
          <div className="flex gap-1 flex-shrink-0">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="nodrag h-7 w-7"
                  onClick={(e) => {
                    e.stopPropagation();
                    setPreviewOpen(true);
                  }}
                >
                  <Eye className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Preview</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="icon"
                  variant="ghost"
                  className="nodrag h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    clearFile();
                  }}
                >
                  <X className="w-3.5 h-3.5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent side="top">Remove file</TooltipContent>
            </Tooltip>
          </div>
        </div>

        {/* Metadata stats */}
        {metadata && (
          <div className="flex items-center gap-3 text-[10px] text-muted-foreground px-1">
            <div className="flex items-center gap-1">
              <span className="text-foreground/80 font-medium">{metadata.characterCount.toLocaleString()}</span>
              <span>chars</span>
            </div>
            <span className="text-border">•</span>
            <div className="flex items-center gap-1">
              <span className="text-foreground/80 font-medium">{metadata.wordCount.toLocaleString()}</span>
              <span>words</span>
            </div>
            {metadata.pages && (
              <>
                <span className="text-border">•</span>
                <div className="flex items-center gap-1">
                  <span className="text-foreground/80 font-medium">{metadata.pages}</span>
                  <span>pages</span>
                </div>
              </>
            )}
          </div>
        )}

        {/* Text Preview */}
        {fileUploadData.extractedText && (
          <div className="p-2 rounded-lg bg-muted/50 border border-border/30">
            <p className="text-[10px] text-muted-foreground line-clamp-3 leading-relaxed">
              {getTextPreview()}
            </p>
          </div>
        )}

        {/* Status indicator */}
        <div className="flex items-center gap-1.5 text-[10px] px-1">
          {isComplete ? (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
              <span className="text-green-500 font-medium">Extracted successfully</span>
            </>
          ) : error ? (
            <>
              <AlertCircle className="w-3.5 h-3.5 text-destructive" />
              <span className="text-destructive">{error}</span>
            </>
          ) : null}
        </div>
      </div>
    );
  };

  return (
    <>
      <BaseNode
        {...props}
        icon={Upload}
        iconColor="text-emerald-400"
        fixedDescription="Upload documents for RAG pipeline"
        nodeCategory="source"
        inputs={[]}
        outputs={[
          { id: 'text-out', type: 'text', label: 'Text' },
        ]}
      >
        <div className="space-y-2 min-w-[200px]">
          {isProcessing || uploadProgress > 0 ? (
            <div className="flex flex-col items-center justify-center py-4 gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <div className="w-full space-y-1">
                <Progress value={uploadProgress} className="h-1.5" />
                <p className="text-[10px] text-muted-foreground text-center">
                  {uploadProgress < 50 ? 'Uploading...' : isExtracting ? 'Extracting text...' : 'Processing...'}
                </p>
              </div>
            </div>
          ) : fileUploadData?.fileName ? (
            renderFileInfo()
          ) : (
            <div
              {...getRootProps()}
              className={cn(
                'nodrag border-2 border-dashed rounded-lg p-4 cursor-pointer transition-colors',
                'border-border/50 hover:border-primary/50 hover:bg-primary/5',
                isDragActive && 'border-primary bg-primary/10'
              )}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center gap-2 text-center">
                <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
                  <Upload className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <p className="text-xs font-medium text-foreground">
                    {isDragActive ? 'Drop file here' : 'Upload Document'}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">
                    PDF, DOCX, TXT, MD, HTML
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Max 20MB
                  </p>
                </div>
              </div>
            </div>
          )}

          {error && !fileUploadData && (
            <p className="text-xs text-destructive text-center">{error}</p>
          )}
        </div>
      </BaseNode>

      {/* Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {getFileIcon(fileUploadData?.fileType)}
              {fileUploadData?.fileName}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="h-[70vh] mt-4">
            <div className="space-y-4">
              {/* Metadata summary */}
              {fileUploadData?.metadata && (
                <div className="flex gap-4 text-sm text-muted-foreground border-b border-border pb-3">
                  <span>{getFileTypeLabel(fileUploadData.fileType || 'text')}</span>
                  <span>{fileUploadData.metadata.characterCount.toLocaleString()} characters</span>
                  <span>{fileUploadData.metadata.wordCount.toLocaleString()} words</span>
                </div>
              )}
              
              {/* Extracted text */}
              <div className="p-4 bg-muted rounded-lg">
                <pre className="text-sm whitespace-pre-wrap font-mono">
                  {fileUploadData?.extractedText || 'No text extracted yet.'}
                </pre>
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
};
