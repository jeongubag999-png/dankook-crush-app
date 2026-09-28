import { useEffect, useRef } from "react";
import { getLibrarySeatLayout } from "../libraryLayouts";

const UNIT = 32;
const SEAT_SIZE = 28;
const PADDING = 12;

// 도서관 열람실 좌석 배치도. 좌석을 누르면 onChange(좌석번호 문자열)를 부른다.
// 배치도가 없는 열람실이면 아무것도 그리지 않는다(번호 입력칸만 쓰게 된다).
export function LibrarySeatMap({ library, roomName, value, onChange }) {
  const scrollRef = useRef(null);
  const layout = getLibrarySeatLayout(library, roomName);
  const selected = Number(value) || null;

  const cells = layout ? [...layout.seats, ...(layout.entrances || [])] : [];
  const minC = Math.min(...cells.map((cell) => cell.c));
  const minR = Math.min(...cells.map((cell) => cell.r));
  const maxC = Math.max(...cells.map((cell) => cell.c + (cell.n ? 0 : 1)));
  const maxR = Math.max(...cells.map((cell) => cell.r));
  const x = (c) => PADDING + (c - minC) * UNIT;
  const y = (r) => PADDING + (r - minR) * UNIT;

  // 번호를 직접 입력했을 때도 선택한 좌석이 보이도록 스크롤을 맞춘다.
  useEffect(() => {
    const container = scrollRef.current;
    const seat = layout?.seats.find((item) => item.n === selected);
    if (!container || !seat) return;
    const visible =
      x(seat.c) >= container.scrollLeft &&
      x(seat.c) + SEAT_SIZE <= container.scrollLeft + container.clientWidth &&
      y(seat.r) >= container.scrollTop &&
      y(seat.r) + SEAT_SIZE <= container.scrollTop + container.clientHeight;
    if (visible) return;
    const left = x(seat.c) - container.clientWidth / 2 + SEAT_SIZE / 2;
    const top = y(seat.r) - container.clientHeight / 2 + SEAT_SIZE / 2;
    container.scrollTo({ left: Math.max(0, left), top: Math.max(0, top), behavior: "smooth" });
  }, [selected, library, roomName]);

  if (!layout) return null;

  return (
    <div className="seatMap">
      <div className="seatMapScroll" ref={scrollRef}>
        <div
          className="seatMapCanvas"
          style={{
            width: PADDING * 2 + (maxC - minC) * UNIT + SEAT_SIZE,
            height: PADDING * 2 + (maxR - minR) * UNIT + SEAT_SIZE,
          }}
        >
          {layout.seats.map((seat) => (
            <button
              key={seat.n}
              type="button"
              className={`seatMapSeat${seat.accessible ? " accessible" : ""}${
                seat.n === selected ? " selected" : ""
              }`}
              style={{ left: x(seat.c), top: y(seat.r) }}
              aria-label={`${seat.n}번 자리`}
              aria-pressed={seat.n === selected}
              onClick={() => onChange(seat.n === selected ? "" : String(seat.n))}
            >
              {seat.n}
            </button>
          ))}
          {(layout.entrances || []).map((entrance) => (
            <span
              key={`${entrance.c},${entrance.r}`}
              className="seatMapEntrance"
              style={{ left: x(entrance.c), top: y(entrance.r) }}
            >
              출입구
            </span>
          ))}
        </div>
      </div>
      <p className="seatMapHint">
        {selected ? (
          <>
            선택한 자리 <b>{selected}번</b> · 다시 누르면 선택 취소
          </>
        ) : (
          "배치도에서 자리를 눌러 선택하세요. 옆으로 밀어서 볼 수 있어요."
        )}
      </p>
      {layout.note && <p className="seatMapNote">{layout.note}</p>}
    </div>
  );
}
