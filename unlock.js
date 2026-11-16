'use strict';
const form = document.getElementById('entry');
const input = document.getElementById('password');
const status = document.getElementById('status');
const button = form.querySelector('button');
const bytes = value => Uint8Array.from(atob(value), ch => ch.charCodeAt(0));
const blob = (content, type) => URL.createObjectURL(new Blob([content], { type }));
function openGuide(files) {
  const assets = {};
  for (const [name, encoded] of Object.entries(files.assets)) {
    assets[name] = blob(bytes(encoded), files.types[name]);
  }
  const sheet = files.css.replace(/url\("([^"]+)"\)/g, (match, name) =>
    assets[name] ? 'url("' + assets[name] + '")' : match);
  const css = blob(sheet, 'text/css');
  const data = blob(files.data + '\nwindow.KECC_ASSETS = ' + JSON.stringify(assets) + ';', 'text/javascript');
  const code = blob(files.app.replace("picture.src = 'assets/' + file;", "picture.src = window.KECC_ASSETS['assets/' + file];"), 'text/javascript');
  const markup = files.html
    .replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/i,
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; script-src blob:; style-src blob:; font-src blob:; img-src blob:; form-action \'none\'; base-uri \'none\'">')
    .replace('href="style.css"', 'href="' + css + '"')
    .replace('src="data.js"', 'src="' + data + '"')
    .replace('src="app.js"', 'src="' + code + '"');
  const frame = document.createElement('iframe');
  frame.title = '한국종합기술 신입 온보딩';
  frame.src = blob(markup, 'text/html;charset=UTF-8');
  document.body.replaceChildren(frame);
}
form.addEventListener('submit', async event => {
  event.preventDefault();
  status.textContent = '';
  button.disabled = true;
  try {
    const box = window.KECC_LOCKED;
    const keyMaterial = await crypto.subtle.importKey('raw', new TextEncoder().encode(input.value.trim()), 'PBKDF2', false, ['deriveKey']);
    const key = await crypto.subtle.deriveKey({name:'PBKDF2',salt:bytes(box.salt),iterations:600000,hash:'SHA-256'}, keyMaterial, {name:'AES-GCM',length:256}, false, ['decrypt']);
    const clear = await crypto.subtle.decrypt({name:'AES-GCM',iv:bytes(box.iv)}, key, bytes(box.content));
    input.value = '';
    openGuide(JSON.parse(new TextDecoder().decode(clear)));
  } catch {
    status.textContent = '비밀번호를 확인해 주세요.';
    input.select();
  } finally {
    button.disabled = false;
  }
});
