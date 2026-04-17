"use client";

import Link from "next/link";
import type { Verse } from "@/lib/quran-api";

interface VerseCardProps {
  verse: Verse;
  showTranslation?: boolean;
  showTransliteration?: boolean;
  linkToReflect?: boolean;
}

export function VerseCard({
  verse,
  showTranslation = true,
  showTransliteration = true,
  linkToReflect = true,
}: VerseCardProps) {
  const translation = verse.translations?.[0]?.text || "";
  const cleanTranslation = translation.replace(/<[^>]*>/g, "");

  const content = (
    <div className="group rounded-xl border border-[var(--border-color)] bg-[var(--surface-elevated)] p-4 sm:p-6 transition-all hover:shadow-md hover:border-gold-500/40">
      <div className="flex items-start justify-between mb-4">
        <span className="inline-flex items-center rounded-full bg-emerald-600/10 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
          {verse.verse_key}
        </span>
      </div>

      <p
        lang="ar"
        dir="rtl"
        className="font-[var(--font-arabic)] text-xl sm:text-2xl leading-loose text-right mb-3 text-[var(--foreground)]"
      >
        {verse.text_uthmani}
      </p>

      {showTransliteration && verse.transliteration && (
        <p className="text-sm italic text-[var(--text-tertiary)] mb-3 leading-relaxed">
          {verse.transliteration}
        </p>
      )}

      {showTranslation && cleanTranslation && (
        <p className="font-serif text-[var(--text-secondary)] text-sm leading-relaxed line-clamp-3">
          {cleanTranslation}
        </p>
      )}

      {linkToReflect && (
        <div className="mt-4 flex justify-end">
          <span className="text-xs text-emerald-600 font-medium opacity-0 group-hover:opacity-100 transition-opacity">
            Reflect on this verse &rarr;
          </span>
        </div>
      )}
    </div>
  );

  if (linkToReflect) {
    return (
      <Link href={`/reflect/${verse.verse_key}`} className="block">
        {content}
      </Link>
    );
  }

  return content;
}
