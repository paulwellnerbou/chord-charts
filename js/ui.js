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

// Eases an element between the heights it has before and after a content swap.
// Everything is border-box, so offsetHeight is directly the animatable height.
// No fill needed: the last frame already equals the element's natural height.
// opts.clip hides the overflow for the animation's duration — needed when the
// box grows, where content taller than the current frame would otherwise spill
// over whatever sits below. opts.duration overrides the default.
function animateHeightSwap(el, mutate, opts = {}){
  const animated = el.animate && !window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // read before cancelling, so an interrupted animation continues from where it
  // currently sits instead of snapping to its target
  const from = el.offsetHeight;
  // unconditional: an animation left running would keep forcing heights meant
  // for the layout we're about to replace
  if(el._heightAnim){
    el._heightAnim.cancel();
    el._heightAnim = null;
  }
  // and its clip — every return below leaves the element unclipped
  el.style.overflow = '';
  mutate();
  if(!animated) return;
  const to = el.offsetHeight;
  if(from === to) return;
  const anim = el.animate([{ height:`${from}px` }, { height:`${to}px` }],
    { duration: opts.duration ?? 220, easing:'cubic-bezier(.4,0,.2,1)' });
  el._heightAnim = anim;
  if(opts.clip) el.style.overflow = 'hidden';
  const clear = ()=>{
    if(el._heightAnim !== anim) return;   // a newer swap owns the element now
    el._heightAnim = null;
    el.style.overflow = '';
  };
  anim.finished.then(clear, clear);
}

// (Re)starts a one-shot CSS animation carried by a class, and takes the class
// off again at the end. Removing it and reading a layout value in between is
// what lets the same animation play twice in a row.
function playAnimation(el, cls){
  if(window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const clear = ()=>{
    if(!el._animEnd) return;
    el.removeEventListener('animationend', el._animEnd);
    el.removeEventListener('animationcancel', el._animEnd);
    el._animEnd = null;
  };
  clear();   // an interrupted play never ends; drop its handler first
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
  const done = e=>{
    // animations of descendants bubble through here; only ours ends the class
    if(e.target !== el) return;
    clear();
    el.classList.remove(cls);
  };
  el._animEnd = done;
  // cancel too: hiding the element (a second switch) stops it without an end
  el.addEventListener('animationend', done);
  el.addEventListener('animationcancel', done);
}

// opts.hold keeps the feedback up until the caller flashes again, for work that
// runs longer than the glance a plain flash is sized for.
function flashButton(btnEl, text, opts = {}){
  if(btnEl._flashTimeout) clearTimeout(btnEl._flashTimeout);
  btnEl._flashTimeout = null;
  btnEl.querySelector('.card-menu-btn-label').textContent = text;
  btnEl.classList.add('is-flash');
  btnEl.disabled = true;
  if(opts.hold) return;
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

// Swaps a label's text while animating its width (text content itself can't
// transition), so neighbouring controls slide instead of jumping. Measures
// both widths, then transitions between them via the .label-swap class. The
// element must be a flex item or inline-block for width to apply.
function setLabelText(el, text, animate){
  if(el.textContent === text) return;
  // tear down any in-flight swap first — interrupted transitions never fire
  // transitionend, so a leftover handler would otherwise accumulate
  clearTimeout(el._labelSwapTimer);
  if(el._labelSwapEnd){
    el.removeEventListener('transitionend', el._labelSwapEnd);
    el._labelSwapEnd = null;
  }
  if(!animate){
    el.classList.remove('label-swap');
    el.style.width = '';
    el.textContent = text;
    return;
  }
  const from = el.getBoundingClientRect().width;
  el.textContent = text;
  el.classList.remove('label-swap');
  el.style.width = '';
  const to = el.getBoundingClientRect().width;
  el.style.width = from + 'px';
  void el.offsetWidth;
  el.classList.add('label-swap');
  el.style.width = to + 'px';
  const done = ()=>{
    clearTimeout(el._labelSwapTimer);
    el.removeEventListener('transitionend', onEnd);
    el._labelSwapEnd = null;
    el.classList.remove('label-swap');
    el.style.width = '';
  };
  const onEnd = e=>{ if(e.target === el && e.propertyName === 'width') done(); };
  el._labelSwapEnd = onEnd;
  el.addEventListener('transitionend', onEnd);
  // hidden tabs get no transition events; sweep eventually
  el._labelSwapTimer = setTimeout(done, 400);
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
  afterNextPaint, animateHeightSwap, playAnimation, flashButton, flashButtonText,
  createModal, createMenu, initStepper, bumpValue, setLabelText, setupInfoPopover,
};
