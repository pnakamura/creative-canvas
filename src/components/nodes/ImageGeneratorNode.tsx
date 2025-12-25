import React from 'react';
import { NodeProps } from '@xyflow/react';
import { Image, Loader2 } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { Button } from '@/components/ui/button';
import { useFlowStore, NodeData } from '@/store/flowStore';
import { cn } from '@/lib/utils';

export const ImageGeneratorNode: React.FC<NodeProps> = (props) => {
  const { updateNodeData, getConnectedNodes } = useFlowStore();
  const nodeData = props.data as NodeData;
  const { isProcessing, imageUrl, error, settings } = nodeData;

  const handleGenerate = async () => {
    const { inputs } = getConnectedNodes(props.id);
    const promptInput = inputs.find((n) => n.data.type === 'assistant' || n.data.type === 'text');
    
    const promptText = promptInput?.data.type === 'assistant' 
      ? promptInput.data.prompt 
      : promptInput?.data.content;

    if (!promptText) {
      updateNodeData(props.id, { error: 'No prompt connected' });
      return;
    }

    updateNodeData(props.id, { isProcessing: true, error: undefined });

    // Simulate image generation (will be replaced with actual API)
    try {
      await new Promise((resolve) => setTimeout(resolve, 2500));
      
      // Placeholder image for demo
      const placeholderUrl = `https://picsum.photos/seed/${Date.now()}/512/512`;
      
      updateNodeData(props.id, {
        imageUrl: placeholderUrl,
        isProcessing: false,
        isComplete: true,
      });
    } catch (err) {
      updateNodeData(props.id, {
        error: 'Failed to generate image',
        isProcessing: false,
      });
    }
  };

  return (
    <BaseNode
      {...props}
      icon={Image}
      iconColor="text-handle-image"
      inputs={[{ id: 'prompt-in', type: 'text' }]}
      outputs={[{ id: 'image-out', type: 'image' }]}
    >
      <div className="space-y-3">
        {!imageUrl && !isProcessing && (
          <div className="aspect-square rounded-lg bg-background/50 border border-dashed border-border/50 flex items-center justify-center">
            <div className="text-center">
              <Image className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground/50">No image yet</p>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="aspect-square rounded-lg bg-background/50 border border-border/50 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-shimmer animate-shimmer" />
            <div className="relative z-10 text-center">
              <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Generating...</p>
            </div>
          </div>
        )}

        {imageUrl && !isProcessing && (
          <div className="aspect-square rounded-lg overflow-hidden border border-border/50">
            <img
              src={imageUrl}
              alt="Generated"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <Button
          onClick={(e) => {
            e.stopPropagation();
            handleGenerate();
          }}
          disabled={isProcessing}
          className={cn(
            'w-full gap-2',
            'bg-handle-image/20 hover:bg-handle-image/30 text-handle-image border border-handle-image/30'
          )}
          variant="outline"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating...
            </>
          ) : (
            <>
              <Image className="w-4 h-4" />
              Generate Image
            </>
          )}
        </Button>

        {settings && (
          <div className="flex gap-2 text-xs text-muted-foreground">
            <span className="px-2 py-0.5 rounded bg-muted/50">{settings.aspectRatio}</span>
            <span className="px-2 py-0.5 rounded bg-muted/50">CFG {settings.guidanceScale}</span>
          </div>
        )}

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}
      </div>
    </BaseNode>
  );
};
