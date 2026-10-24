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
            author: meta.author,
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

// Wrap each H2 and the content under it in an open <details> block
function makeSectionsCollapsible(body) {
    const sections = [];
    body.querySelectorAll('h2').forEach(h2 => {
        const details = el('details', 'section');
        details.open = true;
        const summary = el('summary');
        const content = el('div', 'section-content');
        h2.replaceWith(details);
        summary.appendChild(h2);
        details.append(summary, content);
        while (details.nextSibling && details.nextSibling.nodeName !== 'H2') {
            content.appendChild(details.nextSibling);
        }
        summary.addEventListener('click', e => {
            e.preventDefault();
            toggleSection(details, content);
        });
        sections.push({ title: h2.textContent, details, content });
    });
    return sections;
}

// Buttons rather than #anchors, since the hash is used for routing
function jumpLinks(sections) {
    const nav = el('nav', 'jump-links');
    sections.forEach(({ title, details, content }) => {
        const button = el('button', 'jump-link', title);
        button.type = 'button';
        button.onclick = () => {
            if (!details.open) toggleSection(details, content);
            details.scrollIntoView({ behavior: 'smooth', block: 'start' });
        };
        nav.appendChild(button);
    });
    return nav;
}

// Animate the content height, since <details> can't transition on its own
function toggleSection(details, content) {
    const opening = !details.open;
    if (opening) details.open = true;
    details.classList.toggle('collapsed', !opening);
    const full = content.scrollHeight + 'px';
    const anim = content.animate(
        { height: opening ? ['0px', full] : [full, '0px'], opacity: opening ? [0, 1] : [1, 0] },
        { duration: 200, easing: 'ease-out' }
    );
    anim.onfinish = () => { if (!opening) details.open = false; };
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
        if (recipe.author) view.appendChild(el('p', 'recipe-author', 'by ' + recipe.author));
        const meta = metaLine(recipe);
        if (meta) view.appendChild(el('div', 'recipe-meta meta', meta));
        // Title is shown above, so drop the markdown's leading H1
        const body = el('div', 'recipe-body');
        body.innerHTML = marked.parse(recipe.body.replace(/^\s*# .*\n/, ''));
        body.querySelectorAll('img').forEach(img => img.src = resolvePath(img.getAttribute('src')));
        // Intro text before the first section goes above the divider
        const description = el('div', 'recipe-description');
        while (body.firstChild && body.firstChild.nodeName !== 'H2') description.appendChild(body.firstChild);
        if (description.textContent.trim()) view.appendChild(description);
        view.appendChild(el('hr', 'divider'));
        const sections = makeSectionsCollapsible(body);
        if (sections.length) view.appendChild(jumpLinks(sections));
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
