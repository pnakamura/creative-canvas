import React, { useState, useCallback } from 'react';
import { NodeProps, Handle, Position } from '@xyflow/react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  GitBranch, 
  Plus, 
  Trash2, 
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Play,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useFlowStore, NodeData, RouterCondition, FlowNode } from '@/store/flowStore';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { toast } from 'sonner';

// Helper to get nested value from object using dot notation
const getNestedValue = (obj: unknown, path: string): unknown => {
  if (!path) return obj;
  const keys = path.split('.');
  let current: unknown = obj;
  for (const key of keys) {
    if (current === null || current === undefined) return undefined;
    if (typeof current === 'object' && key in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[key];
    } else {
      return undefined;
    }
  }
  return current;
};

// Evaluate a single condition against input data
const evaluateCondition = (condition: RouterCondition, inputData: unknown): boolean => {
  if (!condition.enabled) return false;
  
  const fieldValue = condition.field ? getNestedValue(inputData, condition.field) : inputData;
  const stringValue = fieldValue !== null && fieldValue !== undefined ? String(fieldValue) : '';
  const compareValue = condition.value;
  
  switch (condition.operator) {
    case 'equals':
      return stringValue === compareValue;
    case 'notEquals':
      return stringValue !== compareValue;
    case 'contains':
      return stringValue.toLowerCase().includes(compareValue.toLowerCase());
    case 'notContains':
      return !stringValue.toLowerCase().includes(compareValue.toLowerCase());
    case 'startsWith':
      return stringValue.toLowerCase().startsWith(compareValue.toLowerCase());
    case 'endsWith':
      return stringValue.toLowerCase().endsWith(compareValue.toLowerCase());
    case 'greaterThan': {
      const numValue = parseFloat(stringValue);
      const numCompare = parseFloat(compareValue);
      return !isNaN(numValue) && !isNaN(numCompare) && numValue > numCompare;
    }
    case 'lessThan': {
      const numValue = parseFloat(stringValue);
      const numCompare = parseFloat(compareValue);
      return !isNaN(numValue) && !isNaN(numCompare) && numValue < numCompare;
    }
    case 'greaterOrEqual': {
      const numValue = parseFloat(stringValue);
      const numCompare = parseFloat(compareValue);
      return !isNaN(numValue) && !isNaN(numCompare) && numValue >= numCompare;
    }
    case 'lessOrEqual': {
      const numValue = parseFloat(stringValue);
      const numCompare = parseFloat(compareValue);
      return !isNaN(numValue) && !isNaN(numCompare) && numValue <= numCompare;
    }
    case 'isEmpty':
      return stringValue.trim() === '' || fieldValue === null || fieldValue === undefined;
    case 'isNotEmpty':
      return stringValue.trim() !== '' && fieldValue !== null && fieldValue !== undefined;
    case 'matches':
      try {
        const regex = new RegExp(compareValue, 'i');
        return regex.test(stringValue);
      } catch {
        return false;
      }
    default:
      return false;
  }
};

export const RouterNode: React.FC<NodeProps<FlowNode>> = ({ id, data, selected }) => {
  const { setSelectedNode, updateNodeData, edges, nodes } = useFlowStore();
  const [isEditing, setIsEditing] = useState(false);
  const [label, setLabel] = useState(data.label || 'Conditional Router');
  const [expandedCondition, setExpandedCondition] = useState<number | null>(0);
  const [isEvaluating, setIsEvaluating] = useState(false);

  const conditions = data.routerSettings?.conditions || [];
  const evaluationResults = data.routerData?.evaluationResults || {};
  const evaluateAll = data.routerSettings?.evaluateAll ?? false;

  // Get input data from connected source nodes
  const getInputData = useCallback((): unknown => {
    const incomingEdges = edges.filter(e => e.target === id);
    if (incomingEdges.length === 0) return null;

    const sourceNodeId = incomingEdges[0].source;
    const sourceNode = nodes.find(n => n.id === sourceNodeId);
    if (!sourceNode) return null;

    // Try to get output from various node types
    const nodeData = sourceNode.data;
    if (nodeData.textContent) return nodeData.textContent;
    if (nodeData.assistantData && typeof nodeData.assistantData === 'object' && 'response' in nodeData.assistantData) {
      return (nodeData.assistantData as { response: string }).response;
    }
    if (nodeData.apiConnectorData && typeof nodeData.apiConnectorData === 'object' && 'response' in nodeData.apiConnectorData) {
      const apiResponse = nodeData.apiConnectorData as { response?: { data?: unknown } };
      if (apiResponse.response?.data) {
        return apiResponse.response.data;
      }
    }
    if (nodeData.textAnalyzerData && typeof nodeData.textAnalyzerData === 'object' && 'result' in nodeData.textAnalyzerData) {
      return (nodeData.textAnalyzerData as { result: unknown }).result;
    }
    if (nodeData.extractedText) return nodeData.extractedText;
    
    return null;
  }, [edges, nodes, id]);

  // Evaluate all conditions and route accordingly
  const handleEvaluate = useCallback(() => {
    const inputData = getInputData();
    
    if (inputData === null) {
      toast.error('No input data available. Connect a source node first.');
      return;
    }

    setIsEvaluating(true);
    
    try {
      const results: Record<string, boolean> = {};
      let matchedBranch: string | null = null;
      const matchedBranches: string[] = [];

      for (const condition of conditions) {
        const result = evaluateCondition(condition, inputData);
        results[condition.id] = result;
        
        if (result) {
          matchedBranches.push(condition.name);
          if (!matchedBranch) {
            matchedBranch = condition.name;
          }
          // If not evaluating all, stop at first match
          if (!evaluateAll) break;
        }
      }

      updateNodeData(id, {
        routerData: {
          evaluationResults: results,
          matchedBranch: matchedBranch || 'default',
          matchedBranches,
          inputData: typeof inputData === 'string' ? inputData : JSON.stringify(inputData),
          lastEvaluatedAt: new Date().toISOString(),
        },
        isComplete: true,
        error: undefined,
      });

      if (matchedBranch) {
        toast.success(`Routed to: ${evaluateAll ? matchedBranches.join(', ') : matchedBranch}`);
      } else {
        toast.info('No conditions matched. Using default branch.');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Evaluation failed';
      updateNodeData(id, {
        error: errorMessage,
        routerData: {
          ...data.routerData,
          evaluationResults: {},
          matchedBranch: null,
        },
      });
      toast.error(errorMessage);
    } finally {
      setIsEvaluating(false);
    }
  }, [conditions, evaluateAll, getInputData, id, updateNodeData, data.routerData]);

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedNode(id);
  };

  const handleLabelChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setLabel(e.target.value);
  };

  const handleLabelBlur = () => {
    setIsEditing(false);
    updateNodeData(id, { label });
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      setIsEditing(false);
      updateNodeData(id, { label });
    }
  };

  const addCondition = () => {
    const newCondition: RouterCondition = {
      id: `condition-${Date.now()}`,
      name: `Branch ${conditions.length + 1}`,
      field: '',
      operator: 'equals',
      value: '',
      enabled: true,
    };
    updateNodeData(id, {
      routerSettings: {
        ...data.routerSettings,
        conditions: [...conditions, newCondition],
      },
    });
    setExpandedCondition(conditions.length);
  };

  const updateCondition = (index: number, updates: Partial<RouterCondition>) => {
    const newConditions = [...conditions];
    newConditions[index] = { ...newConditions[index], ...updates };
    updateNodeData(id, {
      routerSettings: {
        ...data.routerSettings,
        conditions: newConditions,
      },
    });
  };

  const removeCondition = (index: number) => {
    const newConditions = conditions.filter((_, i) => i !== index);
    updateNodeData(id, {
      routerSettings: {
        ...data.routerSettings,
        conditions: newConditions,
      },
    });
  };

  const getOperatorLabel = (operator: string) => {
    const labels: Record<string, string> = {
      equals: '=',
      notEquals: '≠',
      contains: '∋',
      notContains: '∌',
      startsWith: 'starts',
      endsWith: 'ends',
      greaterThan: '>',
      lessThan: '<',
      greaterOrEqual: '≥',
      lessOrEqual: '≤',
      isEmpty: 'empty',
      isNotEmpty: '!empty',
      matches: 'regex',
    };
    return labels[operator] || operator;
  };

  const getResultIcon = (conditionId: string) => {
    const result = evaluationResults[conditionId];
    if (result === undefined) return null;
    if (result) return <CheckCircle2 className="w-3 h-3 text-green-500" />;
    return <XCircle className="w-3 h-3 text-muted-foreground" />;
  };

  return (
    <Card
      className={cn(
        'node-card min-w-[280px] max-w-[320px] cursor-pointer transition-all duration-200',
        'bg-card/95 backdrop-blur-sm border-border/50',
        selected && 'ring-2 ring-primary shadow-lg shadow-primary/20',
        data.isProcessing && 'animate-pulse border-secondary',
        data.isComplete && 'border-green-500/50',
        data.error && 'border-destructive/50'
      )}
      onClick={handleClick}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        id="input"
        className="!w-3 !h-3 !bg-amber-500 !border-2 !border-background"
      />

      {/* Header */}
      <div className="p-3 border-b border-border/30">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-amber-500/20">
            <GitBranch className="w-4 h-4 text-amber-500" />
          </div>
          {isEditing ? (
            <Input
              value={label}
              onChange={handleLabelChange}
              onBlur={handleLabelBlur}
              onKeyDown={handleKeyPress}
              className="h-6 text-sm font-medium nodrag"
              autoFocus
            />
          ) : (
            <span
              className="font-medium text-sm text-foreground cursor-text flex-1"
              onClick={(e) => {
                e.stopPropagation();
                setIsEditing(true);
              }}
            >
              {label}
            </span>
          )}
          <Badge variant="outline" className="text-xs bg-amber-500/10 text-amber-500 border-amber-500/30">
            {conditions.length} {conditions.length === 1 ? 'branch' : 'branches'}
          </Badge>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Route data based on conditions
        </p>
      </div>

      {/* Conditions */}
      <div className="p-2 space-y-1.5 max-h-[300px] overflow-y-auto nodrag">
        {conditions.map((condition, index) => (
          <Collapsible
            key={condition.id}
            open={expandedCondition === index}
            onOpenChange={(open) => setExpandedCondition(open ? index : null)}
          >
            <div
              className={cn(
                'rounded-md border transition-colors',
                condition.enabled 
                  ? 'bg-muted/30 border-border/50' 
                  : 'bg-muted/10 border-border/30 opacity-60'
              )}
            >
              <CollapsibleTrigger asChild>
                <div className="flex items-center gap-2 p-2 cursor-pointer hover:bg-muted/50">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {getResultIcon(condition.id)}
                    <span className="text-xs font-medium truncate">{condition.name}</span>
                    {condition.field && (
                      <Badge variant="secondary" className="text-[10px] px-1 py-0">
                        {condition.field} {getOperatorLabel(condition.operator)} {condition.value || '""'}
                      </Badge>
                    )}
                  </div>
                  {expandedCondition === index ? (
                    <ChevronUp className="w-3 h-3 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="w-3 h-3 text-muted-foreground" />
                  )}
                </div>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="px-2 pb-2 space-y-2 border-t border-border/30 pt-2">
                  <Input
                    value={condition.name}
                    onChange={(e) => updateCondition(index, { name: e.target.value })}
                    placeholder="Branch name"
                    className="h-7 text-xs nodrag"
                  />
                  <Input
                    value={condition.field}
                    onChange={(e) => updateCondition(index, { field: e.target.value })}
                    placeholder="Field (e.g., status, data.type)"
                    className="h-7 text-xs nodrag"
                  />
                  <div className="flex gap-1.5">
                    <Select
                      value={condition.operator}
                      onValueChange={(value) => updateCondition(index, { operator: value as RouterCondition['operator'] })}
                    >
                      <SelectTrigger className="h-7 text-xs flex-1 nodrag">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="equals">Equals</SelectItem>
                        <SelectItem value="notEquals">Not Equals</SelectItem>
                        <SelectItem value="contains">Contains</SelectItem>
                        <SelectItem value="notContains">Not Contains</SelectItem>
                        <SelectItem value="startsWith">Starts With</SelectItem>
                        <SelectItem value="endsWith">Ends With</SelectItem>
                        <SelectItem value="greaterThan">Greater Than</SelectItem>
                        <SelectItem value="lessThan">Less Than</SelectItem>
                        <SelectItem value="greaterOrEqual">≥</SelectItem>
                        <SelectItem value="lessOrEqual">≤</SelectItem>
                        <SelectItem value="isEmpty">Is Empty</SelectItem>
                        <SelectItem value="isNotEmpty">Is Not Empty</SelectItem>
                        <SelectItem value="matches">Matches Regex</SelectItem>
                      </SelectContent>
                    </Select>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10 nodrag"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeCondition(index);
                      }}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                  {!['isEmpty', 'isNotEmpty'].includes(condition.operator) && (
                    <Input
                      value={condition.value}
                      onChange={(e) => updateCondition(index, { value: e.target.value })}
                      placeholder="Value to compare"
                      className="h-7 text-xs nodrag"
                    />
                  )}
                </div>
              </CollapsibleContent>
            </div>

            {/* Output Handle for this condition */}
            <Handle
              type="source"
              position={Position.Right}
              id={`branch-${condition.id}`}
              className="!w-3 !h-3 !bg-amber-500 !border-2 !border-background"
              style={{ top: `${80 + index * 45}px` }}
            />
          </Collapsible>
        ))}

        {/* Default branch indicator */}
        <div className="flex items-center gap-2 p-2 rounded-md bg-muted/20 border border-dashed border-border/50">
          <AlertCircle className="w-3 h-3 text-muted-foreground" />
          <span className="text-xs text-muted-foreground">Default (no match)</span>
        </div>

        {/* Default output handle */}
        <Handle
          type="source"
          position={Position.Right}
          id="default"
          className="!w-3 !h-3 !bg-muted-foreground !border-2 !border-background"
          style={{ top: `${80 + conditions.length * 45}px` }}
        />
      </div>

      {/* Actions */}
      <div className="p-2 border-t border-border/30 space-y-1.5">
        <Button
          variant="default"
          size="sm"
          className="w-full h-8 text-xs gap-1.5 nodrag bg-amber-500 hover:bg-amber-600 text-white"
          onClick={(e) => {
            e.stopPropagation();
            handleEvaluate();
          }}
          disabled={isEvaluating || conditions.length === 0}
        >
          {isEvaluating ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Play className="w-3 h-3" />
          )}
          Evaluate & Route
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full h-7 text-xs gap-1.5 nodrag"
          onClick={(e) => {
            e.stopPropagation();
            addCondition();
          }}
        >
          <Plus className="w-3 h-3" />
          Add Branch
        </Button>
      </div>

      {/* Status indicators */}
      {data.error && (
        <div className="px-3 py-2 border-t border-destructive/30 bg-destructive/10">
          <p className="text-xs text-destructive truncate">{data.error}</p>
        </div>
      )}

      {data.routerData?.matchedBranch && (
        <div className="px-3 py-2 border-t border-green-500/30 bg-green-500/10">
          <p className="text-xs text-green-500">
            Matched: {data.routerData.matchedBranch}
          </p>
        </div>
      )}
    </Card>
  );
};
