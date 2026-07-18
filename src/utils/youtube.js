const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
])

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/
const PLAYLIST_ID_PATTERN = /^[A-Za-z0-9_-]{10,100}$/

export function toYouTubeEmbedUrl(value) {
  const input = value?.trim()
  if (!input) return ''

  let url
  try {
    url = new URL(input)
  } catch {
    return ''
  }

  const hostname = url.hostname.toLowerCase().replace(/^www\./, '')
  const pathParts = url.pathname.split('/').filter(Boolean)
  let videoId = ''

  if (hostname === 'youtu.be') {
    videoId = pathParts[0] || ''
  } else if (YOUTUBE_HOSTS.has(hostname)) {
    if (url.pathname === '/watch') {
      videoId = url.searchParams.get('v') || ''
    } else if (['shorts', 'live', 'embed'].includes(pathParts[0])) {
      videoId = pathParts[1] || ''
    }
  } else {
    return ''
  }

  const playlistId = url.searchParams.get('list') || ''
  const playerParams = new URLSearchParams({
    autoplay: '1',
    controls: '1',
    loop: '1',
    playsinline: '1',
    rel: '0',
  })

  if (PLAYLIST_ID_PATTERN.test(playlistId)) {
    playerParams.set('listType', 'playlist')
    playerParams.set('list', playlistId)
    return `https://www.youtube.com/embed?${playerParams}`
  }

  if (!VIDEO_ID_PATTERN.test(videoId)) return ''

  playerParams.set('playlist', videoId)
  return `https://www.youtube.com/embed/${videoId}?${playerParams}`
}
