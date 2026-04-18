#!/usr/bin/env node
// Chunks all content/*.md files and writes public/search-chunks.json
// Run AFTER `npx quartz build` so public/ already exists.

import fs from "fs"
import path from "path"
import matter from "gray-matter"
import { globby } from "globby"

const CONTENT_DIR = "./content"
const OUT_FILE = "./public/search-chunks.json"
const CHUNK_CHARS = 450
const OVERLAP_CHARS = 80

function stripMarkdown(text) {
  return text
    .replace(/```[\s\S]*?```/g, "")   // fenced code blocks
    .replace(/`[^`]*`/g, "")          // inline code
    .replace(/!\[.*?\]\(.*?\)/g, "")  // images
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // links → text
    .replace(/#{1,6}\s+/g, "")        // headings
    .replace(/[*_~>]+/g, "")          // bold / italic / blockquote
    .replace(/^\s*[-+*]\s+/gm, "")    // list bullets
    .replace(/^\s*\d+\.\s+/gm, "")   // ordered list
    .replace(/\n{3,}/g, "\n\n")
    .trim()
}

function chunk(text, slug, title) {
  const chunks = []
  let i = 0
  while (i < text.length) {
    const end = Math.min(i + CHUNK_CHARS, text.length)
    const piece = text.slice(i, end).trim()
    if (piece.length > 60) chunks.push({ text: piece, slug, title })
    i += CHUNK_CHARS - OVERLAP_CHARS
  }
  return chunks
}

const files = await globby(`${CONTENT_DIR}/**/*.md`)
const allChunks = []

for (const file of files) {
  const raw = fs.readFileSync(file, "utf-8")
  const { data, content } = matter(raw)
  const slug = path
    .relative(CONTENT_DIR, file)
    .replace(/\\/g, "/")
    .replace(/\.md$/, "")
    .replace(/\/index$/, "")
  const title = data.title ?? path.basename(file, ".md")
  const clean = stripMarkdown(content)
  allChunks.push(...chunk(clean, slug, title))
}

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true })
fs.writeFileSync(OUT_FILE, JSON.stringify(allChunks))
console.log(`✓ ${allChunks.length} chunks from ${files.length} notes → ${OUT_FILE}`)
