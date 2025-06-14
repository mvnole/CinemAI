import React from "react";
import FilmCard from "./FilmCard";
import { useLocation } from "react-router-dom";

function Section({ title, items, location }) {
  return (
    <div className="px-4 space-y-4">
      <h2 className="text-2xl font-bold text-white">{title}</h2>
      <div className="flex gap-12 overflow-x-auto sm:overflow-visible sm:flex-wrap pb-2">
        {items.map((film) => (
          <div key={film.id} className="shrink-0 w-48 group">
            <FilmCard film={film} location={location} />
          </div>
        ))}
      </div>
    </div>
  );
}

export default Section;
