async function loadIndex() {
    const res = await fetch('recipes/index.yml');
    if (!res.ok) { document.getElementById('recipes').textContent = 'Could not load recipe index.'; return }
    const text = await res.text();
    const list = jsyaml.load(text);
    const container = document.getElementById('recipes');
    container.innerHTML = '';
    list.forEach(item => {
        const a = document.createElement('a');
        a.href = '#';
        a.className = 'recipe';
        a.textContent = item.title || item.file;
        a.onclick = (e) => { e.preventDefault(); loadRecipe(item.file); };
        container.appendChild(a);
    });
}

async function loadRecipe(file) {
    const res = await fetch('recipes/' + file);
    if (!res.ok) { document.getElementById('content').textContent = 'Could not load recipe.'; return }
    const md = await res.text();
    const html = marked.parse(md);
    document.getElementById('content').innerHTML = html;
    window.location.hash = file;
}

window.addEventListener('hashchange', () => { const f = location.hash.replace('#', ''); if (f) loadRecipe(f); });

loadIndex().then(() => {
    const f = location.hash.replace('#', ''); if (f) loadRecipe(f);
});
