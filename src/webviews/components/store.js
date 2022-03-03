import deepEql from "deep-eql";
import { writable, derived } from 'svelte/store';

export const sectionTranslations = writable({});
export const sectionTranslationsFromFile = writable({});
export const hasSchema = writable(false);
export const schema = writable({
  settings: []
});

export const schemaFromFile = writable({
  settings: []
});

export const schemaChanges = derived([
  schema,
  schemaFromFile,
  sectionTranslations,
  sectionTranslationsFromFile,
  hasSchema
], ([
  $schema,
  $schemaFromFile,
  $sectionTranslations,
  $sectionTranslationsFromFile,
  $hasSchema
]) => {
  if ($hasSchema) {
    return !deepEql($schema, $schemaFromFile) ||
      ($schema.settings
        .some((setting, index) => !deepEql(setting, $schemaFromFile.settings[index]))
      ) ||
      JSON.stringify($sectionTranslations) !== JSON.stringify($sectionTranslationsFromFile);
  }
  return false;
});
