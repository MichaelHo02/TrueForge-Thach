import React from 'react';
import { createRoot } from 'react-dom/client';
import '../PreviewPage.css';
import '../PreviewPage.jsx';

const PreviewPage = globalThis.__DUCK_PREVIEW_PAGE__;
if (typeof PreviewPage !== 'function') {
  throw new Error('PreviewPage browser entry was not registered');
}

createRoot(document.getElementById('root')).render(React.createElement(PreviewPage));
