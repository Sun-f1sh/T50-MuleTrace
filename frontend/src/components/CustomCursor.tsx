"use client";

import { useEffect, useRef, useState } from "react";

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);

  const [visible, setVisible] = useState(false);
  const [active, setActive] = useState(false);
  const [label, setLabel] = useState("");

  useEffect(() => {
    const cursor = cursorRef.current;

    if (!cursor) return;

    // Disable the custom cursor on touch devices
    if (window.matchMedia("(pointer: coarse)").matches) {
      return;
    }

    let mouseX = 0;
    let mouseY = 0;
    let currentX = 0;
    let currentY = 0;
    let animationFrame = 0;

    const moveCursor = (event: MouseEvent) => {
      mouseX = event.clientX;
      mouseY = event.clientY;

      setVisible(true);
    };

    const updateCursor = () => {
      currentX += (mouseX - currentX) * 0.2;
      currentY += (mouseY - currentY) * 0.2;

      cursor.style.transform = `translate3d(
        ${currentX}px,
        ${currentY}px,
        0
      )`;

      animationFrame = requestAnimationFrame(updateCursor);
    };

    const handleMouseOver = (event: MouseEvent) => {
      const target = event.target;

      if (!(target instanceof HTMLElement)) return;

      /*
       * Investigation elements get the special glowing lens.
       */
      const investigationElement = target.closest(
        "[data-investigate], [data-transaction], [data-inspect]"
      );

      if (investigationElement) {
        setActive(true);
        setLabel("INSPECT");
        return;
      }

      /*
       * Normal interactive elements also activate the
       * glowing lens, but without the INSPECT label.
       */
      const interactive = target.closest(
        "a, button, [role='button'], input, textarea, select"
      );

      if (interactive) {
        setActive(true);
        setLabel("");
        return;
      }

      setActive(false);
      setLabel("");
    };

    const handleMouseLeave = () => {
      setVisible(false);
      setActive(false);
      setLabel("");
    };

    const handleClick = () => {
      cursor.classList.remove("cursor-click");

      // Force the animation to restart
      void cursor.offsetWidth;

      cursor.classList.add("cursor-click");
    };

    window.addEventListener("mousemove", moveCursor);
    window.addEventListener("mouseover", handleMouseOver);
    window.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("click", handleClick);

    animationFrame = requestAnimationFrame(updateCursor);

    return () => {
      window.removeEventListener("mousemove", moveCursor);
      window.removeEventListener("mouseover", handleMouseOver);
      window.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("click", handleClick);

      cancelAnimationFrame(animationFrame);
    };
  }, []);

  return (
    <div
      ref={cursorRef}
      className={`investigation-cursor ${
        visible ? "cursor-visible" : ""
      } ${active ? "cursor-active" : ""}`}
      aria-hidden="true"
    >
      <img
        src={
          active
            ? "/investigation-hover.png"
            : "/investigation-lens.png"
        }
        alt=""
        className="investigation-lens-image"
      />

      {label && <span className="cursor-label">{label}</span>}
    </div>
  );
}