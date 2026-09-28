// 좌석 배치도 검사: 번호 1~N이 빠짐·중복 없이 있고, 두 좌석이 같은 칸에 겹치지 않는지.
// Run: node scripts/check-library-layouts.mjs
import { LIBRARY_READING_ROOMS } from "../src/constants.js";
import { LIBRARY_SEAT_LAYOUTS } from "../src/libraryLayouts.js";

let failed = false;
for (const [library, rooms] of Object.entries(LIBRARY_READING_ROOMS)) {
  for (const room of rooms) {
    const layout = LIBRARY_SEAT_LAYOUTS[library]?.[room.name];
    const problems = [];
    if (!layout) {
      problems.push("배치도 없음");
    } else {
      const numbers = layout.seats.map((seat) => seat.n);
      const seen = new Set();
      const dupes = numbers.filter((n) => (seen.has(n) ? true : (seen.add(n), false)));
      const missing = [];
      for (let n = 1; n <= room.seats; n += 1) if (!seen.has(n)) missing.push(n);
      const extra = numbers.filter((n) => n < 1 || n > room.seats);
      const cells = new Map();
      const overlaps = [];
      for (const seat of layout.seats) {
        const key = `${seat.c},${seat.r}`;
        if (cells.has(key)) overlaps.push(`${cells.get(key)}&${seat.n}@${key}`);
        cells.set(key, seat.n);
      }
      for (const entrance of layout.entrances || []) {
        for (const dc of [0, 1]) {
          const key = `${entrance.c + dc},${entrance.r}`;
          if (cells.has(key)) overlaps.push(`출입구&${cells.get(key)}@${key}`);
        }
      }
      if (dupes.length) problems.push(`중복 ${dupes.join(",")}`);
      if (missing.length) problems.push(`누락 ${missing.join(",")}`);
      if (extra.length) problems.push(`범위밖 ${extra.join(",")}`);
      if (overlaps.length) problems.push(`겹침 ${overlaps.join(" ")}`);
    }
    if (problems.length) failed = true;
    console.log(`${problems.length ? "✗" : "✓"} ${library} ${room.name} (${room.seats}석) ${problems.join(" / ")}`);
  }
}
process.exit(failed ? 1 : 0);
