/** ShainBox Clipper — popup: pair with a token and show connection status. */

const tokenInput = document.getElementById('token')
const saveBtn = document.getElementById('save')
const appDot = document.getElementById('appDot')
const appText = document.getElementById('appText')
const hint = document.getElementById('hint')

async function init() {
  const { token } = await chrome.storage.local.get('token')
  if (token) tokenInput.value = token
  refreshStatus()
}

function refreshStatus() {
  chrome.runtime.sendMessage({ type: 'status' }, (s) => {
    if (chrome.runtime.lastError || !s) {
      setStatus(false, 'Extension error')
      return
    }
    if (!s.appOnline) {
      setStatus(false, 'ShainBox not running')
    } else if (!s.paired) {
      setStatus(false, 'App found — not paired')
    } else {
      const q = s.queued ? ` · ${s.queued} queued` : ''
      setStatus(true, `Connected (port ${s.port})${q}`)
    }
  })
}

function setStatus(on, text) {
  appDot.className = 'dot ' + (on ? 'on' : 'off')
  appText.textContent = text
}

saveBtn.addEventListener('click', async () => {
  const token = tokenInput.value.trim()
  await chrome.storage.local.set({ token })
  hint.textContent = token ? 'Paired. Hover any image and click Save.' : 'Token cleared.'
  refreshStatus()
})

init()
