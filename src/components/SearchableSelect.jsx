import { useEffect, useRef, useState } from "react";

const normalizeSearchText = (value) =>
  String(value || "")
    .replace(/\s/g, "")
    .replace(/[·.,/()-]/g, "")
    .toLowerCase();

export function SearchableSelect({ options, value, onChange, placeholder }) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const normalizedQuery = normalizeSearchText(query);
  const filteredOptions = options.filter((option) =>
    normalizeSearchText(option).includes(normalizedQuery)
  );

  return (
    <div className="searchableSelect" ref={containerRef}>
      <input
        type="text"
        placeholder={placeholder}
        value={open ? query : value || ""}
        onFocus={() => {
          setQuery("");
          setOpen(true);
        }}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            setQuery("");
            setOpen(false);
          }
          if (e.key === "Enter" && open && filteredOptions[0]) {
            e.preventDefault();
            onChange(filteredOptions[0]);
            setQuery("");
            setOpen(false);
          }
        }}
      />
      {open && (
        <div className="searchableSelectList">
          {filteredOptions.length === 0 && (
            <p className="searchableSelectEmpty">검색 결과가 없어요.</p>
          )}
          {filteredOptions.map((option) => (
            <button
              key={option}
              type="button"
              className="searchableSelectOption"
              onMouseDown={(e) => {
                e.preventDefault();
                onChange(option);
                setQuery("");
                setOpen(false);
              }}
            >
              <span>{option}</span>
              {value === option && (
                <span className="searchableSelectCheck">선택됨</span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
