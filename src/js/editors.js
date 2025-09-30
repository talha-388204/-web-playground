// src/js/editors.js
// CodeMirror v5 initializer and tiny playground API

(function () {
    // ensure DOM is ready and CodeMirror exists
    function ready(fn) {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', fn);
        } else {
            fn();
        }
    }

    ready(() => {
        if (typeof CodeMirror === 'undefined') {
            console.error('CodeMirror is not loaded. Ensure the CDN scripts are included before editors.js');
            return;
        }

        const containers = {
            html: document.getElementById('html-editor'),
            css: document.getElementById('css-editor'),
            javascript: document.getElementById('js-editor')
        };

        const editors = {};
        let projectFiles = [];
        let changeCallback = null;

        function createEditor(type, initial) {
            const container = containers[type];
            if (!container) return null;

            // create a textarea for CodeMirror
            const ta = document.createElement('textarea');
            ta.value = initial || '';
            container.innerHTML = '';
            container.appendChild(ta);

            const mode = type === 'html' ? 'htmlmixed' : (type === 'css' ? 'css' : 'javascript');
            const cm = CodeMirror.fromTextArea(ta, {
                mode,
                theme: 'monokai',
                lineNumbers: true,
                autoCloseTags: true,
                autoCloseBrackets: true,
                matchBrackets: true,
                tabSize: 2,
                indentUnit: 2,
                extraKeys: { 'Ctrl-S': () => saveNow() }
            });

            cm.on('change', debounce(() => {
                if (typeof changeCallback === 'function') changeCallback(type, cm.getValue());
                // also call preview updater if available
                if (window.updatePreview) {
                    window.updatePreview(
                        editors.html ? editors.html.getValue() : '',
                        editors.css ? editors.css.getValue() : '',
                        editors.javascript ? editors.javascript.getValue() : ''
                    );
                }
            }, 300));

            return cm;
        }

        function initEditors(files) {
            projectFiles = files || [];
            // defensive sanitization: if any file content looks like UI wiring or a dumped script,
            // replace that file with a safe default to avoid raw UI code showing up in editors.
            function isLikelyUIInjection(text){
                if (!text || typeof text !== 'string') return false;
                const suspects = ['const splitter','onPointerDown(','setPointerCapture','splitter.addEventListener','pointerdown','document.documentElement.style.setProperty','function onPointerDown','window.addEventListener(\'pointer'];
                for (let s of suspects) if (text.indexOf(s) !== -1) return true;
                if (text.length > 50000) return true; // too large
                return false;
            }
            const map = {};
            projectFiles.forEach(f => { map[f.type] = f; });

            const defaultHtml = '<!doctype html>\n<html>\n<head>\n<meta charset="utf-8">\n</head>\n<body>\n</body>\n</html>';
            const defaultCss = '/* CSS */';
            const defaultJs = '// JavaScript';

            const htmlContent = map.html && typeof map.html.content === 'string' && !isLikelyUIInjection(map.html.content) ? map.html.content : defaultHtml;
            const cssContent = map.css && typeof map.css.content === 'string' && !isLikelyUIInjection(map.css.content) ? map.css.content : defaultCss;
            const jsContent = map.javascript && typeof map.javascript.content === 'string' && !isLikelyUIInjection(map.javascript.content) ? map.javascript.content : defaultJs;

            editors.html = createEditor('html', htmlContent);
            editors.css = createEditor('css', cssContent);
            editors.javascript = createEditor('javascript', jsContent);
        }

        function getEditorContent(type) {
            return editors[type] ? editors[type].getValue() : '';
        }

        function setEditorContent(type, content) {
            if (editors[type]) editors[type].setValue(content);
        }

        function onChange(fn) {
            changeCallback = fn;
        }

        function saveNow() {
            // trigger change callback immediately
            if (!projectFiles.length) return;
            ['html', 'css', 'javascript'].forEach(type => {
                const val = getEditorContent(type);
                const f = projectFiles.find(x => x.type === type);
                if (f) f.content = val;
            });
            if (typeof window.saveProject === 'function') window.saveProject(projectFiles);
        }

        // helper debounce
        function debounce(fn, t) {
            let id;
            return function () {
                clearTimeout(id);
                id = setTimeout(() => fn.apply(this, arguments), t);
            };
        }

        // expose a tiny API to other scripts
        window.playgroundAPI = {
            initEditors,
            getEditorContent,
            setEditorContent,
            onChange,
            saveNow,
            _internal: { editors, projectFiles }
        };

        // auto-init if there's a global initialProject variable
        if (window.initialProject && Array.isArray(window.initialProject.files)) {
            initEditors(window.initialProject.files);
        }
    });
})();