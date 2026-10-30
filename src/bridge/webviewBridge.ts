/**
 * WebView2 Host Communication Bridge for SSMS Extension
 */

declare global {
  interface Window {
    chrome?: {
      webview?: {
        postMessage: (message: any) => void;
        addEventListener: (type: string, listener: (event: any) => void) => void;
        removeEventListener: (type: string, listener: (event: any) => void) => void;
      };
    };
  }
}

export interface HostMessage {
  type: 'LOAD_PLAN_XML' | 'LIVE_PROFILE_UPDATE' | 'FOCUS_NODE' | 'SET_THEME';
  payload: any;
}

export interface ClientMessage {
  type: 'NODE_SELECTED' | 'PLAN_LOADED' | 'REQUEST_LIVE_START' | 'REQUEST_LIVE_STOP' | 'EXPORT_DATA';
  payload: any;
}

export function isRunningInWebView2(): boolean {
  return typeof window !== 'undefined' && !!window.chrome?.webview;
}

export function postMessageToHost(message: ClientMessage): void {
  if (isRunningInWebView2()) {
    try {
      window.chrome!.webview!.postMessage(message);
    } catch (err) {
      console.error('[WebView2 Bridge] Failed to send message to SSMS host:', err);
    }
  } else {
    // In standalone browser mode, log message for debugging
    console.debug('[WebView2 Bridge (Mock)] Host Message:', message);
  }
}

export function registerHostMessageListener(
  handler: (msg: HostMessage) => void
): () => void {
  if (!isRunningInWebView2()) {
    return () => {};
  }

  const listener = (event: any) => {
    try {
      const data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data;
      if (data && data.type) {
        handler(data as HostMessage);
      }
    } catch (err) {
      console.error('[WebView2 Bridge] Error parsing message from host:', err);
    }
  };

  window.chrome!.webview!.addEventListener('message', listener);

  return () => {
    window.chrome?.webview?.removeEventListener('message', listener);
  };
}
