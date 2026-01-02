import React, { useState, useCallback, memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import { 
  Globe, 
  Loader2, 
  Send,
  CheckCircle2,
  AlertCircle,
  Plus,
  X,
  Key,
  Clock,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { NodeData, useFlowStore, HttpMethod, ApiAuthType, ApiConnectorSettings, ApiConnectorData } from '@/store/flowStore';
import { BaseNode } from './BaseNode';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

const methodColors: Record<HttpMethod, string> = {
  GET: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
  POST: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
  PUT: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
  PATCH: 'bg-orange-500/20 text-orange-400 border-orange-500/30',
  DELETE: 'bg-red-500/20 text-red-400 border-red-500/30',
};

const statusColors = (status: number) => {
  if (status >= 200 && status < 300) return 'text-emerald-400';
  if (status >= 300 && status < 400) return 'text-blue-400';
  if (status >= 400 && status < 500) return 'text-amber-400';
  if (status >= 500) return 'text-red-400';
  return 'text-muted-foreground';
};

const defaultSettings: ApiConnectorSettings = {
  method: 'GET',
  url: '',
  bodyType: 'none',
  timeout: 30,
  authType: 'none',
  headers: [],
  queryParams: [],
  followRedirects: true,
  validateSSL: true,
  retryOnFail: false,
  retryCount: 3,
};

export const ApiConnectorNode: React.FC<NodeProps> = memo((props) => {
  const { id, data: rawData, selected } = props;
  const data = rawData as NodeData;
  const { updateNodeData } = useFlowStore();
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('config');

  const settings: ApiConnectorSettings = data.apiConnectorSettings || defaultSettings;

  const apiData: ApiConnectorData = data.apiConnectorData || {};
  const responseData = apiData.response;

  const updateSettings = useCallback((key: string, value: unknown) => {
    updateNodeData(id, {
      apiConnectorSettings: {
        ...settings,
        [key]: value,
      },
    });
  }, [id, settings, updateNodeData]);

  const updateHeader = useCallback((index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
    const newHeaders = [...(settings.headers || [])];
    newHeaders[index] = { ...newHeaders[index], [field]: value };
    updateSettings('headers', newHeaders);
  }, [settings.headers, updateSettings]);

  const addHeader = useCallback(() => {
    updateSettings('headers', [...(settings.headers || []), { key: '', value: '', enabled: true }]);
  }, [settings.headers, updateSettings]);

  const removeHeader = useCallback((index: number) => {
    const newHeaders = (settings.headers || []).filter((_, i) => i !== index);
    updateSettings('headers', newHeaders);
  }, [settings.headers, updateSettings]);

  const updateQueryParam = useCallback((index: number, field: 'key' | 'value' | 'enabled', value: string | boolean) => {
    const newParams = [...(settings.queryParams || [])];
    newParams[index] = { ...newParams[index], [field]: value };
    updateSettings('queryParams', newParams);
  }, [settings.queryParams, updateSettings]);

  const addQueryParam = useCallback(() => {
    updateSettings('queryParams', [...(settings.queryParams || []), { key: '', value: '', enabled: true }]);
  }, [settings.queryParams, updateSettings]);

  const removeQueryParam = useCallback((index: number) => {
    const newParams = (settings.queryParams || []).filter((_, i) => i !== index);
    updateSettings('queryParams', newParams);
  }, [settings.queryParams, updateSettings]);

  const buildHeaders = useCallback(() => {
    const headers: Record<string, string> = {};
    
    // Add auth headers
    if (settings.authType === 'bearer' && settings.bearerToken) {
      headers['Authorization'] = `Bearer ${settings.bearerToken}`;
    } else if (settings.authType === 'apiKey' && settings.apiKeyName && settings.apiKeyValue) {
      if (settings.apiKeyLocation === 'header') {
        headers[settings.apiKeyName] = settings.apiKeyValue;
      }
    } else if (settings.authType === 'basic' && settings.basicUsername && settings.basicPassword) {
      const credentials = btoa(`${settings.basicUsername}:${settings.basicPassword}`);
      headers['Authorization'] = `Basic ${credentials}`;
    }
    
    // Add custom headers
    (settings.headers || [])
      .filter(h => h.enabled && h.key)
      .forEach(h => {
        headers[h.key] = h.value;
      });
    
    return headers;
  }, [settings]);

  const buildUrl = useCallback(() => {
    let url = settings.url || '';
    
    // Add query params
    const enabledParams = (settings.queryParams || []).filter(p => p.enabled && p.key);
    if (enabledParams.length > 0) {
      const separator = url.includes('?') ? '&' : '?';
      const queryString = enabledParams
        .map(p => `${encodeURIComponent(p.key)}=${encodeURIComponent(p.value)}`)
        .join('&');
      url += separator + queryString;
    }
    
    // Add API key if in query
    if (settings.authType === 'apiKey' && settings.apiKeyLocation === 'query' && settings.apiKeyName && settings.apiKeyValue) {
      const separator = url.includes('?') ? '&' : '?';
      url += `${separator}${encodeURIComponent(settings.apiKeyName)}=${encodeURIComponent(settings.apiKeyValue)}`;
    }
    
    return url;
  }, [settings]);

  const executeRequest = useCallback(async () => {
    if (!settings.url) {
      toast.error('Please enter a URL');
      return;
    }

    setIsLoading(true);
    updateNodeData(id, { isProcessing: true, error: undefined });

    try {
      const requestPayload = {
        method: settings.method,
        url: buildUrl(),
        headers: buildHeaders(),
        body: settings.bodyType !== 'none' ? apiData.requestBody : undefined,
        timeout: settings.timeout,
        followRedirects: settings.followRedirects,
      };

      console.log('[ApiConnectorNode] Sending request:', requestPayload);

      const { data: response, error } = await supabase.functions.invoke('api-proxy', {
        body: requestPayload,
      });

      if (error) throw error;

      console.log('[ApiConnectorNode] Response:', response);

      updateNodeData(id, {
        isProcessing: false,
        isComplete: !response.error,
        error: response.error,
        apiConnectorData: {
          ...apiData,
          response: {
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            data: response.data,
            duration: response.duration,
          },
          requestHistory: [
            {
              timestamp: new Date().toISOString(),
              method: settings.method,
              url: settings.url,
              status: response.status,
              duration: response.duration,
            },
            ...(apiData.requestHistory || []).slice(0, 4),
          ],
        },
      });

      if (response.error) {
        toast.error(`Request failed: ${response.error}`);
      } else if (response.status >= 400) {
        toast.warning(`HTTP ${response.status}: ${response.statusText}`);
      } else {
        toast.success(`Request completed in ${response.duration}ms`);
      }

    } catch (error) {
      console.error('[ApiConnectorNode] Error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Request failed';
      updateNodeData(id, {
        isProcessing: false,
        isComplete: false,
        error: errorMessage,
      });
      toast.error(errorMessage);
    } finally {
      setIsLoading(false);
    }
  }, [id, settings, apiData, buildUrl, buildHeaders, updateNodeData]);

  const getAuthBadge = () => {
    if (settings.authType === 'none') return null;
    return (
      <Badge variant="outline" className="text-[10px] gap-1 py-0">
        <Key className="w-2.5 h-2.5" />
        {settings.authType.toUpperCase()}
      </Badge>
    );
  };

  return (
    <BaseNode
      {...props}
      icon={Globe}
      iconColor="text-indigo-400"
      fixedDescription="Connect to external REST APIs"
      inputs={[{ id: 'body-in', type: 'text' }]}
      outputs={[{ id: 'response-out', type: 'text' }]}
    >
      {/* Input handle for body/params */}
      <Handle
        type="target"
        position={Position.Left}
        id="body-in"
        className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-background"
      />

      <div className="space-y-3 nodrag">
        {/* Method + URL row */}
        <div className="flex gap-2">
          <Select
            value={settings.method}
            onValueChange={(v) => updateSettings('method', v)}
          >
            <SelectTrigger className={cn(
              'w-24 h-8 text-xs font-mono border',
              methodColors[settings.method]
            )}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as HttpMethod[]).map((m) => (
                <SelectItem key={m} value={m} className="font-mono">
                  <span className={methodColors[m].split(' ')[1]}>{m}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Input
            value={settings.url}
            onChange={(e) => updateSettings('url', e.target.value)}
            placeholder="https://api.example.com/endpoint"
            className="flex-1 h-8 text-xs font-mono bg-background/50"
          />
        </div>

        {/* Auth Badge + Quick Info */}
        <div className="flex items-center gap-2 flex-wrap">
          {getAuthBadge()}
          {(settings.headers || []).filter(h => h.enabled).length > 0 && (
            <Badge variant="outline" className="text-[10px] py-0">
              {(settings.headers || []).filter(h => h.enabled).length} headers
            </Badge>
          )}
          {(settings.queryParams || []).filter(p => p.enabled).length > 0 && (
            <Badge variant="outline" className="text-[10px] py-0">
              {(settings.queryParams || []).filter(p => p.enabled).length} params
            </Badge>
          )}
        </div>

        {/* Configuration Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 h-7">
            <TabsTrigger value="config" className="text-[10px]">Body</TabsTrigger>
            <TabsTrigger value="auth" className="text-[10px]">Auth</TabsTrigger>
            <TabsTrigger value="headers" className="text-[10px]">Headers</TabsTrigger>
            <TabsTrigger value="params" className="text-[10px]">Params</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="mt-2 space-y-2">
            <Select
              value={settings.bodyType}
              onValueChange={(v) => updateSettings('bodyType', v)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Body type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Body</SelectItem>
                <SelectItem value="json">JSON</SelectItem>
                <SelectItem value="form">Form Data</SelectItem>
                <SelectItem value="raw">Raw</SelectItem>
              </SelectContent>
            </Select>
            
            {settings.bodyType !== 'none' && (
              <Textarea
                value={typeof apiData.requestBody === 'string' 
                  ? apiData.requestBody 
                  : JSON.stringify(apiData.requestBody || {}, null, 2)}
                onChange={(e) => updateNodeData(id, {
                  apiConnectorData: {
                    ...apiData,
                    requestBody: e.target.value,
                  },
                })}
                placeholder={settings.bodyType === 'json' ? '{\n  "key": "value"\n}' : 'Request body...'}
                className="h-20 text-xs font-mono resize-none"
              />
            )}
          </TabsContent>

          <TabsContent value="auth" className="mt-2 space-y-2">
            <Select
              value={settings.authType}
              onValueChange={(v) => updateSettings('authType', v)}
            >
              <SelectTrigger className="h-7 text-xs">
                <SelectValue placeholder="Auth type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Auth</SelectItem>
                <SelectItem value="bearer">Bearer Token</SelectItem>
                <SelectItem value="apiKey">API Key</SelectItem>
                <SelectItem value="basic">Basic Auth</SelectItem>
              </SelectContent>
            </Select>

            {settings.authType === 'bearer' && (
              <Input
                type="password"
                value={settings.bearerToken || ''}
                onChange={(e) => updateSettings('bearerToken', e.target.value)}
                placeholder="Enter bearer token"
                className="h-7 text-xs"
              />
            )}

            {settings.authType === 'apiKey' && (
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={settings.apiKeyName || ''}
                    onChange={(e) => updateSettings('apiKeyName', e.target.value)}
                    placeholder="Key name"
                    className="h-7 text-xs flex-1"
                  />
                  <Select
                    value={settings.apiKeyLocation || 'header'}
                    onValueChange={(v) => updateSettings('apiKeyLocation', v)}
                  >
                    <SelectTrigger className="w-20 h-7 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="header">Header</SelectItem>
                      <SelectItem value="query">Query</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <Input
                  type="password"
                  value={settings.apiKeyValue || ''}
                  onChange={(e) => updateSettings('apiKeyValue', e.target.value)}
                  placeholder="Key value"
                  className="h-7 text-xs"
                />
              </div>
            )}

            {settings.authType === 'basic' && (
              <div className="space-y-2">
                <Input
                  value={settings.basicUsername || ''}
                  onChange={(e) => updateSettings('basicUsername', e.target.value)}
                  placeholder="Username"
                  className="h-7 text-xs"
                />
                <Input
                  type="password"
                  value={settings.basicPassword || ''}
                  onChange={(e) => updateSettings('basicPassword', e.target.value)}
                  placeholder="Password"
                  className="h-7 text-xs"
                />
              </div>
            )}
          </TabsContent>

          <TabsContent value="headers" className="mt-2">
            <ScrollArea className="h-24">
              <div className="space-y-1">
                {(settings.headers || []).map((header, idx) => (
                  <div key={idx} className="flex gap-1 items-center">
                    <Switch
                      checked={header.enabled}
                      onCheckedChange={(v) => updateHeader(idx, 'enabled', v)}
                      className="scale-75"
                    />
                    <Input
                      value={header.key}
                      onChange={(e) => updateHeader(idx, 'key', e.target.value)}
                      placeholder="Key"
                      className="h-6 text-[10px] flex-1"
                    />
                    <Input
                      value={header.value}
                      onChange={(e) => updateHeader(idx, 'value', e.target.value)}
                      placeholder="Value"
                      className="h-6 text-[10px] flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeHeader(idx)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-6 text-[10px] mt-1"
              onClick={addHeader}
            >
              <Plus className="w-3 h-3 mr-1" /> Add Header
            </Button>
          </TabsContent>

          <TabsContent value="params" className="mt-2">
            <ScrollArea className="h-24">
              <div className="space-y-1">
                {(settings.queryParams || []).map((param, idx) => (
                  <div key={idx} className="flex gap-1 items-center">
                    <Switch
                      checked={param.enabled}
                      onCheckedChange={(v) => updateQueryParam(idx, 'enabled', v)}
                      className="scale-75"
                    />
                    <Input
                      value={param.key}
                      onChange={(e) => updateQueryParam(idx, 'key', e.target.value)}
                      placeholder="Key"
                      className="h-6 text-[10px] flex-1"
                    />
                    <Input
                      value={param.value}
                      onChange={(e) => updateQueryParam(idx, 'value', e.target.value)}
                      placeholder="Value"
                      className="h-6 text-[10px] flex-1"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6"
                      onClick={() => removeQueryParam(idx)}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>
            <Button
              variant="outline"
              size="sm"
              className="w-full h-6 text-[10px] mt-1"
              onClick={addQueryParam}
            >
              <Plus className="w-3 h-3 mr-1" /> Add Parameter
            </Button>
          </TabsContent>
        </Tabs>

        {/* Response Preview */}
        {responseData && (
          <div className="space-y-1.5 pt-2 border-t border-border/50">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={cn('text-xs font-mono font-bold', statusColors(responseData.status))}>
                  {responseData.status}
                </span>
                <span className="text-[10px] text-muted-foreground">{responseData.statusText}</span>
              </div>
              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                <Clock className="w-3 h-3" />
                {responseData.duration}ms
              </div>
            </div>
            <ScrollArea className="h-16 rounded bg-background/50 p-2">
              <pre className="text-[10px] font-mono text-muted-foreground whitespace-pre-wrap">
                {typeof responseData.data === 'string' 
                  ? responseData.data.slice(0, 500) 
                  : JSON.stringify(responseData.data, null, 2).slice(0, 500)}
                {((typeof responseData.data === 'string' ? responseData.data : JSON.stringify(responseData.data)).length > 500) && '...'}
              </pre>
            </ScrollArea>
          </div>
        )}

        {/* Action Button */}
        <Button
          onClick={executeRequest}
          disabled={isLoading || !settings.url}
          className="w-full h-8 gap-2"
          variant={responseData ? 'outline' : 'default'}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-3 h-3 animate-spin" />
              Sending...
            </>
          ) : (
            <>
              <Send className="w-3 h-3" />
              {responseData ? 'Send Again' : 'Send Request'}
            </>
          )}
        </Button>

        {/* Status */}
        {data.isComplete && !data.error && (
          <div className="flex items-center gap-2 text-xs text-emerald-400">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Request successful</span>
          </div>
        )}
        {data.error && (
          <div className="flex items-center gap-2 text-xs text-destructive">
            <AlertCircle className="w-3.5 h-3.5" />
            <span className="truncate">{data.error}</span>
          </div>
        )}
      </div>

      {/* Output handles */}
      <Handle
        type="source"
        position={Position.Right}
        id="response-out"
        className="!w-3 !h-3 !bg-indigo-400 !border-2 !border-background"
        style={{ top: '40%' }}
      />
      <Handle
        type="source"
        position={Position.Right}
        id="status-out"
        className="!w-3 !h-3 !bg-amber-400 !border-2 !border-background"
        style={{ top: '60%' }}
      />
    </BaseNode>
  );
});

ApiConnectorNode.displayName = 'ApiConnectorNode';

export default ApiConnectorNode;
