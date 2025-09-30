// Main JavaScript file for the Advanced Web Playground application

document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

function initializeApp() {
    // safe references
    const btnRun = document.getElementById('btn-run');
    const btnNew = document.getElementById('btn-new-project');
    const btnExport = document.getElementById('btn-export');
    const btnShare = document.getElementById('btn-share');

    if (btnRun) btnRun.addEventListener('click', runCode);
    if (btnNew) btnNew.addEventListener('click', createNewProject);
    if (btnExport) btnExport.addEventListener('click', exportProject);
    if (btnShare) btnShare.addEventListener('click', shareProject);

    // initialize editors when playgroundAPI is ready
    waitFor(() => window.playgroundAPI, () => {
        let project = loadProjectFromLocalStorage() || defaultProject();

        // sanitize loaded project to avoid accidental UI/script injection being displayed as editor content
        function isLikelyUIInjection(text){
            if (!text || typeof text !== 'string') return false;
            const suspects = ['const splitter', 'onPointerDown(', 'setPointerCapture', 'pointerdown', 'function onPointerDown', 'window.addEventListener(\'pointer', 'splitter.addEventListener', 'document.documentElement.style.setProperty'];
            for (let s of suspects) if (text.indexOf(s) !== -1) return true;
            // also treat extremely long single-file contents as suspicious (>50k chars)
            if (text.length > 50000) return true;
            return false;
        }

        function sanitizeProject(p){
            if (!p || !Array.isArray(p.files)) return defaultProject();
            // ensure expected file types present
            const types = ['html','css','javascript'];
            const map = {};
            p.files.forEach(f => { if (f && f.type) map[f.type] = f; });

            // if any file looks like it contains UI wiring code, reject and return default
            for (const t of types){
                const f = map[t];
                if (f && isLikelyUIInjection(f.content)) return defaultProject();
            }

            // normalize files array - ensure strings
            const files = types.map(t => {
                const f = map[t];
                return {
                    id: f && f.id ? f.id : `f-${t}`,
                    type: t,
                    content: f && typeof f.content === 'string' ? f.content : (t === 'html' ? defaultProject().files.find(x=>x.type==='html').content : (t === 'css' ? defaultProject().files.find(x=>x.type==='css').content : defaultProject().files.find(x=>x.type==='javascript').content))
                };
            });
            return { files };
        }

        const sanitized = sanitizeProject(project);
        // if sanitization replaced the project, persist the safe version
        if (JSON.stringify(sanitized) !== JSON.stringify(project)){
            saveProjectToLocalStorage(sanitized);
            project = sanitized;
        }

        const files = project.files || defaultProject().files;

        // put into global for convenience
        window.initialProject = { files };
        window.playgroundAPI.initEditors(files);

        // expose a simple saveProject bridge used by editors.saveNow
        window.saveProject = function(projectFiles){
            try{
                const p = { files: Array.isArray(projectFiles) ? projectFiles : (window.initialProject && window.initialProject.files ? window.initialProject.files : files) };
                saveProjectToLocalStorage(p);
            }catch(e){}
        };

        window.playgroundAPI.onChange((type, value) => {
            // persist change incrementally
            try{
                const p = loadProjectFromLocalStorage() || { files };
                const f = p.files && p.files.find(x => x.type === type);
                if (f) f.content = value;
                saveProjectToLocalStorage(p);
            }catch(e){}
        });
    });

    // listen for console messages from iframe
    window.addEventListener('message', (ev) => {
        try {
            const data = ev.data || {};
            if (data.type === 'console') {
                const el = document.getElementById('console-logs');
                if (!el) return;
                const div = document.createElement('div');
                div.className = `log ${data.logType}`;
                div.textContent = data.data.join(' ');
                el.appendChild(div);
            }
        } catch (e) {}
    });
}

function runCode() {
    if (!window.playgroundAPI) return;
    const html = window.playgroundAPI.getEditorContent('html') || '';
    const css = window.playgroundAPI.getEditorContent('css') || '';
    const js = window.playgroundAPI.getEditorContent('javascript') || '';
    updatePreview(html, css, js);
}

function updatePreview(html, css, js) {
    const iframe = document.getElementById('live-preview');
    if (!iframe) return;
    const doc = iframe.contentDocument || iframe.contentWindow.document;
    doc.open();
    doc.write(html + `<style>${css}</style><script>${js}<\/script>`);
    doc.close();
}

function createNewProject() {
    const starter = defaultProject();
    saveProjectToLocalStorage(starter);
    // reload editors
    if (window.playgroundAPI) {
        window.playgroundAPI.initEditors(starter.files);
    }
}

function exportProject() {
    const project = loadProjectFromLocalStorage();
    if (!project) return alert('No project to export');
    const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'project.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
}

function shareProject() {
    const project = loadProjectFromLocalStorage();
    if (!project) return alert('No project to share');
    try {
        const s = btoa(unescape(encodeURIComponent(JSON.stringify(project))));
        const url = `${location.origin}${location.pathname}#p=${s}`;
        window.prompt('Shareable link (copy):', url);
    } catch (err) {
        alert('Failed to create share link');
    }
}

function defaultProject() {
    return {
        files: [
            { id: 'f-html', type: 'html', content: '<!doctype html>\n<html>\n<head>\n<meta charset="utf-8">\n</head>\n<body>\n<h1>New Project</h1>\n</body>\n</html>' },
            { id: 'f-css', type: 'css', content: 'body { font-family: system-ui; }' },
            { id: 'f-js', type: 'javascript', content: 'console.log("ready");' }
        ]
    };
}

function waitFor(checkFn, cb, timeout = 3000) {
    const start = Date.now();
    (function loop() {
        if (checkFn()) return cb();
        if (Date.now() - start > timeout) return;
        setTimeout(loop, 50);
    })();
}