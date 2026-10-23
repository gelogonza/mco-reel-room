export type Film = {
  title: string
  duration: string
  tags: string
}

// Order matches the frames baked into public/textures/film-atlas.png (rendered in Blender).
// The first three are real MCO records; the rest are stand-ins until the collection is wired up.
export const FILMS: Film[] = [
  { title: '“1990 IUE Nurse Pinning Ceremony, 1990 Graduation Ceremony”', duration: '2:03:19', tags: 'nurse nursing pinning graduation iue 1990 ceremony' },
  { title: '“1997 TV AD Campaign”, 30 spots, January', duration: '17:23', tags: 'ad advert campaign tv 1997 commercial' },
  { title: '“A Community Coming Together For Literacy”', duration: '2:22:58', tags: 'literacy community cable whitewater reading' },
  { title: 'Campus newsreel, Bloomington', duration: '12:48', tags: 'newsreel campus bloomington news' },
  { title: 'Commencement address, Assembly Hall', duration: '47:05', tags: 'commencement address graduation speech' },
  { title: 'Marching band rehearsal', duration: '[--:--]', tags: 'band marching music rehearsal' },
  { title: 'Little 500 race footage', duration: '[--:--]', tags: 'little 500 bike race cycling' },
  { title: 'Theatre production, opening night', duration: '[--:--]', tags: 'theatre theater play production stage' },
  { title: 'Oral history interview', duration: '[--:--]', tags: 'oral history interview' },
  { title: 'Public access program', duration: '[--:--]', tags: 'public access cable television' },
  { title: 'Lecture series, auditorium', duration: '[--:--]', tags: 'lecture series talk' },
  { title: 'Basketball broadcast', duration: '[--:--]', tags: 'basketball sports broadcast hoosiers' },
]

export function searchFilms(query: string): { film: Film; index: number }[] {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean)
  if (!words.length) return []
  return FILMS.map((film, index) => ({ film, index })).filter(({ film }) =>
    words.every((w) => `${film.tags} ${film.title.toLowerCase()}`.includes(w)),
  )
}

export const pad2 = (n: number) => String(n).padStart(2, '0')
