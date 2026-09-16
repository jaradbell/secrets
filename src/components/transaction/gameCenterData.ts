/**
 * 8C's in-progress and finished game — what the scoreboard cards carry and
 * the game center (GameCenterView) drills into: the running score by
 * quarter, each club's leaders, a starters' box, and the play feed. Both
 * are Game 5 of the West finals (the fixture the thread's schedule answer
 * leads with): the live snapshot mid-third, and the same game gone final.
 */
import { ALL_GAMES, type ScheduleGame } from './sportsData'

export type GameStatus = 'live' | 'final'

export type Leader = { stat: 'PTS' | 'REB' | 'AST'; name: string; value: number; detail: string }

export type BoxRow = { name: string; pos: string; min: string; pts: number; reb: number; ast: number }

export type Play = {
  clock: string
  /** Which club acted — null for game events (timeouts, period breaks). */
  side: 'home' | 'away' | null
  text: string
  /** "56–64", home first — the running score after the play. */
  score: string
}

export type SideLine = {
  score: number
  /** Points per quarter; null for quarters not yet played. */
  quarters: [number | null, number | null, number | null, number | null]
  leaders: Leader[]
  box: BoxRow[]
}

export type GameCenter = {
  /** The fixture this game is — shares the schedule's id. */
  game: ScheduleGame
  status: GameStatus
  /** "3rd" / "Final". */
  period: string
  /** "8:39" — blank when final. */
  clock: string
  home: SideLine
  away: SideLine
  /** The banner's headline + caption. */
  banner: { title: string; sub: string }
  /** Prose that develops under the summary once the game is final. */
  recap?: string
  /** Most recent first. */
  plays: Play[]
}

const GAME5 = ALL_GAMES.find((g) => g.id === 'g5-west')!

const leader = (stat: Leader['stat'], name: string, value: number, detail: string): Leader => ({
  stat,
  name,
  value,
  detail,
})

const row = (name: string, pos: string, min: string, pts: number, reb: number, ast: number): BoxRow => ({
  name,
  pos,
  min,
  pts,
  reb,
  ast,
})

/** Mid-third: the Thunder have pushed ahead on a 9–2 run; Spurs timeout. */
export const LIVE_GAME: GameCenter = {
  game: GAME5,
  status: 'live',
  period: '3rd',
  clock: '8:39',
  home: {
    score: 56,
    quarters: [24, 22, 10, null],
    leaders: [
      leader('PTS', 'V. Wembanyama', 18, '7-12 FG'),
      leader('REB', 'V. Wembanyama', 9, '3 OFF'),
      leader('AST', "De'A. Fox", 5, '1 TO'),
    ],
    box: [
      row('V. Wembanyama', 'C', '22:41', 18, 9, 2),
      row("De'A. Fox", 'G', '21:10', 12, 2, 5),
      row('S. Castle', 'G', '19:52', 8, 3, 2),
      row('D. Vassell', 'F', '18:30', 7, 2, 1),
      row('D. Harper', 'G', '15:04', 6, 1, 2),
    ],
  },
  away: {
    score: 64,
    quarters: [26, 25, 13, null],
    leaders: [
      leader('PTS', 'S. Gilgeous-Alexander', 21, '8-13 FG'),
      leader('REB', 'C. Holmgren', 7, '2 BLK'),
      leader('AST', 'S. Gilgeous-Alexander', 4, '2 TO'),
    ],
    box: [
      row('S. Gilgeous-Alexander', 'G', '23:15', 21, 3, 4),
      row('J. Williams', 'F', '21:48', 12, 4, 2),
      row('C. Holmgren', 'C', '20:02', 9, 7, 1),
      row('L. Dort', 'G', '18:11', 6, 2, 0),
      row('I. Hartenstein', 'C', '14:36', 4, 5, 2),
    ],
  },
  banner: {
    title: 'Thunder on a 9\u20132 run \u00B7 Spurs timeout',
    sub: '3rd quarter \u00B7 8:39 \u00B7 Frost Bank Center',
  },
  plays: [
    { clock: '8:39', side: null, text: 'Spurs full timeout', score: '56\u201364' },
    { clock: '8:44', side: 'home', text: 'Fox free throw (1 of 2)', score: '56\u201364' },
    { clock: '8:52', side: 'away', text: 'Gilgeous-Alexander free throw (1 of 1)', score: '55\u201364' },
    { clock: '8:52', side: 'away', text: 'Gilgeous-Alexander driving layup, foul on Castle', score: '55\u201363' },
    { clock: '9:14', side: 'home', text: 'Wembanyama turnaround fadeaway', score: '55\u201361' },
    { clock: '9:31', side: 'away', text: 'J. Williams driving layup', score: '53\u201361' },
    { clock: '9:50', side: 'away', text: 'Holmgren 3-pointer (Gilgeous-Alexander assist)', score: '53\u201359' },
    { clock: '10:12', side: 'home', text: 'Fox floating jumper', score: '53\u201356' },
    { clock: '10:30', side: 'away', text: 'Dort corner 3-pointer', score: '51\u201356' },
    { clock: '10:48', side: 'home', text: 'Castle layup (Wembanyama assist)', score: '51\u201353' },
    { clock: '11:07', side: 'away', text: 'Gilgeous-Alexander free throws (2 of 2)', score: '49\u201353' },
    { clock: '11:25', side: 'home', text: 'Vassell 3-pointer (Fox assist)', score: '49\u201351' },
    { clock: '12:00', side: null, text: 'Start of the 3rd quarter', score: '46\u201351' },
  ],
}

/** Gone final: a 35-point fourth and a 14–4 close take Game 5. */
export const FINAL_GAME: GameCenter = {
  game: GAME5,
  status: 'final',
  period: 'Final',
  clock: '',
  home: {
    score: 108,
    quarters: [24, 22, 27, 35],
    leaders: [
      leader('PTS', 'V. Wembanyama', 31, '12-21 FG'),
      leader('REB', 'V. Wembanyama', 14, '4 BLK'),
      leader('AST', "De'A. Fox", 9, '22 PTS'),
    ],
    box: [
      row('V. Wembanyama', 'C', '38:12', 31, 14, 3),
      row("De'A. Fox", 'G', '36:40', 22, 3, 9),
      row('S. Castle', 'G', '33:05', 15, 5, 4),
      row('D. Vassell', 'F', '31:22', 14, 4, 2),
      row('D. Harper', 'G', '27:48', 11, 3, 3),
    ],
  },
  away: {
    score: 102,
    quarters: [26, 25, 28, 23],
    leaders: [
      leader('PTS', 'S. Gilgeous-Alexander', 34, '13-24 FG'),
      leader('REB', 'C. Holmgren', 11, '17 PTS'),
      leader('AST', 'J. Williams', 6, '21 PTS'),
    ],
    box: [
      row('S. Gilgeous-Alexander', 'G', '39:01', 34, 5, 6),
      row('J. Williams', 'F', '36:15', 21, 6, 4),
      row('C. Holmgren', 'C', '34:30', 17, 11, 2),
      row('L. Dort', 'G', '30:12', 9, 3, 1),
      row('I. Hartenstein', 'C', '24:40', 8, 9, 3),
    ],
  },
  banner: {
    title: 'Spurs take Game 5, lead the series 3\u20132',
    sub: 'Final \u00B7 Frost Bank Center \u00B7 Game 6 Monday in Oklahoma City',
  },
  recap:
    'Wembanyama finished with 31 and 14, and San Antonio closed on a 14\u20134 run over the final three minutes \u2014 Fox\u2019s step-back three at 1:52 put the Spurs ahead for good.',
  plays: [
    { clock: '0:00', side: null, text: 'End of the 4th quarter', score: '108\u2013102' },
    { clock: '0:21', side: 'home', text: 'Castle free throws (2 of 2)', score: '108\u2013102' },
    { clock: '0:29', side: 'away', text: 'J. Williams driving layup', score: '106\u2013102' },
    { clock: '0:41', side: 'home', text: 'Wembanyama dunk (Fox assist)', score: '106\u2013100' },
    { clock: '1:03', side: 'home', text: 'Wembanyama blocks Holmgren', score: '104\u2013100' },
    { clock: '1:10', side: 'home', text: 'Vassell 3-pointer (Castle assist)', score: '104\u2013100' },
    { clock: '1:38', side: 'away', text: 'Holmgren tip-in', score: '101\u2013100' },
    { clock: '1:52', side: 'home', text: 'Fox step-back 3-pointer', score: '101\u201398' },
    { clock: '2:20', side: 'home', text: 'Wembanyama turnaround jumper', score: '98\u201398' },
    { clock: '2:41', side: 'home', text: 'Harper layup', score: '96\u201398' },
    { clock: '3:05', side: null, text: 'Thunder full timeout', score: '94\u201398' },
    { clock: '3:22', side: 'away', text: 'Gilgeous-Alexander pull-up jumper', score: '94\u201398' },
  ],
}
