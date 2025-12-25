import React, { useState, useCallback } from 'react';
import { NodeProps } from '@xyflow/react';
import { Upload, Link, HardDrive, FileText, Image, File, X, Eye, Loader2 } from 'lucide-react';
import { useDropzone } from 'react-dropzone';
import { BaseNode } from './BaseNode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useFlowStore, NodeData } from '@/store/flowStore';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const ACCEPTED_FILES = {
  'application/pdf': ['.pdf'],
  'text/plain': ['.txt'],
  'text/markdown': ['.md'],
  'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
};

export const ReferenceNode: React.FC<NodeProps> = (props) => {
  const { updateNodeData } = useFlowStore();
  const nodeData = props.data as NodeData;
  const { assetUrl, assetType, fileName, isProcessing, error } = nodeData;
  const { toast } = useToast();
  
  const [linkUrl, setLinkUrl] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);

  const getAssetType = (file: File): 'image' | 'pdf' | 'text' => {
    if (file.type.startsWith('image/')) return 'image';
    if (file.type === 'application/pdf') return 'pdf';
    return 'text';
  };

  const uploadFile = async (file: File) => {
    setIsUploading(true);
    updateNodeData(props.id, { isProcessing: true, error: undefined });

    try {
      const fileExt = file.name.split('.').pop();
      const filePath = `${Date.now()}-${Math.random().toString(36).substring(7)}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('user_assets')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage
        .from('user_assets')
        .getPublicUrl(filePath);

      const type = getAssetType(file);
      
      updateNodeData(props.id, {
        assetUrl: urlData.publicUrl,
        assetType: type,
        fileName: file.name,
        isProcessing: false,
        isComplete: true,
      });

      // If it's a text-based file, extract content
      if (type === 'text' || type === 'pdf') {
        extractTextContent(urlData.publicUrl, type, file.name);
      }

      toast({
        title: 'File uploaded',
        description: `${file.name} has been uploaded successfully`,
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed';
      updateNodeData(props.id, {
        error: errorMessage,
        isProcessing: false,
      });
      toast({
        title: 'Upload failed',
        description: errorMessage,
        variant: 'destructive',
      });
    } finally {
      setIsUploading(false);
    }
  };

  const extractTextContent = async (url: string, type: 'pdf' | 'text', name: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('extract-text', {
        body: { url, type, fileName: name },
      });

      if (error) throw error;

      if (data?.text) {
        updateNodeData(props.id, { extractedText: data.text });
      }
    } catch (err) {
      console.error('Text extraction failed:', err);
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
    disabled: isUploading,
  });

  const handleLinkSubmit = () => {
    if (!linkUrl.trim()) return;

    const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(linkUrl);
    
    updateNodeData(props.id, {
      assetUrl: linkUrl,
      assetType: isImage ? 'image' : 'link',
      fileName: linkUrl.split('/').pop() || 'External Link',
      isComplete: true,
    });

    toast({
      title: 'Link added',
      description: 'External URL has been linked',
    });
    setLinkUrl('');
  };

  const handleDriveConnect = () => {
    toast({
      title: 'Google Drive',
      description: 'Google Drive integration coming soon. OAuth setup required.',
    });
  };

  const clearAsset = () => {
    updateNodeData(props.id, {
      assetUrl: undefined,
      assetType: undefined,
      fileName: undefined,
      extractedText: undefined,
      isComplete: false,
    });
  };

  const renderAssetPreview = () => {
    if (!assetUrl) return null;

    return (
      <div className="relative group mt-3 p-2 rounded-lg bg-background/50 border border-border/50">
        <div className="flex items-center gap-2">
          {assetType === 'image' ? (
            <div className="w-12 h-12 rounded overflow-hidden bg-muted flex-shrink-0">
              <img src={assetUrl} alt={fileName} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-12 h-12 rounded bg-muted flex items-center justify-center flex-shrink-0">
              {assetType === 'pdf' ? (
                <FileText className="w-6 h-6 text-destructive" />
              ) : (
                <File className="w-6 h-6 text-primary" />
              )}
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium text-foreground truncate">{fileName}</p>
            <p className="text-[10px] text-muted-foreground uppercase">{assetType}</p>
          </div>
          <div className="flex gap-1">
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6"
              onClick={(e) => {
                e.stopPropagation();
                setPreviewOpen(true);
              }}
            >
              <Eye className="w-3 h-3" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-6 w-6 text-destructive hover:text-destructive"
              onClick={(e) => {
                e.stopPropagation();
                clearAsset();
              }}
            >
              <X className="w-3 h-3" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <BaseNode
        {...props}
        icon={File}
        iconColor="text-green-400"
        nodeCategory="source"
        inputs={[]}
        outputs={[
          { id: 'asset-out', type: 'image', label: 'Asset' },
          { id: 'context-out', type: 'text', label: 'Context' },
        ]}
      >
        <div className="space-y-2">
          {isUploading ? (
            <div className="flex flex-col items-center justify-center py-6 gap-2">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <p className="text-xs text-muted-foreground">Uploading...</p>
            </div>
          ) : assetUrl ? (
            renderAssetPreview()
          ) : (
            <Tabs defaultValue="upload" className="w-full">
              <TabsList className="grid w-full grid-cols-3 h-8">
                <TabsTrigger value="upload" className="text-xs px-2">
                  <Upload className="w-3 h-3 mr-1" />
                  Upload
                </TabsTrigger>
                <TabsTrigger value="link" className="text-xs px-2">
                  <Link className="w-3 h-3 mr-1" />
                  Link
                </TabsTrigger>
                <TabsTrigger value="drive" className="text-xs px-2">
                  <HardDrive className="w-3 h-3 mr-1" />
                  Drive
                </TabsTrigger>
              </TabsList>
              
              <TabsContent value="upload" className="mt-2">
                <div
                  {...getRootProps()}
                  className={cn(
                    'dropzone cursor-pointer',
                    isDragActive && 'dragging'
                  )}
                >
                  <input {...getInputProps()} />
                  <div className="flex flex-col items-center gap-1 py-2">
                    <Upload className="w-5 h-5 text-muted-foreground" />
                    <p className="text-[10px] text-muted-foreground">
                      Drop PDF, TXT, MD, or Image
                    </p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="link" className="mt-2 space-y-2">
                <Input
                  type="url"
                  placeholder="https://..."
                  value={linkUrl}
                  onChange={(e) => setLinkUrl(e.target.value)}
                  className="h-8 text-xs"
                  onClick={(e) => e.stopPropagation()}
                />
                <Button
                  size="sm"
                  className="w-full h-7 text-xs"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleLinkSubmit();
                  }}
                  disabled={!linkUrl.trim()}
                >
                  Add Link
                </Button>
              </TabsContent>
              
              <TabsContent value="drive" className="mt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full h-8 text-xs gap-2"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDriveConnect();
                  }}
                >
                  <HardDrive className="w-4 h-4" />
                  Connect Google Drive
                </Button>
              </TabsContent>
            </Tabs>
          )}

          {error && (
            <p className="text-xs text-destructive">{error}</p>
          )}
        </div>
      </BaseNode>

      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{fileName}</DialogTitle>
          </DialogHeader>
          <div className="mt-4">
            {assetType === 'image' ? (
              <img src={assetUrl} alt={fileName} className="w-full h-auto rounded-lg" />
            ) : assetType === 'pdf' ? (
              <iframe src={assetUrl} className="w-full h-[70vh] rounded-lg" title={fileName} />
            ) : (
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm whitespace-pre-wrap">{nodeData.extractedText || 'Loading content...'}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};
