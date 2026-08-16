import { useEffect, useRef, useState } from "react";

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

  const filteredOptions = options.filter((option) =>
    option.toLowerCase().includes(query.toLowerCase())
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
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
