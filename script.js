let recipes = [];

function generateRecipeTitle(filename) {
    // Remove file extension and split by dashes, then capitalize each word
    const name = filename.replace(/\.[^/.]+$/, '');
    return name.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
}

function parseFrontMatter(md) {
    const match = md.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
    if (!match) return { meta: {}, body: md };
    return { meta: jsyaml.load(match[1]) || {}, body: md.slice(match[0].length) };
}

// Image paths in front matter and markdown are relative to recipes/
function resolvePath(src) {
    return /^(https?:|data:|\/)/.test(src) ? src : 'recipes/' + src;
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
}

async function loadIndex() {
    const res = await fetch('recipes/index.yml');
    if (!res.ok) { document.getElementById('recipe-list').textContent = 'Could not load recipe index.'; return }
    const files = jsyaml.load(await res.text()) || [];
    recipes = await Promise.all(files.map(async file => {
        const r = await fetch('recipes/' + file);
        const { meta, body } = parseFrontMatter(r.ok ? await r.text() : '');
        return {
            file,
            body,
            title: meta.title || generateRecipeTitle(file),
            image: meta.image ? resolvePath(meta.image) : null,
            time: meta.time,
            servings: meta.servings,
        };
    }));
}

function thumbnail(recipe) {
    if (recipe.image) {
        const img = el('img', 'thumb');
        img.src = recipe.image;
        img.alt = '';
        img.loading = 'lazy';
        return img;
    }
    return el('div', 'thumb placeholder', recipe.title.charAt(0));
}

function metaLine(recipe) {
    const parts = [];
    if (recipe.time) parts.push(recipe.time);
    if (recipe.servings) parts.push(recipe.servings + ' servings');
    return parts.join(' · ');
}

function renderList() {
    const list = document.getElementById('recipe-list');
    list.innerHTML = '';
    recipes
        .sort((a, b) => a.title.localeCompare(b.title))
        .forEach(recipe => {
            const li = el('li');
            const a = el('a', 'recipe-row');
            a.href = '#' + recipe.file;
            const info = el('div', 'info');
            info.appendChild(el('span', 'title', recipe.title));
            const meta = metaLine(recipe);
            if (meta) info.appendChild(el('span', 'meta', meta));
            a.append(thumbnail(recipe), info);
            li.appendChild(a);
            list.appendChild(li);
        });

    document.getElementById('list-view').hidden = false;
    document.getElementById('recipe-view').hidden = true;
}

function renderRecipe(file) {
    const recipe = recipes.find(r => r.file === file);
    const view = document.getElementById('recipe-view');
    view.innerHTML = '';
    const back = el('a', 'back-link', '← All recipes');
    back.href = '#';
    view.appendChild(back);

    if (!recipe) {
        view.appendChild(el('p', null, 'Could not load recipe.'));
    } else {
        if (recipe.image) {
            const hero = el('img', 'hero');
            hero.src = recipe.image;
            hero.alt = recipe.title;
            view.appendChild(hero);
        }
        view.appendChild(el('h1', 'recipe-title', recipe.title));
        const meta = metaLine(recipe);
        if (meta) view.appendChild(el('div', 'recipe-meta meta', meta));
        // Title is shown above, so drop the markdown's leading H1
        const body = el('div', 'recipe-body');
        body.innerHTML = marked.parse(recipe.body.replace(/^\s*# .*\n/, ''));
        body.querySelectorAll('img').forEach(img => img.src = resolvePath(img.getAttribute('src')));
        view.appendChild(body);
    }

    document.getElementById('list-view').hidden = true;
    view.hidden = false;
    window.scrollTo(0, 0);
}

function route() {
    const hash = decodeURIComponent(location.hash.replace('#', ''));
    if (hash) renderRecipe(hash);
    else renderList();
}

window.addEventListener('hashchange', route);
loadIndex().then(route);
