import React from 'react';
import { NodeProps } from '@xyflow/react';
import { Video, Loader2, Play } from 'lucide-react';
import { BaseNode } from './BaseNode';
import { Button } from '@/components/ui/button';
import { useFlowStore, NodeData } from '@/store/flowStore';
import { cn } from '@/lib/utils';

export const VideoGeneratorNode: React.FC<NodeProps> = (props) => {
  const { updateNodeData, getConnectedNodes } = useFlowStore();
  const nodeData = props.data as NodeData;
  const { isProcessing, videoUrl, imageUrl, error } = nodeData;

  const handleGenerate = async () => {
    const { inputs } = getConnectedNodes(props.id);
    const imageInput = inputs.find((n) => n.data.type === 'imageGenerator');

    if (!imageInput?.data.imageUrl) {
      updateNodeData(props.id, { error: 'No image connected' });
      return;
    }

    updateNodeData(props.id, { 
      isProcessing: true, 
      error: undefined,
      imageUrl: imageInput.data.imageUrl 
    });

    // Simulate video generation (placeholder)
    try {
      await new Promise((resolve) => setTimeout(resolve, 4000));
      
      updateNodeData(props.id, {
        videoUrl: 'placeholder-video',
        isProcessing: false,
        isComplete: true,
      });
    } catch (err) {
      updateNodeData(props.id, {
        error: 'Failed to generate video',
        isProcessing: false,
      });
    }
  };

  return (
    <BaseNode
      {...props}
      icon={Video}
      iconColor="text-accent"
      inputs={[{ id: 'image-in', type: 'image' }]}
      outputs={[{ id: 'video-out', type: 'image' }]}
    >
      <div className="space-y-3">
        {!videoUrl && !isProcessing && !imageUrl && (
          <div className="aspect-video rounded-lg bg-background/50 border border-dashed border-border/50 flex items-center justify-center">
            <div className="text-center">
              <Video className="w-8 h-8 text-muted-foreground/50 mx-auto mb-2" />
              <p className="text-xs text-muted-foreground/50">Connect an image</p>
            </div>
          </div>
        )}

        {isProcessing && (
          <div className="aspect-video rounded-lg bg-background/50 border border-border/50 flex items-center justify-center relative overflow-hidden">
            <div className="absolute inset-0 bg-shimmer animate-shimmer" />
            <div className="relative z-10 text-center">
              <Loader2 className="w-8 h-8 text-accent animate-spin mx-auto mb-2" />
              <p className="text-xs text-muted-foreground">Animating...</p>
            </div>
          </div>
        )}

        {videoUrl && !isProcessing && (
          <div className="aspect-video rounded-lg overflow-hidden border border-border/50 relative group">
            {imageUrl && (
              <img
                src={imageUrl}
                alt="Video preview"
                className="w-full h-full object-cover"
              />
            )}
            <div className="absolute inset-0 bg-background/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
              <div className="w-12 h-12 rounded-full bg-accent/20 border border-accent/50 flex items-center justify-center">
                <Play className="w-6 h-6 text-accent fill-accent" />
              </div>
            </div>
            <div className="absolute bottom-2 right-2 px-2 py-1 rounded bg-background/80 text-xs text-foreground">
              5s preview
            </div>
          </div>
        )}

        {imageUrl && !videoUrl && !isProcessing && (
          <div className="aspect-video rounded-lg overflow-hidden border border-border/50">
            <img
              src={imageUrl}
              alt="Source image"
              className="w-full h-full object-cover opacity-70"
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
            'bg-accent/20 hover:bg-accent/30 text-accent border border-accent/30'
          )}
          variant="outline"
        >
          {isProcessing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating Video...
            </>
          ) : (
            <>
              <Video className="w-4 h-4" />
              Generate Video
            </>
          )}
        </Button>

        {error && (
          <p className="text-xs text-destructive">{error}</p>
        )}

        <p className="text-xs text-muted-foreground/60 text-center">
          Powered by Luma AI (placeholder)
        </p>
      </div>
    </BaseNode>
  );
};
