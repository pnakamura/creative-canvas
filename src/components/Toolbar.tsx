import React from 'react';
import {
  Type,
  Sparkles,
  Image,
  Video,
  Play,
  Loader2,
  Plus,
  Trash2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useFlowStore, NodeType } from '@/store/flowStore';
import { cn } from '@/lib/utils';

interface ToolbarProps {
  onExecuteFlow: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onExecuteFlow }) => {
  const { addNode, selectedNodeId, deleteNode, isExecuting, nodes } = useFlowStore();

  const handleAddNode = (type: NodeType) => {
    const centerX = window.innerWidth / 2 - 150;
    const centerY = window.innerHeight / 2 - 100;
    addNode(type, { x: centerX + Math.random() * 100, y: centerY + Math.random() * 100 });
  };

  const nodeOptions = [
    { type: 'text' as NodeType, label: 'Text Input', icon: Type, color: 'text-handle-text' },
    { type: 'assistant' as NodeType, label: 'AI Assistant', icon: Sparkles, color: 'text-secondary' },
    { type: 'imageGenerator' as NodeType, label: 'Image Generator', icon: Image, color: 'text-handle-image' },
    { type: 'videoGenerator' as NodeType, label: 'Video Generator', icon: Video, color: 'text-accent' },
  ];

  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50">
      <div className="glass-panel rounded-xl p-2 flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="toolbar-button">
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Add Node</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="glass-panel border-border/50" align="start">
            <DropdownMenuLabel className="text-muted-foreground">Node Types</DropdownMenuLabel>
            <DropdownMenuSeparator className="bg-border/50" />
            {nodeOptions.map((option) => (
              <DropdownMenuItem
                key={option.type}
                onClick={() => handleAddNode(option.type)}
                className="gap-2 cursor-pointer focus:bg-muted"
              >
                <option.icon className={cn('w-4 h-4', option.color)} />
                {option.label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="w-px h-6 bg-border/50" />

        <Button
          variant="ghost"
          className="toolbar-button primary"
          onClick={onExecuteFlow}
          disabled={isExecuting || nodes.length === 0}
        >
          {isExecuting ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Play className="w-4 h-4" />
          )}
          <span className="hidden sm:inline">
            {isExecuting ? 'Running...' : 'Execute Flow'}
          </span>
        </Button>

        {selectedNodeId && (
          <>
            <div className="w-px h-6 bg-border/50" />
            <Button
              variant="ghost"
              className="toolbar-button text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => deleteNode(selectedNodeId)}
            >
              <Trash2 className="w-4 h-4" />
              <span className="hidden sm:inline">Delete</span>
            </Button>
          </>
        )}
      </div>
    </div>
  );
};
