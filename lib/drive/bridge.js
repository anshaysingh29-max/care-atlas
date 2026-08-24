'use client';

const CHANNEL = 'careatlas-drive';
const RESPONSE_CHANNEL = 'careatlas-drive-response';
const READY_CHANNEL = 'careatlas-drive-ready';
const FRAME_ID = 'careatlas-drive-gateway-frame';
const REQUEST_TIMEOUT_MS = 90000;
const READY_TIMEOUT_MS = 20000;
let readyPromise = null;
let requestCounter = 0;
let gatewayMessageWindow = null;
let gatewayMessageOrigin = '';
const pending = new Map();

export function getDriveGatewayUrl() {
  return (process.env.NEXT_PUBLIC_DRIVE_GATEWAY_URL || '').trim();
}
export function isDriveGatewayConfigured() { return Boolean(getDriveGatewayUrl()); }

function isTrustedAppsScriptOrigin(origin) {
  try {
    const url = new URL(origin);
    if (url.protocol !== 'https:') return false;
    return url.hostname === 'script.google.com' || url.hostname === 'script.googleusercontent.com' || url.hostname.endsWith('.googleusercontent.com');
  } catch { return false; }
}

function ensureMessageListener() {
  if (typeof window === 'undefined' || window.__careAtlasDriveListenerInstalled) return;
  window.__careAtlasDriveListenerInstalled = true;
  window.addEventListener('message', event => {
    const message = event.data || {};
    if (message.channel === READY_CHANNEL) {
      if (!event.source || !isTrustedAppsScriptOrigin(event.origin)) return;
      gatewayMessageWindow = event.source;
      gatewayMessageOrigin = event.origin;
      window.__careAtlasDriveReady = true;
      window.dispatchEvent(new CustomEvent('careatlas-drive-ready-internal'));
      return;
    }
    if (message.channel !== RESPONSE_CHANNEL || !message.id || !gatewayMessageWindow) return;
    if (event.source !== gatewayMessageWindow || event.origin !== gatewayMessageOrigin) return;
    const entry = pending.get(message.id);
    if (!entry) return;
    pending.delete(message.id);
    clearTimeout(entry.timer);
    if (message.ok) entry.resolve(message.result);
    else {
      const error = new Error(message.error || 'The CareAtlas document gateway returned an error.');
      error.code = message.code || 'careatlas/drive-gateway-error';
      entry.reject(error);
    }
  });
}

function ensureFrame() {
  if (typeof window === 'undefined') return Promise.reject(new Error('The document gateway is only available in the browser.'));
  const gatewayUrl = getDriveGatewayUrl();
  if (!gatewayUrl) {
    const error = new Error('The Google Drive document gateway is not configured yet.');
    error.code = 'careatlas/drive-not-configured';
    return Promise.reject(error);
  }
  ensureMessageListener();
  if (gatewayMessageWindow && window.__careAtlasDriveReady) return Promise.resolve();
  if (readyPromise) return readyPromise;

  readyPromise = new Promise((resolve, reject) => {
    let frame = document.getElementById(FRAME_ID);
    if (!frame) {
      gatewayMessageWindow = null;
      gatewayMessageOrigin = '';
      window.__careAtlasDriveReady = false;
      frame = document.createElement('iframe');
      frame.id = FRAME_ID;
      frame.title = 'CareAtlas secure document gateway';
      frame.src = gatewayUrl;
      frame.setAttribute('aria-hidden', 'true');
      frame.tabIndex = -1;
      frame.style.position = 'fixed';
      frame.style.width = '1px';
      frame.style.height = '1px';
      frame.style.opacity = '0';
      frame.style.pointerEvents = 'none';
      frame.style.border = '0';
      frame.style.left = '-9999px';
      document.body.appendChild(frame);
    }
    let settled = false;
    let timer = null;
    const cleanup = () => {
      window.removeEventListener('careatlas-drive-ready-internal', onReady);
      if (timer) clearTimeout(timer);
    };
    const onReady = () => {
      if (settled) return;
      settled = true;
      cleanup();
      resolve();
    };
    window.addEventListener('careatlas-drive-ready-internal', onReady);
    if (window.__careAtlasDriveReady && gatewayMessageWindow) { onReady(); return; }
    timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      cleanup();
      readyPromise = null;
      reject(new Error('Could not connect to the CareAtlas Google Drive gateway.'));
    }, READY_TIMEOUT_MS);
  });
  return readyPromise;
}

export async function callDriveGateway(action, payload = {}) {
  await ensureFrame();
  if (!gatewayMessageWindow || !gatewayMessageOrigin) throw new Error('The CareAtlas Drive gateway connected but its secure communication channel was not established.');
  const id = `ca-drive-${Date.now()}-${++requestCounter}`;
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      pending.delete(id);
      reject(new Error('The document request timed out. Please try again.'));
    }, REQUEST_TIMEOUT_MS);
    pending.set(id, { resolve, reject, timer });
    gatewayMessageWindow.postMessage({ channel: CHANNEL, id, action, payload }, gatewayMessageOrigin);
  });
}

export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const value = String(reader.result || '');
      resolve(value.includes(',') ? value.split(',')[1] : value);
    };
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

export function base64ToBlob(base64, mimeType) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) bytes[index] = binary.charCodeAt(index);
  return new Blob([bytes], { type: mimeType || 'application/octet-stream' });
}
