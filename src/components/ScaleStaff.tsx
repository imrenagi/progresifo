import { useEffect, useId, useRef } from "react";
import {
  Accidental,
  Formatter,
  Renderer,
  Stave,
  StaveNote,
  Voice,
} from "vexflow";
import { buildScaleStaffNotes } from "../music/scales";
import type { ScaleTarget } from "../music/types";

type ScaleStaffProps = {
  label: string;
  target: ScaleTarget;
};

const STAFF_HEIGHT = 120;
const STAVE_WIDTH = 360;
const STAFF_LINE_COLOR = "rgba(247, 246, 239, 0.76)";
const STAFF_GLYPH_COLOR = "#f2b84b";

function toVexFlowKey(noteName: string): string {
  const match = /^([A-G])([#b]*)(\d+)$/.exec(noteName);

  if (!match) {
    throw new Error(`Unable to render staff note ${noteName}.`);
  }

  return `${match[1].toLowerCase()}${match[2]}/${match[3]}`;
}

function getAccidental(noteName: string): string | null {
  const accidentalMatch = /^[A-G]([#b]*)\d+$/.exec(noteName);

  if (!accidentalMatch || accidentalMatch[1] === "") {
    return null;
  }

  return accidentalMatch[1];
}

export function ScaleStaff({ label, target }: ScaleStaffProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const labelId = useId();
  const staffNotes = buildScaleStaffNotes(target);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    container.replaceChildren();

    const renderer = new Renderer(container, Renderer.Backends.SVG);
    renderer.resize(STAVE_WIDTH, STAFF_HEIGHT);

    const context = renderer.getContext();
    context.setFillStyle(STAFF_LINE_COLOR);
    context.setStrokeStyle(STAFF_LINE_COLOR);

    const stave = new Stave(10, 10, STAVE_WIDTH - 20);
    stave.addClef("treble");
    stave.setContext(context).draw();

    const notes = staffNotes.map((note) => {
      const accidental = getAccidental(note.noteName);
      const staveNote = new StaveNote({
        clef: "treble",
        duration: "q",
        keys: [toVexFlowKey(note.noteName)],
      });

      if (accidental) {
        staveNote.addModifier(new Accidental(accidental));
      }

      return staveNote;
    });

    const voice = new Voice({
      numBeats: Math.max(notes.length, 1),
      beatValue: 4,
    }).setStrict(false);
    voice.addTickables(notes);

    new Formatter().joinVoices([voice]).format([voice], STAVE_WIDTH - 110);
    context.setFillStyle(STAFF_GLYPH_COLOR);
    context.setStrokeStyle(STAFF_GLYPH_COLOR);
    voice.draw(context, stave);
  }, [staffNotes]);

  return (
    <div
      aria-labelledby={labelId}
      className="scale-staff"
      role="img"
    >
      <span className="scale-staff__label" id={labelId}>
        Treble clef {label.charAt(0).toLowerCase() + label.slice(1)}
      </span>
      <div className="scale-staff__engraving" ref={containerRef} />
    </div>
  );
}
