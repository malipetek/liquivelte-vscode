interface Schema
{
  name: string;
  type: string;
  settings: any[];
  blocks?: any[]

}
export function hasSchemaTag (liquidContent: string): boolean
{
  return /\{%-*\s*schema\s*-*%\}([^*]+)\{%-?\s+endschema\s+-?%\}/gim.test(liquidContent);
}

export function getSchemaFromLiquid (liquidContent: string): 
  {
    liquidWithoutSchema: string;
    schema: object | false;
  }
{
  let liquidWithoutSchema = '';
  let schema: object | false = false;

  if (!hasSchemaTag(liquidContent)) {
    return { liquidWithoutSchema: liquidContent, schema };
  }

  let schemaJson;
  liquidWithoutSchema = liquidContent.replace(/\{%-*\s*schema\s*-*%\}([^*]+)\{%-?\s+endschema\s+-?%\}/gim,
    (a, content, offset) =>
    {
      schemaJson = content;
      return '';
    });
  try {
    schema = JSON.parse(schemaJson);
  } catch (err) {
    console.log('schema could not be parsed', schemaJson);
  }

  return { liquidWithoutSchema, schema };
}
export function parseSchemaJson (json) : object | false
{
  let schema : object | false = false;
  try {
    schema = JSON.parse(json);
  } catch (err) {
    console.log('schema could not be parsed', json);
  }
  return schema;
} 
export function getSchemaFromModule (module): object | false
{
  let schema: false | object = false;
  if (/\.schema\.json$/.test(module.id)) {
    schema = module.meta.schema;
  } else {
    const result = getSchemaFromLiquid(module.meta?.result?.liquidContent);
    schema = result.schema;
  }

  return schema;
}

export function stripSchema (liquidContent: string): string
{
  const { liquidWithoutSchema } = getSchemaFromLiquid(liquidContent);
  return liquidWithoutSchema;
}

export function mergeSchemas (schema: Schema, subSchema: Schema | false): Schema
{
  if (subSchema === false) {
    return schema;
  }

  if (subSchema.type) {
    schema = { ...schema, blocks: [...(schema.blocks), subSchema] };
  } else {
    schema = {
      ...schema, settings: [...(schema?.settings || []), ...(subSchema.name ? [{
        type: "header",
        content: subSchema.name,
      }] : []), ...(subSchema?.settings || [])]
    };
  }
  return schema;
}