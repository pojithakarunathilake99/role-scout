// Self-hosted tutorial video (served from /videos on rolescout.online; no YouTube or tracking)
export default function AdzunaVideo() {
  const base = import.meta.env.BASE_URL
  return (
    <video
      controls
      playsInline
      preload="none"
      poster={`${base}videos/adzuna-key.jpg`}
      style={{ width: '100%', maxWidth: 640, maxHeight: 480, borderRadius: 10, border: '1px solid var(--line)', marginTop: 10, background: '#000' }}
    >
      <source src={`${base}videos/adzuna-key.mp4`} type="video/mp4" />
      Your browser can’t play this video. <a href={`${base}videos/adzuna-key.mp4`}>Download it</a>.
    </video>
  )
}
