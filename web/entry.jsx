import React from 'react';
import { createRoot } from 'react-dom/client';
import { flushSync } from 'react-dom';
import { registerDuckWebMCP } from './webmcp.mjs';
import '../PreviewPage.css';
import '../PreviewPage.jsx';

const PreviewPage = globalThis.__DUCK_PREVIEW_PAGE__;
globalThis.__DUCK_REGISTER_WEBMCP__ = options => registerDuckWebMCP({
  ...options,
  commit: action => flushSync(() => options.commit(action)),
});
if (typeof PreviewPage !== 'function') {
  throw new Error('PreviewPage browser entry was not registered');
}

createRoot(document.getElementById('root')).render(React.createElement(PreviewPage));
