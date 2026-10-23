import { useMemo, useState, type FormEvent } from 'react'
import { FILMS, pad2, searchFilms } from '../data/films'
import { useReel, type Phase } from '../state/useReel'

const STATUS: Record<Phase, string> = {
  loading: 'LOADING THE REEL…',
  idle: 'TYPE A TITLE · OR CLICK A FRAME ON THE STRIP',
  roll: 'ROLLING TO FRAME ',
  focus: 'FOUND IT · FRAME ',
  feed: 'FEEDING THE PROJECTOR…',
  lead: 'LIGHTS DOWN…',
  play: 'NOW PROJECTING',
  return: 'REWINDING TO THE REEL…',
}

const SUGGESTIONS: [string, number][] = [['nurse 1990', 0], ['literacy', 2], ['ad campaign', 1], ['newsreel', 3], ['little 500', 6]]

function SearchIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-3.6-3.6" />
    </svg>
  )
}

export function Overlay({ error }: { error: string | null }) {
  const phase = useReel((s) => s.phase)
  const target = useReel((s) => s.target)
  const paused = useReel((s) => s.paused)
  const { goTo, back, setPaused } = useReel.getState()
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const hits = useMemo(() => searchFilms(query).slice(0, 5), [query])

  const ready = phase === 'idle'
  const showSearch = phase === 'idle' || phase === 'loading'
  const tab = showSearch ? 0 : -1
  const film = FILMS[target]
  const status = phase === 'roll' ? `${STATUS.roll}${pad2(target + 1)}…` : phase === 'focus' ? `${STATUS.focus}${pad2(target + 1)}` : STATUS[phase]

  const project = (index: number) => {
    setOpen(false)
    goTo(index)
  }
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (ready && hits.length) project(hits[0].index)
  }

  return (
    <div className="ui">
      <header className="mast">
        <span className="mark" aria-hidden="true">IU</span>
        <span className="name">Media Collections Online</span>
        <span className="room">THE REEL ROOM</span>
      </header>

      <section className={`search${showSearch ? '' : ' away'}`} aria-hidden={showSearch ? undefined : true}>
        <h1>Name a film. <em>We’ll roll the reel to it.</em></h1>
        <form className="field" role="search" onSubmit={submit}>
          <label htmlFor="reel-q" className="sr">Search the film archive</label>
          <input
            id="reel-q" type="search" value={query} autoComplete="off" tabIndex={tab}
            placeholder="Try “nurse 1990”, “literacy”, “newsreel”"
            onChange={(e) => { setQuery(e.target.value); setOpen(true) }}
            onFocus={() => setOpen(true)}
          />
          <button type="submit" className="go" aria-label="Find and project" tabIndex={tab} disabled={!ready}>
            <SearchIcon />
          </button>
        </form>
        {open && query.trim() && (
          <ul className="hits" aria-label="Matching films">
            {hits.length ? hits.map(({ film: f, index }, k) => (
              <li key={index}>
                <button type="button" className={`hit${k === 0 ? ' on' : ''}`} disabled={!ready} onClick={() => project(index)}>
                  <span className="fr">FR {pad2(index + 1)}</span>
                  <span className="t">{f.title}</span>
                  <span className="d">{f.duration}</span>
                </button>
              </li>
            )) : (
              <li className="none">No film on this reel matches “{query.trim()}”. Try a year, a place or a format.</li>
            )}
          </ul>
        )}
        <div className="chips">
          {SUGGESTIONS.map(([label, index]) => (
            <button key={label} type="button" className="chip" tabIndex={tab} disabled={!ready}
              onClick={() => { setQuery(label); project(index) }}>
              {label}
            </button>
          ))}
        </div>
      </section>

      {phase === 'play' ? (
        <section className="now" aria-live="polite">
          <span className="k">NOW PROJECTING · FRAME {pad2(target + 1)} · {film.duration}</span>
          <h2>{film.title}</h2>
          <div className="row">
            <button type="button" className="btn primary" onClick={() => setPaused(!paused)}>{paused ? 'Resume' : 'Pause'}</button>
            <button type="button" className="btn" onClick={back}>← Back to the reel</button>
          </div>
          <span className="hint">Demo footage: the screen shows the frame’s stamp, not the real recording.</span>
        </section>
      ) : (
        <div className="bottom">
          <span className={`status${phase !== 'idle' ? ' busy' : ''}`} role="status">{error ?? status}</span>
        </div>
      )}
    </div>
  )
}
