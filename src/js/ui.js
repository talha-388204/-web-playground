// src/js/ui.js
// Moved UI wiring from index.html to an external file to avoid inline </script> parsing issues
(function(){
    function init(){
        // Startup migration & sanitizer:
        // - If an old key 'playground-project' exists, migrate it to the canonical storage key used by storage.js
        // - If the saved project contains suspicious UI wiring code in any file, clear saved state once and reload
        try{
            const alreadyReset = sessionStorage.getItem('playground-reset-done');

            // migrate legacy key if present
            try{
                const legacy = localStorage.getItem('playground-project');
                const canonical = loadProjectFromLocalStorage();
                if (legacy && !canonical){
                    try{
                        const parsed = JSON.parse(legacy);
                        if (parsed && parsed.files) saveProjectToLocalStorage(parsed);
                        localStorage.removeItem('playground-project');
                    }catch(e){}
                }
            }catch(e){}

            // now inspect the canonical saved project (parsed object)
            const saved = loadProjectFromLocalStorage();
            if (saved && !alreadyReset){
                const suspects = ['const splitter','onPointerDown(','setPointerCapture','splitter.addEventListener','pointerdown','document.documentElement.style.setProperty','function onPointerDown','window.addEventListener(\'pointer'];
                const files = Array.isArray(saved.files) ? saved.files : [];
                for (const f of files){
                    if (!f || typeof f.content !== 'string') continue;
                    const lower = f.content;
                    for (const s of suspects){
                        if (lower.indexOf(s) !== -1){
                            try{ clearProjectFromLocalStorage(); sessionStorage.setItem('playground-reset-done','1'); }catch(e){}
                            try{ location.reload(); }catch(e){}
                            return; // stop init while reloading
                        }
                    }
                }
            }
        }catch(e){}
        // small helper: toast/snackbar
        function showToast(msg, ms=2200){
            const box = document.createElement('div');
            box.textContent = msg;
            box.style.background='rgba(2,8,10,0.9)';
            box.style.color='#dff7ea';
            box.style.padding='10px 14px';
            box.style.borderRadius='10px';
            box.style.marginTop='8px';
            box.style.boxShadow='0 8px 30px rgba(0,0,0,0.6)';
            box.style.pointerEvents='auto';
            const root = document.getElementById('snackbar'); if(!root) return; root.appendChild(box);
            setTimeout(()=>{ box.style.transition='opacity 300ms'; box.style.opacity='0'; setTimeout(()=>box.remove(),300); }, ms);
        }

        function $(id){return document.getElementById(id)}
        const runBtn = $('btn-run');
        const autorun = $('chk-autorun');
        const autosave = $('autosave');
        const clearConsoleBtn = $('btn-clear-console');
        const consoleEl = $('console-logs');
        const themeBtn = $('btn-theme');
        const previewStatus = $('preview-status');
        const openPreview = $('btn-open-preview');

        if(runBtn) runBtn.addEventListener('click', ()=>{ if(window.runCode) window.runCode(); else if(previewStatus) previewStatus.textContent='Runner not ready'; });
        // New / Import / Export / Share
        const btnNew = $('btn-new-project');
        const btnExport = $('btn-export');
    const btnReset = $('btn-reset');
        const btnShare = $('btn-share');
        const btnImport = $('btn-import');
        const importFile = $('import-file');

        if(btnNew) btnNew.addEventListener('click', ()=>{
            const starter = { files:[ {id:'f-html',type:'html',content:'<!doctype html>\n<html>\n<head>\n<meta charset="utf-8">\n</head>\n<body>\n<h1>New Project</h1>\n</body>\n</html>'},{id:'f-css',type:'css',content:'body{font-family:system-ui}'} ,{id:'f-js',type:'javascript',content:'console.log("ready")'} ]};
            if(window.playgroundAPI) window.playgroundAPI.initEditors(starter.files);
            try{ saveProjectToLocalStorage(starter); }catch(e){}
            showToast('New project created');
        });

        if(btnExport) btnExport.addEventListener('click', ()=>{
            const project = loadProjectFromLocalStorage();
            const blob = new Blob([JSON.stringify(project || { files: [] }, null, 2)], {type:'application/json'});
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href=url; a.download='project.json'; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
            showToast('Project exported');
        });

        if (btnReset) btnReset.addEventListener('click', ()=>{
            if (!confirm('Reset saved project and restore defaults? This cannot be undone.')) return;
            try{ clearProjectFromLocalStorage(); sessionStorage.setItem('playground-reset-done','1'); }catch(e){}
            try{ location.reload(); }catch(e){}
        });

        if(btnImport) btnImport.addEventListener('click', ()=>{ if(importFile) importFile.click(); });
        if(importFile) importFile.addEventListener('change', (e)=>{
            const f = e.target.files && e.target.files[0]; if(!f) return; const reader = new FileReader(); reader.onload = ()=>{ try{ const data = JSON.parse(reader.result); if(data && data.files){ try{ saveProjectToLocalStorage(data); }catch(err){} if(window.playgroundAPI) window.playgroundAPI.initEditors(data.files); showToast('Project imported'); } else showToast('Invalid project file'); }catch(err){ showToast('Failed to import'); }}; reader.readAsText(f);
        });

        if(btnShare) btnShare.addEventListener('click', ()=>{
            const project = loadProjectFromLocalStorage();
            if(!project) return showToast('No project to share');
            try{ const s = btoa(unescape(encodeURIComponent(JSON.stringify(project)))); const url = `${location.origin}${location.pathname}#p=${s}`; navigator.clipboard && navigator.clipboard.writeText(url); showToast('Share link copied'); }catch(e){ showToast('Share failed'); }
        });

        // keyboard shortcuts
        window.addEventListener('keydown', (e)=>{
            const isMac = navigator.platform.toUpperCase().indexOf('MAC')>=0;
            if((e.ctrlKey || (isMac && e.metaKey)) && e.key === 'Enter'){ e.preventDefault(); if(window.runCode) window.runCode(); }
            if((e.ctrlKey || (isMac && e.metaKey)) && (e.key === 's' || e.key === 'S')){ e.preventDefault(); if(window.playgroundAPI && window.playgroundAPI.saveNow){ window.playgroundAPI.saveNow(); showToast('Saved'); } }
        });
        if(autorun) autorun.addEventListener('change', ()=>{ localStorage.setItem('playground-autorun', autorun.checked ? '1':'0'); });
        if(clearConsoleBtn) clearConsoleBtn.addEventListener('click', ()=>{ if(consoleEl) consoleEl.innerHTML=''; });

        // theme toggle simple (dark/light)
        if(themeBtn) themeBtn.addEventListener('click', ()=>{
            const now = localStorage.getItem('playground-theme') === 'light' ? 'dark' : 'light';
            localStorage.setItem('playground-theme', now);
            document.documentElement.setAttribute('data-theme', now);
        });

        // open preview in new tab
        if(openPreview) openPreview.addEventListener('click', ()=>{
            const html = window.playgroundAPI ? window.playgroundAPI.getEditorContent('html') : '';
            const css = window.playgroundAPI ? window.playgroundAPI.getEditorContent('css') : '';
            const js = window.playgroundAPI ? window.playgroundAPI.getEditorContent('javascript') : '';
            const w = window.open();
            w.document.write(html + `<style>${css}</style><script>${js}<\/script>`);
            w.document.close();
        });

    // autosave indicator (update from playgroundAPI.saveNow if available)
    window.showAutosave = function(status){ if(autosave) autosave.textContent = 'Autosave: '+status };

        // splitter drag
        (function(){
            const splitter = $('splitter'); if(!splitter) return;
            let dragging=false, startX=0, startW=0;
            const setWidth = (w) => document.documentElement.style.setProperty('--preview-width', w + 'px');

            function onPointerDown(e){
                dragging = true;
                startX = e.clientX;
                startW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--preview-width')) || 420;
                if (e.pointerId && typeof splitter.setPointerCapture === 'function'){
                    try{ splitter.setPointerCapture(e.pointerId); }catch(err){}
                }
            }

            function onPointerMove(e){
                if(!dragging) return;
                const dx = startX - e.clientX;
                const newW = Math.max(220, startW + dx);
                setWidth(newW);
            }

            function onPointerUp(e){
                dragging = false;
                if (e.pointerId && typeof splitter.releasePointerCapture === 'function'){
                    try{ splitter.releasePointerCapture(e.pointerId); }catch(err){}
                }
            }

            if (window.PointerEvent){
                splitter.addEventListener('pointerdown', onPointerDown);
                window.addEventListener('pointermove', onPointerMove);
                window.addEventListener('pointerup', onPointerUp);
            } else {
                // fallback for mouse events
                splitter.addEventListener('mousedown', (e)=>{
                    dragging = true; startX = e.clientX; startW = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--preview-width')) || 420;
                    function mm(ev){ onPointerMove(ev); }
                    function mu(ev){ onPointerUp(ev); window.removeEventListener('mousemove', mm); window.removeEventListener('mouseup', mu); }
                    window.addEventListener('mousemove', mm);
                    window.addEventListener('mouseup', mu);
                });
            }
        })();

        // receive console messages from runner (already wired in app.js)
        window.addEventListener('message', (ev)=>{
            try{
                const data = ev.data || {};
                if (data.type === 'console' && consoleEl) {
                    const d = document.createElement('div');
                    d.className = 'log ' + (data.logType || 'log');
                    // guard if data.data is not an array
                    if (Array.isArray(data.data)) {
                        d.textContent = data.data.join(' ');
                    } else if (data.data !== undefined) {
                        d.textContent = String(data.data);
                    } else {
                        d.textContent = '';
                    }
                    consoleEl.appendChild(d);
                    consoleEl.scrollTop = consoleEl.scrollHeight;
                }
            } catch (e) {
                // ignore malformed messages
            }
        });

        // restore autorun
        const savedAuto = localStorage.getItem('playground-autorun'); if(savedAuto && autorun){ autorun.checked = savedAuto === '1' }
        const savedTheme = localStorage.getItem('playground-theme'); if(savedTheme) document.documentElement.setAttribute('data-theme', savedTheme);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
