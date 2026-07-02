/**
 * ShainBox Clipper — content script.
 *
 * Shows a small "Save" button in the top-right corner of any reasonably-sized
 * image on hover. Clicking sends the image URL + page URL to the background
 * worker, which forwards it to the desktop app (or queues it if offline).
 */

const MIN_SIZE = 100 // px — ignore icons, spacers, tracking pixels
let btn = null
let currentImg = null
let hideTimer = null

function ensureButton() {
  if (btn) return btn
  btn = document.createElement('button')
  btn.className = 'shainbox-clip-btn'
  btn.type = 'button'
  btn.textContent = 'Save'
  btn.addEventListener('click', onClick, true)
  btn.addEventListener('mouseenter', () => clearTimeout(hideTimer))
  btn.addEventListener('mouseleave', scheduleHide)
  document.documentElement.appendChild(btn)
  return btn
}

function position(img) {
  const r = img.getBoundingClientRect()
  const b = ensureButton()
  b.style.top = `${window.scrollY + r.top + 8}px`
  b.style.left = `${window.scrollX + r.right - b.offsetWidth - 8}px`
}

function show(img) {
  currentImg = img
  const b = ensureButton()
  b.textContent = 'Save'
  b.style.display = 'block'
  requestAnimationFrame(() => position(img)) // offsetWidth known once shown
}

function scheduleHide() {
  clearTimeout(hideTimer)
  hideTimer = setTimeout(() => {
    if (btn) btn.style.display = 'none'
    currentImg = null
  }, 140)
}

function feedback(text) {
  if (!btn) return
  btn.textContent = text
  setTimeout(() => {
    if (btn) btn.textContent = 'Save'
  }, 1400)
}

function onClick(e) {
  e.preventDefault()
  e.stopPropagation()
  if (!currentImg) return
  const imageUrl = currentImg.currentSrc || currentImg.src
  if (!imageUrl) return
  btn.textContent = '…'
  chrome.runtime.sendMessage(
    { type: 'save', imageUrl, pageUrl: location.href },
    (resp) => {
      if (chrome.runtime.lastError) return feedback('App off')
      if (resp && resp.ok && resp.queued) return feedback('Queued')
      if (resp && resp.ok) return feedback('Saved ✓')
      if (resp && resp.reason === 'unpaired') return feedback('Pair first')
      feedback('Failed')
    },
  )
}

function eligible(el) {
  return (
    el instanceof HTMLImageElement &&
    el.clientWidth >= MIN_SIZE &&
    el.clientHeight >= MIN_SIZE
  )
}

document.addEventListener(
  'mouseover',
  (e) => {
    if (e.target === btn) return
    if (eligible(e.target)) {
      clearTimeout(hideTimer)
      show(e.target)
    }
  },
  true,
)

document.addEventListener(
  'mouseout',
  (e) => {
    if (e.target instanceof HTMLImageElement) scheduleHide()
  },
  true,
)

window.addEventListener(
  'scroll',
  () => {
    if (currentImg && btn && btn.style.display === 'block') position(currentImg)
  },
  true,
)
