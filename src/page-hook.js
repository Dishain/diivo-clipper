/**
 * Diivo Clipper - X/Twitter page hook (runs in the page's MAIN world).
 *
 * X streams video via MSE (the <video> src is a blob:), but its API
 * responses carry plain progressive .mp4 variant URLs on video.twimg.com.
 * This hook watches fetch responses and forwards any such URLs to the
 * content script via postMessage. The content script uses them only when
 * the user clicks Save on a video - nothing is stored or sent elsewhere.
 */
;(() => {
  if (window.__diivoClipperHooked) return
  window.__diivoClipperHooked = true

  const MP4_RE = /https:\/\/video\.twimg\.com\/[^"'\s\\]+?\.mp4[^"'\s\\]*/g

  function report(text) {
    if (typeof text !== 'string' || text.indexOf('video.twimg.com') === -1) return
    // GraphQL payloads occasionally JSON-escape slashes - normalise first.
    const plain = text.indexOf('\\/') === -1 ? text : text.replace(/\\\//g, '/')
    const urls = plain.match(MP4_RE)
    if (urls && urls.length) {
      window.postMessage({ __diivoClipper: 'mp4-urls', urls: urls.slice(0, 40) }, '*')
    }
  }

  const origFetch = window.fetch
  window.fetch = function (...args) {
    const promise = origFetch.apply(this, args)
    try {
      const url = String((args[0] && args[0].url) || args[0] || '')
      // Only tweet-data endpoints - never touch media or unrelated requests.
      if (/graphql|api\.(x|twitter)\.com/i.test(url)) {
        promise
          .then((res) => {
            try {
              res
                .clone()
                .text()
                .then(report)
                .catch(() => {})
            } catch {
              /* opaque or already-consumed response - skip */
            }
          })
          .catch(() => {})
      }
    } catch {
      /* never break the page's own fetch */
    }
    return promise
  }
})()
