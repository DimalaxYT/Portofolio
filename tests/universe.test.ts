import { test } from "node:test";
import assert from "node:assert/strict";
import type { Artwork } from "../src/lib/types";
import {
  buildProjectPlan,
  projectFromArtwork,
  projectTitle,
  DEMO_PROJECTS,
  MAX_PROJECT_SCENES,
} from "../src/lib/universe/projects";
import { CONTACTS, SKILLS, t } from "../src/lib/universe/content";

/** Réalisation CMS minimale, sans lien ni image. */
function artwork(overrides: Partial<Artwork> = {}): Artwork {
  return {
    id: "a1",
    title: "Projet réel",
    url: null,
    photo: null,
    description: null,
    link: null,
    category: null,
    order: 0,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("universe: sans contenu CMS, les scènes restent des démos signalées", () => {
  const plan = buildProjectPlan([]);
  assert.equal(plan.projects.length, MAX_PROJECT_SCENES);
  assert.equal(plan.overflow, 0);
  for (const project of plan.projects) {
    assert.equal(project.placeholder, true, "une démo doit être signalée");
    assert.equal(project.source, "config");
  }
});

test("universe: le contenu réel passe devant les démos et déborde proprement", () => {
  const artworks = Array.from({ length: 6 }, (_, i) =>
    artwork({ id: `id-${i}`, title: `Réel ${i}` }),
  );
  const plan = buildProjectPlan(artworks);

  assert.equal(plan.projects.length, MAX_PROJECT_SCENES);
  assert.equal(plan.overflow, 2, "les projets non retenus sont annoncés");
  assert.ok(
    plan.projects.every((project) => project.source === "cms"),
    "aucune démo ne se mélange au contenu réel",
  );
  assert.deepEqual(
    plan.projects.map((project) => projectTitle(project, "fr")),
    ["Réel 0", "Réel 1", "Réel 2", "Réel 3"],
  );
});

test("universe: aucun bouton « ouvrir » sans URL réelle", () => {
  assert.equal(projectFromArtwork(artwork()).url, null);
  assert.equal(
    projectFromArtwork(artwork({ link: "exemple.fr" })).url,
    "https://exemple.fr/",
  );
  assert.equal(
    projectFromArtwork(artwork({ url: "javascript:alert(1)" })).url,
    null,
    "les schémas non HTTP sont refusés",
  );
  // `link` a la priorité sur `url`, comme sur la galerie classique.
  assert.equal(
    projectFromArtwork(
      artwork({ link: "https://a.fr", url: "https://b.fr" }),
    ).url,
    "https://a.fr/",
  );
});

test("universe: la mise en scène 3D suit la catégorie du projet", () => {
  const cases: [string, string][] = [
    ["3D", "world"],
    ["Roblox Studio", "world"],
    ["Vidéo", "device"],
    ["Cyberdéfense", "architecture"],
    ["Websites", "interface"],
  ];
  for (const [category, stageKind] of cases) {
    assert.equal(
      projectFromArtwork(artwork({ category })).stageKind,
      stageKind,
      `catégorie ${category}`,
    );
  }
});

test("universe: aucun contact inventé", () => {
  // La scène contact n'affiche que des canaux réellement configurés.
  for (const contact of CONTACTS) {
    assert.ok(contact.href, `${contact.id} n'a pas d'URL : il ne sera pas affiché`);
  }
});

test("universe: chaque compétence liée pointe vers un projet existant", () => {
  const known = new Set(DEMO_PROJECTS.map((project) => project.id));
  for (const skill of SKILLS) {
    for (const related of skill.related) {
      assert.ok(known.has(related), `${skill.name} → ${related} introuvable`);
    }
  }
});

test("universe: les textes bilingues sont résolus dans les deux langues", () => {
  for (const project of DEMO_PROJECTS) {
    assert.notEqual(t(project.title, "fr"), "");
    assert.notEqual(t(project.description, "en"), "");
  }
  for (const skill of SKILLS) {
    assert.notEqual(t(skill.detail, "fr"), "");
    assert.notEqual(t(skill.detail, "en"), "");
  }
});
