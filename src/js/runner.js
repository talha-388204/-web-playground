// runner.js

const iframe = document.getElementById('live-preview');
const consoleLogs = document.getElementById('console-logs');
// match the checkbox id used in the UI
const autoRunCheckbox = document.getElementById('chk-autorun');

function runCode(currentProject) {
    // Get content from playgroundAPI if available
    const html = currentProject && currentProject.files
        ? (currentProject.files.find(f => f.type === 'html') || {}).content
        : (window.playgroundAPI ? window.playgroundAPI.getEditorContent('html') : '');

    const css = currentProject && currentProject.files
        ? currentProject.files.filter(f => f.type === 'css').map(f => f.content).join('\n')
        : (window.playgroundAPI ? window.playgroundAPI.getEditorContent('css') : '');

    const js = currentProject && currentProject.files
        ? currentProject.files.filter(f => f.type === 'javascript').map(f => f.content).join('\n')
        : (window.playgroundAPI ? window.playgroundAPI.getEditorContent('javascript') : '');

    clearConsole();

    const consoleHookScript = `
        (function(){
            ['log','warn','error'].forEach(function(method){
                var original = console[method];
                console[method] = function(){
                    var args = Array.prototype.slice.call(arguments);
                    try {
                        window.parent.postMessage({ type: 'console', logType: method, data: args.map(function(a){ try { return JSON.stringify(a); } catch(e){ return String(a); } }) }, '*');
                    } catch(e){}
                    original.apply(console, arguments);
                };
            });
            window.onerror = function(msg, url, line, col, error){
                try { window.parent.postMessage({ type: 'console', logType: 'error', data: ['Uncaught Error: '+msg+' (line '+line+')'] }, '*'); } catch(e){}
            };
        })();
    `;

    const finalDoc = (html || '<!doctype html><html><head></head><body><h3>No HTML</h3></body></html>')
        .replace('</head>', `<style>${css}</style><script>${consoleHookScript}<\/script></head>`) 
        .replace('</body>', `<script>${js}<\/script></body>`);

    if (iframe) {
        iframe.srcdoc = finalDoc;
        iframe.onload = () => {
            const perfEl = document.getElementById('perf-info');
            if (perfEl) perfEl.textContent = `Rendered at ${new Date().toLocaleTimeString()}`;
        };
    }
}

function clearConsole() {
    if (consoleLogs) consoleLogs.innerHTML = '';
}

// expose runCode so other scripts can call it
window.runCode = runCode;