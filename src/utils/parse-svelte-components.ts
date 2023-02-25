function findImportStatementsByVariableName (code, variableName)
{
  const importStatements = [];

  // Use a regular expression to find all import statements in the code
  // This regular expression uses a non-greedy match (the "?" character after the "+" quantifier) to match only the first set of curly braces
  const importRegex = /import (\{.+?\}) from ['|"](\S+)['|"];/g;
  let match;
  while (match = importRegex.exec(code)) {
    const importedVariables = match[1];
    const importPath = match[2];

    // Extract the individual imported variables from the import statement
    const variables = importedVariables
      .substring(1, importedVariables.length - 1) // remove the curly braces from the string
      .split(',')
      .map(variable => variable.trim()); // remove any leading or trailing white space from each variable

    // Check if any of the imported variables match the specified variable name
    if (variables.includes(variableName)) {
      // Extract the module name from the import path
      const moduleName = importPath.split('/').pop();

      importStatements.push({
        importedVariables: variables,
        importPath: importPath,
        moduleName: moduleName
      });
    }
  }

  return importStatements;
}

export default function parseSvelteComponents (template)
{
  const uppercaseComponents = [];

  // Use a regular expression to find all tag names in the template
  const tagNameRegex = /<([A-Z][^\s\/>]*)/g;
  let match;
  while (match = tagNameRegex.exec(template)) {
    const tagName = match[1];
    // Check if the tag name is a custom component (starts with an uppercase letter)
    if (tagName[0] === tagName[0].toUpperCase()) {
      // Check if the component has any props
      const propRegex = /([^\s\/>]+)="{{- [^}]+ -}}"/g;
      let propMatch;
      const props = [];
      while (propMatch = propRegex.exec(template)) {
        props.push(propMatch[1]);
      }

      // Check if the component has any spread props
      const spreadPropRegex = /{[^}]+}/g;
      let spreadPropMatch;
      const spreadProps = [];
      while (spreadPropMatch = spreadPropRegex.exec(template)) {
        spreadProps.push(spreadPropMatch[0]);
      }

      // Add the component and its props to the list of uppercase components
      const [importStatement] = findImportStatementsByVariableName(template, tagName);
      uppercaseComponents.push({
        tagName: tagName,
        props: props,
        spreadProps: spreadProps,
        module: importStatement?.moduleName
      });
    }
  }

  return uppercaseComponents;
}