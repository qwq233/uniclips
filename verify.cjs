const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const root = __dirname;
const scripts = ['combat.js', 'globals.js', 'projects.js', 'main.js'];
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const html = read('public/index2.html').replace(/<!--[\s\S]*?-->/g, '');
assert.match(html, /<html lang="zh-CN">/);
assert.match(html, /<meta charset="utf-8">/);
const visible = html.replace(/<[^>]*>/g, '').replace(/&(?:#\d+|\w+);?/g, '');
assert.ok(!/[A-Za-z]{2}/.test(visible), `Untranslated HTML: ${visible.match(/[A-Za-z]{2}[^\n]*/g)}`);
assert.doesNotMatch(html, /<script[^>]+src="https?:/);
for (const [, resource] of html.matchAll(/(?:src|href)="([^"?#]+)(?:[^" ]*)"/g)) {
    if (!resource.startsWith('https:')) assert.ok(fs.existsSync(path.join(root, 'public', resource)), resource);
}
assert.equal(fs.statSync(path.join(root, 'public/assets/test.mp3')).size, fs.statSync(path.join(root, 'upstream/test.mp3')).size);

// The translation may change literals and colors, but never executable structure.
const tokens = /\/\/[^\n]*|\/\*[\s\S]*?\*\/|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g;
const structure = source => source.replace(tokens, token => token.startsWith('/') ? '' : '""').replace(/\s+/g, '');
for (const file of scripts) {
    new vm.Script(read(`public/${file}`), { filename: file });
    assert.equal(structure(read(`public/${file}`)), structure(read(`upstream/${file}`)), file);
    const domIds = source => [...source.matchAll(/getElementById\((["'])(.*?)\1\)/g)].map(match => match[2]);
    assert.deepEqual(domIds(read(`public/${file}`)), domIds(read(`upstream/${file}`)), `${file} DOM IDs`);
}
assert.match(read('public/main.js'), /threnodyAudio.src = "assets\/test.mp3"/);
assert.doesNotMatch(read('public/main.js'), /payoffCell\w+Element.style.backgroundColor = "(?:white|LightGrey)"/);
assert.match(read('public/interface.css'), /color-scheme: dark/);

// A small DOM double lets the original scripts run without launching a browser.
function game(folder, storage = new Map()) {
    const elements = new Map();
    class Element {
        constructor(tag = 'div') {
            this.tagName = tag;
            this.style = {};
            this.childNodes = [];
            this.value = 0;
            this.innerHTML = '';
            this.textContent = '';
        }
        setAttribute(name, value) {
            this[name] = value;
            if (name === 'id') elements.set(value, this);
        }
        appendChild(node) { this.childNodes.push(node); node.parentNode = this; return node; }
        insertBefore(node) { this.childNodes.unshift(node); node.parentNode = this; return node; }
        removeChild(node) {
            const index = this.childNodes.indexOf(node);
            assert.ok(index >= 0, 'Removing an unattached node');
            this.childNodes.splice(index, 1);
            if (node.id) elements.delete(node.id);
            node.parentNode = null;
        }
        getContext() { return { fillRect() {} }; }
        get firstChild() { return this.childNodes[0] || null; }
    }
    for (const [, id] of html.matchAll(/\bid\s*=\s*["']?([^\s"'>]+)/g)) elements.set(id, new Element());
    elements.get('investStrat').value = 'low';
    elements.get('stratPicker').value = 10;
    const intervals = [];
    const timeouts = [];
    let seed = 1234567;
    const math = Object.create(Math);
    math.random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    const context = vm.createContext({
        console, Math: math,
        document: {
            getElementById: id => elements.get(id) || null,
            createElement: tag => new Element(tag),
            createTextNode: text => ({ textContent: String(text) }),
        },
        localStorage: {
            getItem: key => storage.get(key) ?? null,
            setItem: (key, value) => storage.set(key, value),
            removeItem: key => storage.delete(key),
        },
        setInterval: (callback, delay) => (intervals.push({ callback, delay }), intervals.length),
        clearInterval() {},
        setTimeout: callback => (timeouts.push(callback), timeouts.length),
        clearTimeout() {},
        confirm: () => true,
        location: { reload() {} },
        Audio: class { addEventListener() {} play() { return Promise.resolve(); } },
    });
    context.window = context;
    for (const [id, element] of elements) context[id] = element;
    for (const file of scripts) vm.runInContext(read(`${folder}/${file}`), context, { filename: file, timeout: 3000 });
    context.__intervals = intervals;
    context.__timeouts = timeouts;
    const run = code => vm.runInContext(code, context, { timeout: 5000 });
    const tick = () => run('__intervals.forEach(timer => timer.callback())');
    const drain = () => run('for (var steps = 0; __timeouts.length && steps < 10000; steps++) __timeouts.shift()(); if (__timeouts.length) throw Error("Timer queue did not settle")');
    return { context, elements, storage, run, tick, drain };
}

const original = game('upstream');
const chinese = game('public');
const numbers = instance => instance.run('JSON.stringify(Object.fromEntries(Object.entries(this).filter(([key,value]) => typeof value === "number" || typeof value === "boolean")))');
const same = () => assert.equal(numbers(chinese), numbers(original));
same();
for (const instance of [original, chinese]) {
    instance.run('clipClick(100); funds=10000; buyWire(); makeClipper(); buyAds();');
    for (let i = 0; i < 100; i++) instance.tick();
}
same();
for (let i = 0; i < chinese.context.projects.length; i++) {
    const project = chinese.context.projects[i];
    assert.doesNotMatch(project.title + project.description + project.priceTag, /[A-Za-z]{2}/, project.id);
    assert.equal(project.id, original.context.projects[i].id);
    assert.equal(project.trigger.toString(), original.context.projects[i].trigger.toString());
    assert.equal(project.cost.toString(), original.context.projects[i].cost.toString());
    for (const instance of [original, chinese]) {
        instance.run(`displayProjects(projects[${i}])`);
        assert.ok(instance.elements.get(project.id));
    }
}
for (const instance of [original, chinese]) {
    instance.run('strats = allStrats.slice(); allStrats.forEach(s => s.active=1); pick=0; newTourney(); runTourney();');
    instance.drain();
}
same();
assert.doesNotMatch(chinese.elements.get('readout1').innerHTML, /[A-Za-z]{2}/);
for (const instance of [original, chinese]) {
    instance.run('humanFlag=0; unusedClips=1e25; makeFactory(); makeHarvester(10); makeWireDrone(10); makeFarm(10); makeBattery(10); updatePower();');
    instance.tick();
    instance.run('spaceFlag=1; probeTrust=20; raiseProbeSpeed(); raiseProbeNav(); makeProbe(); probeCount=1e8; drifterCount=1e8; createBattle();');
    instance.tick();
}
same();
assert.match(chinese.elements.get('battleName').innerHTML, /^漂移者进攻/);
assert.equal(chinese.run('timeCruncher(366100)'), '1 小时 1 分钟 1 秒');
for (const number of [0, 999, 1000, 1e6, 1e15, 3e55, 1e300]) {
    assert.doesNotMatch(chinese.context.spellf(number), /[A-Za-z]/);
    assert.equal(parseFloat(chinese.context.spellf(number).replaceAll(',', '')), parseFloat(original.context.spellf(number).replaceAll(',', '')));
}
for (const instance of [original, chinese]) instance.run('save(); save1(); save2();');
assert.deepEqual([...chinese.storage.keys()], [...original.storage.keys()]);
const restored = game('public', new Map(chinese.storage));
assert.equal(restored.context.clips, chinese.context.clips);
assert.equal(restored.context.strats.length, 8);
assert.doesNotMatch(restored.context.strats.map(s => s.name).join(''), /[A-Za-z]/);
console.log(`PASS: local assets, syntax, ${chinese.context.projects.length} translated projects, unchanged rules, production, tournaments, power, exploration, battles, number/time units and save/load.`);
