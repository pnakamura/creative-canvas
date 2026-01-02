import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ProxyRequest {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  body?: unknown;
  timeout?: number;
  followRedirects?: boolean;
}

interface ProxyResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  data: unknown;
  duration: number;
  error?: string;
}

// Validate URL to prevent SSRF attacks
function isValidUrl(urlString: string): { valid: boolean; reason?: string } {
  try {
    const url = new URL(urlString);
    
    // Block localhost and private IPs
    const hostname = url.hostname.toLowerCase();
    const blockedPatterns = [
      'localhost',
      '127.0.0.1',
      '0.0.0.0',
      '::1',
      '10.',
      '172.16.',
      '172.17.',
      '172.18.',
      '172.19.',
      '172.20.',
      '172.21.',
      '172.22.',
      '172.23.',
      '172.24.',
      '172.25.',
      '172.26.',
      '172.27.',
      '172.28.',
      '172.29.',
      '172.30.',
      '172.31.',
      '192.168.',
      'metadata.google',
      '169.254.',
    ];
    
    for (const pattern of blockedPatterns) {
      if (hostname.includes(pattern) || hostname.startsWith(pattern)) {
        return { valid: false, reason: `Blocked hostname pattern: ${pattern}` };
      }
    }
    
    // Only allow http and https
    if (!['http:', 'https:'].includes(url.protocol)) {
      return { valid: false, reason: `Unsupported protocol: ${url.protocol}` };
    }
    
    return { valid: true };
  } catch {
    return { valid: false, reason: 'Invalid URL format' };
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const startTime = Date.now();
  
  try {
    const requestData: ProxyRequest = await req.json();
    
    console.log(`[API Proxy] ${requestData.method} ${requestData.url}`);
    
    // Validate required fields
    if (!requestData.url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    if (!requestData.method) {
      return new Response(
        JSON.stringify({ error: 'HTTP method is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Validate URL security
    const urlValidation = isValidUrl(requestData.url);
    if (!urlValidation.valid) {
      console.warn(`[API Proxy] Blocked URL: ${requestData.url} - ${urlValidation.reason}`);
      return new Response(
        JSON.stringify({ error: `URL validation failed: ${urlValidation.reason}` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    // Prepare fetch options
    const timeout = Math.min(requestData.timeout || 30, 30) * 1000; // Max 30 seconds
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const fetchOptions: RequestInit = {
      method: requestData.method,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Lovable-API-Proxy/1.0',
        ...requestData.headers,
      },
      signal: controller.signal,
      redirect: requestData.followRedirects !== false ? 'follow' : 'manual',
    };
    
    // Add body for methods that support it
    if (['POST', 'PUT', 'PATCH'].includes(requestData.method) && requestData.body) {
      fetchOptions.body = typeof requestData.body === 'string' 
        ? requestData.body 
        : JSON.stringify(requestData.body);
    }
    
    console.log(`[API Proxy] Fetching with timeout: ${timeout}ms`);
    
    // Make the request
    const response = await fetch(requestData.url, fetchOptions);
    clearTimeout(timeoutId);
    
    const duration = Date.now() - startTime;
    
    // Parse response headers
    const responseHeaders: Record<string, string> = {};
    response.headers.forEach((value, key) => {
      responseHeaders[key] = value;
    });
    
    // Try to parse response body
    let data: unknown;
    const contentType = response.headers.get('content-type') || '';
    
    try {
      if (contentType.includes('application/json')) {
        data = await response.json();
      } else if (contentType.includes('text/')) {
        data = await response.text();
      } else {
        // For binary data, return base64
        const buffer = await response.arrayBuffer();
        data = {
          type: 'binary',
          contentType,
          size: buffer.byteLength,
          base64: btoa(String.fromCharCode(...new Uint8Array(buffer))),
        };
      }
    } catch {
      data = await response.text();
    }
    
    const proxyResponse: ProxyResponse = {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
      data,
      duration,
    };
    
    console.log(`[API Proxy] Response: ${response.status} ${response.statusText} (${duration}ms)`);
    
    return new Response(
      JSON.stringify(proxyResponse),
      { 
        status: 200, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.error(`[API Proxy] Error:`, error);
    
    let errorMessage = 'An error occurred';
    let statusCode = 500;
    
    if (error instanceof Error) {
      if (error.name === 'AbortError') {
        errorMessage = 'Request timed out';
        statusCode = 408;
      } else {
        errorMessage = error.message;
      }
    }
    
    const errorResponse: ProxyResponse = {
      status: statusCode,
      statusText: 'Error',
      headers: {},
      data: null,
      duration,
      error: errorMessage,
    };
    
    return new Response(
      JSON.stringify(errorResponse),
      { 
        status: 200, // Return 200 so client can handle the error in data
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
});
