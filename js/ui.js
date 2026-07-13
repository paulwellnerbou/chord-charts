// Shared UI primitives: modal dialogs, dropdown menus, steppers, button feedback.

// Runs fn right after the next paint; the setTimeout fallback still fires on
// hidden pages, where rAF never runs.
function afterNextPaint(fn){
  let done = false;
  const run = ()=>{
    if(done) return;
    done = true;
    clearTimeout(fallback);
    fn();
  };
  const fallback = setTimeout(run, 100);
  requestAnimationFrame(()=> setTimeout(run, 0));
}

function flashButton(btnEl, text){
  if(btnEl._flashTimeout) clearTimeout(btnEl._flashTimeout);
  btnEl.querySelector('.card-menu-btn-label').textContent = text;
  btnEl.classList.add('is-flash');
  btnEl.disabled = true;
  btnEl._flashTimeout = setTimeout(()=>{
    btnEl.classList.remove('is-flash');
    btnEl.disabled = false;
  }, 1300);
}

function flashButtonText(btnEl, text){
  if(btnEl._flashTimeout) clearTimeout(btnEl._flashTimeout);
  // overlay the feedback over the invisible label so the button keeps its width
  btnEl.querySelector('.btn-label-flash').textContent = text;
  btnEl.classList.add('is-flash');
  // disabling a focused button drops focus to <body>; hand it back afterwards
  // (unless the user moved on) so keyboard flows continue from the button
  const hadFocus = document.activeElement === btnEl;
  btnEl.disabled = true;
  btnEl._flashTimeout = setTimeout(()=>{
    btnEl.classList.remove('is-flash');
    btnEl.disabled = false;
    if(hadFocus && document.activeElement === document.body){
      try{ btnEl.focus({ preventScroll:true }); }catch(err){}
    }
  }, 1300);
}

// One lifecycle for every dialog: backdrop click, Escape, Tab containment
// (aria-modal promises it), and focus restore to the opener on close.
// opts.onEscape may consume an Escape (return true) to close inner UI first;
// opts.onClose runs before focus restore; opts.focusFallback receives focus
// when the opener is gone or hidden by the time the dialog closes.
function createModal(el, opts = {}){
  let opener = null;
  const isOpen = ()=> !el.hidden;

  function onKeydown(e){
    if(e.key === 'Escape'){
      if(opts.onEscape && opts.onEscape()) return;
      close();
      return;
    }
    if(e.key === 'Tab'){
      const list = [...el.querySelectorAll('button:not(:disabled), input:not(:disabled), a[href]')];
      if(!list.length) return;
      const first = list[0], last = list[list.length - 1];
      const active = document.activeElement;
      if(e.shiftKey && (active === first || !el.contains(active))){
        e.preventDefault(); last.focus();
      } else if(!e.shiftKey && (active === last || !el.contains(active))){
        e.preventDefault(); first.focus();
      }
    }
  }

  // Returns false when already open so callers can re-render in place; an
  // explicit openerEl still replaces the stored one (the sheet may have
  // rebuilt the original button), while argless redundant calls must not
  // clobber it with an element inside the dialog.
  function open(openerEl){
    if(isOpen()){
      if(openerEl) opener = openerEl;
      return false;
    }
    opener = openerEl || document.activeElement;
    el.hidden = false;
    document.addEventListener('keydown', onKeydown);
    return true;
  }

  function close(o = {}){
    if(!isOpen()) return;
    el.hidden = true;
    document.removeEventListener('keydown', onKeydown);
    const restore = opener;
    opener = null;
    if(opts.onClose) opts.onClose();
    if(o.restoreFocus === false) return;
    if(restore && restore.isConnected && restore.offsetParent !== null){
      try{ restore.focus(); }catch(err){}
      // silent focus() failures (element not focusable) must not strand focus
      if(document.activeElement === restore) return;
    }
    if(opts.focusFallback) opts.focusFallback();
  }

  el.addEventListener('click', e=>{ if(e.target === el) close(); });
  return { open, close, isOpen };
}

// Dropdown anchored to its trigger: wrap gets .open, the trigger toggles, and
// a document-level click outside closes it. opts.onOpen runs before opening
// so the menu can be (re)built with fresh state.
function createMenu(wrap, btn, opts = {}){
  const onDocClick = e=>{ if(!wrap.contains(e.target)) close(); };
  const isOpen = ()=> wrap.classList.contains('open');
  function open(){
    if(opts.onOpen) opts.onOpen();
    wrap.classList.add('open');
    btn.setAttribute('aria-expanded','true');
    document.addEventListener('click', onDocClick);
  }
  function close(){
    wrap.classList.remove('open');
    btn.setAttribute('aria-expanded','false');
    document.removeEventListener('click', onDocClick);
  }
  btn.addEventListener('click', ()=>{ isOpen() ? close() : open(); });
  return { open, close, isOpen };
}

// Wires a ± stepper's buttons and arrow keys to step(delta). Expects the
// baseId + 'Minus'/'Plus'/'Stepper' id convention.
function initStepper(baseId, step){
  document.getElementById(baseId + 'Minus').addEventListener('click', ()=> step(-1));
  document.getElementById(baseId + 'Plus').addEventListener('click', ()=> step(1));
  document.getElementById(baseId + 'Stepper').addEventListener('keydown', e=>{
    if(e.key==='ArrowUp' || e.key==='ArrowRight'){ e.preventDefault(); step(1); }
    else if(e.key==='ArrowDown' || e.key==='ArrowLeft'){ e.preventDefault(); step(-1); }
  });
}

// Retriggers the value badge's bump animation; the reflow read restarts it.
function bumpValue(el){
  el.classList.remove('bump');
  void el.offsetWidth;
  el.classList.add('bump');
}

function setupInfoPopover(wrapId, btnId){
  const wrap = document.getElementById(wrapId);
  const btn = document.getElementById(btnId);
  const onDocClick = e=>{ if(!wrap.contains(e.target)) setOpen(false); };
  function setOpen(open){
    wrap.classList.toggle('open', open);
    btn.setAttribute('aria-expanded', String(open));
    if(open) document.addEventListener('click', onDocClick);
    else document.removeEventListener('click', onDocClick);
  }
  btn.addEventListener('click', e=>{
    e.stopPropagation();
    setOpen(!wrap.classList.contains('open'));
  });
  btn.addEventListener('keydown', e=>{
    if(e.key==='Escape' && wrap.classList.contains('open')){
      // consume it — otherwise the same keypress reaches document-level
      // handlers (createModal) and closes the containing dialog too
      e.stopPropagation();
      e.preventDefault();
      setOpen(false);
    }
  });
}

export {
  afterNextPaint, flashButton, flashButtonText,
  createModal, createMenu, initStepper, bumpValue, setupInfoPopover,
};
