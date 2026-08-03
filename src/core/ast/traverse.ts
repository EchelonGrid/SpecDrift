import _traverse, { NodePath } from '@babel/traverse';
import * as t from '@babel/types';
import { ExtractedEndpoint, ExtractedParameter } from '../../types/endpoint.js';

// Interop wrapper for babel/traverse in ESM
const traverse = ((_traverse as any).default || _traverse) as (parent: t.Node, opts?: any) => void;

interface ResolvedValue {
  value: string;
  parameters: ExtractedParameter[];
}

// Resolver for general Expressions
function resolveValue(path: NodePath<t.Expression | null | undefined>): ResolvedValue {
  const result: ResolvedValue = {
    value: '',
    parameters: [],
  };

  if (!path || !path.node) return result;
  const node = path.node;

  if (t.isStringLiteral(node)) {
    result.value = node.value;
    return result;
  }

  if (t.isTemplateLiteral(node)) {
    let resolvedStr = '';
    const quasis = node.quasis;
    const expressions = node.expressions;

    for (let i = 0; i < quasis.length; i++) {
      resolvedStr += quasis[i].value.cooked || quasis[i].value.raw || '';
      if (i < expressions.length) {
        const expr = expressions[i];
        let paramName = 'param';
        if (t.isIdentifier(expr)) {
          paramName = expr.name;
        } else if (t.isMemberExpression(expr) && t.isIdentifier(expr.property)) {
          paramName = expr.property.name;
        }
        resolvedStr += `{${paramName}}`;
        result.parameters.push({
          name: paramName,
          type: 'path',
          required: true,
        });
      }
    }
    result.value = resolvedStr;
    return result;
  }

  if (t.isBinaryExpression(node) && node.operator === '+') {
    const leftPath = path.get('left') as NodePath<t.Expression>;
    const rightPath = path.get('right') as NodePath<t.Expression>;
    const leftRes = resolveValue(leftPath);
    const rightRes = resolveValue(rightPath);
    return {
      value: leftRes.value + rightRes.value,
      parameters: [...leftRes.parameters, ...rightRes.parameters],
    };
  }

  if (t.isIdentifier(node)) {
    const binding = path.scope.getBinding(node.name);
    if (binding && binding.path) {
      if (t.isVariableDeclarator(binding.path.node)) {
        const initPath = binding.path.get('init') as NodePath<t.Expression>;
        if (initPath && initPath.node && initPath.node !== node) {
          return resolveValue(initPath);
        }
      }
    }
    // If not resolvable, treat as a path parameter
    result.value = `{${node.name}}`;
    result.parameters.push({
      name: node.name,
      type: 'path',
      required: true,
    });
    return result;
  }

  result.value = '{param}';
  result.parameters.push({
    name: 'param',
    type: 'path',
    required: true,
  });
  return result;
}

// Helper to extract properties from options object
function parseOptionsObject(path: NodePath<t.Expression | null | undefined>): {
  method?: string;
  headers: string[];
  parameters: ExtractedParameter[];
} {
  const result: { method?: string; headers: string[]; parameters: ExtractedParameter[] } = {
    headers: [],
    parameters: [],
  };

  if (!path || !path.node || !t.isObjectExpression(path.node)) return result;

  const properties = path.get('properties') as NodePath<t.ObjectMember>[];
  for (const propPath of properties) {
    if (!propPath.node || !t.isObjectProperty(propPath.node)) continue;

    const node = propPath.node;
    let keyName = '';
    if (t.isIdentifier(node.key)) {
      keyName = node.key.name;
    } else if (t.isStringLiteral(node.key)) {
      keyName = node.key.value;
    }

    if (!keyName) continue;

    const valuePath = propPath.get('value') as NodePath<t.Expression>;

    if (keyName === 'method') {
      if (t.isStringLiteral(valuePath.node)) {
        result.method = valuePath.node.value.toUpperCase();
      } else {
        const res = resolveValue(valuePath);
        result.method = res.value.toUpperCase();
      }
    } else if (keyName === 'headers') {
      if (t.isObjectExpression(valuePath.node)) {
        const headerProps = valuePath.get('properties') as NodePath<t.ObjectMember>[];
        for (const headerProp of headerProps) {
          if (t.isObjectProperty(headerProp.node)) {
            if (t.isIdentifier(headerProp.node.key)) {
              result.headers.push(headerProp.node.key.name);
            } else if (t.isStringLiteral(headerProp.node.key)) {
              result.headers.push(headerProp.node.key.value);
            }
          }
        }
      }
    } else if (keyName === 'params') {
      if (t.isObjectExpression(valuePath.node)) {
        const paramProps = valuePath.get('properties') as NodePath<t.ObjectMember>[];
        for (const paramProp of paramProps) {
          if (t.isObjectProperty(paramProp.node)) {
            let name = '';
            if (t.isIdentifier(paramProp.node.key)) {
              name = paramProp.node.key.name;
            } else if (t.isStringLiteral(paramProp.node.key)) {
              name = paramProp.node.key.value;
            }
            if (name) {
              result.parameters.push({
                name,
                type: 'query',
                required: true,
              });
            }
          }
        }
      }
    } else if (keyName === 'data' || keyName === 'body') {
      if (t.isObjectExpression(valuePath.node)) {
        const bodyProps = valuePath.get('properties') as NodePath<t.ObjectMember>[];
        for (const bodyProp of bodyProps) {
          if (t.isObjectProperty(bodyProp.node)) {
            let name = '';
            if (t.isIdentifier(bodyProp.node.key)) {
              name = bodyProp.node.key.name;
            } else if (t.isStringLiteral(bodyProp.node.key)) {
              name = bodyProp.node.key.value;
            }
            if (name) {
              result.parameters.push({
                name,
                type: 'body',
                required: true,
              });
            }
          }
        }
      }
    }
  }

  return result;
}

// Extractor helper to parse query parameters from raw URL path string
function parseQueryParamsFromUrl(url: string): { cleanPath: string; queryParams: ExtractedParameter[] } {
  const queryParams: ExtractedParameter[] = [];
  const qMark = url.indexOf('?');
  if (qMark === -1) {
    return { cleanPath: url, queryParams };
  }
  const cleanPath = url.substring(0, qMark);
  const search = url.substring(qMark + 1);
  const parts = search.split('&');
  for (const part of parts) {
    const eq = part.indexOf('=');
    const name = eq === -1 ? part : part.substring(0, eq);
    if (name) {
      queryParams.push({
        name,
        type: 'query',
        required: true,
      });
    }
  }
  return { cleanPath, queryParams };
}

export function traverseAST(ast: t.File, sourceFile: string): ExtractedEndpoint[] {
  const findings: ExtractedEndpoint[] = [];

  traverse(ast, {
    // 1. Traverse CallExpressions: fetch, axios
    CallExpression(path: NodePath<t.CallExpression>) {
      const node = path.node;
      const callee = node.callee;
      const loc = node.loc?.start.line || 1;

      // Handle standard fetch(url, options)
      if (t.isIdentifier(callee) && callee.name === 'fetch') {
        const urlArg = path.get('arguments.0') as NodePath<t.Expression>;
        const optionsArg = path.get('arguments.1') as NodePath<t.Expression>;

        const resolvedUrl = resolveValue(urlArg);
        const options = parseOptionsObject(optionsArg);

        const { cleanPath, queryParams } = parseQueryParamsFromUrl(resolvedUrl.value);

        const finalMethod = (options.method || 'GET') as any;

        findings.push({
          path: cleanPath,
          method: finalMethod,
          parameters: [...resolvedUrl.parameters, ...queryParams, ...options.parameters],
          headers: options.headers,
          sourceFile,
          lineLocation: loc,
        });
        return;
      }

      // Handle axios variants
      let isAxiosCall = false;
      let axiosMethod: string | undefined;
      let urlArgPath: NodePath<t.Expression> | undefined;
      let configArgPath: NodePath<t.Expression> | undefined;
      let dataArgPath: NodePath<t.Expression> | undefined;

      if (t.isIdentifier(callee) && callee.name === 'axios') {
        // axios(url, config) or axios(config)
        isAxiosCall = true;
        const arg0 = path.get('arguments.0') as NodePath<t.Expression>;
        if (arg0 && arg0.node && (t.isStringLiteral(arg0.node) || t.isTemplateLiteral(arg0.node) || t.isIdentifier(arg0.node))) {
          urlArgPath = arg0;
          configArgPath = path.get('arguments.1') as NodePath<t.Expression>;
        } else {
          configArgPath = arg0;
        }
      } else if (
        t.isMemberExpression(callee) &&
        t.isIdentifier(callee.object) &&
        callee.object.name === 'axios' &&
        t.isIdentifier(callee.property)
      ) {
        // axios.get(url, config), axios.post(url, data, config), etc.
        isAxiosCall = true;
        const methodProp = callee.property.name.toUpperCase();
        axiosMethod = methodProp;

        urlArgPath = path.get('arguments.0') as NodePath<t.Expression>;

        if (['POST', 'PUT', 'PATCH'].includes(methodProp)) {
          dataArgPath = path.get('arguments.1') as NodePath<t.Expression>;
          configArgPath = path.get('arguments.2') as NodePath<t.Expression>;
        } else {
          configArgPath = path.get('arguments.1') as NodePath<t.Expression>;
        }
      }

      if (isAxiosCall) {
        let finalPath = '';
        let urlParams: ExtractedParameter[] = [];
        let configOptions: { method?: string; headers: string[]; parameters: ExtractedParameter[] } = {
          headers: [],
          parameters: [],
        };

        if (urlArgPath) {
          const res = resolveValue(urlArgPath);
          finalPath = res.value;
          urlParams = res.parameters;
        }

        if (configArgPath) {
          configOptions = parseOptionsObject(configArgPath);
        }

        // If dataArgPath exists (e.g. for POST), parse its keys if it's an object expression
        const bodyParams: ExtractedParameter[] = [];
        if (dataArgPath && t.isObjectExpression(dataArgPath.node)) {
          const bodyProps = dataArgPath.get('properties') as NodePath<t.ObjectMember>[];
          for (const bodyProp of bodyProps) {
            if (t.isObjectProperty(bodyProp.node)) {
              let name = '';
              if (t.isIdentifier(bodyProp.node.key)) {
                name = bodyProp.node.key.name;
              } else if (t.isStringLiteral(bodyProp.node.key)) {
                name = bodyProp.node.key.value;
              }
              if (name) {
                bodyParams.push({
                  name,
                  type: 'body',
                  required: true,
                });
              }
            }
          }
        }

        // If URL wasn't a separate argument, check if it was inside the config object
        if (!finalPath && configArgPath && t.isObjectExpression(configArgPath.node)) {
          const props = configArgPath.get('properties') as NodePath<t.ObjectMember>[];
          const urlProp = props.find(
            (p) =>
              t.isObjectProperty(p.node) &&
              (t.isIdentifier(p.node.key, { name: 'url' }) || t.isStringLiteral(p.node.key, { value: 'url' }))
          );
          if (urlProp) {
            const valPath = urlProp.get('value') as NodePath<t.Expression>;
            const res = resolveValue(valPath);
            finalPath = res.value;
            urlParams = res.parameters;
          }
        }

        const { cleanPath, queryParams } = parseQueryParamsFromUrl(finalPath);
        const finalMethod = (axiosMethod || configOptions.method || 'GET') as any;

        findings.push({
          path: cleanPath || '/',
          method: finalMethod,
          parameters: [...urlParams, ...queryParams, ...configOptions.parameters, ...bodyParams],
          headers: configOptions.headers,
          sourceFile,
          lineLocation: loc,
        });
      }
    },

    // 2. XMLHttpRequest instantiations
    NewExpression(path: NodePath<t.NewExpression>) {
      const node = path.node;
      const callee = node.callee;
      const loc = node.loc?.start.line || 1;

      if (t.isIdentifier(callee) && callee.name === 'XMLHttpRequest') {
        const parentDeclarator = path.parentPath;
        if (
          parentDeclarator &&
          t.isVariableDeclarator(parentDeclarator.node) &&
          t.isIdentifier(parentDeclarator.node.id)
        ) {
          const xhrVarName = parentDeclarator.node.id.name;
          const binding = path.scope.getBinding(xhrVarName);

          if (binding) {
            let method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' = 'GET';
            let pathStr = '/';
            let pathParams: ExtractedParameter[] = [];
            const headers: string[] = [];
            const bodyParams: ExtractedParameter[] = [];

            for (const refPath of binding.referencePaths) {
              const memExpr = refPath.parentPath;
              if (memExpr && t.isMemberExpression(memExpr.node) && t.isIdentifier(memExpr.node.property)) {
                const propName = memExpr.node.property.name;
                const callExpr = memExpr.parentPath;

                if (callExpr && t.isCallExpression(callExpr.node)) {
                  if (propName === 'open') {
                    const methodArg = callExpr.get('arguments.0') as NodePath<t.Expression>;
                    const urlArg = callExpr.get('arguments.1') as NodePath<t.Expression>;

                    if (methodArg) {
                      const resMethod = resolveValue(methodArg);
                      method = (resMethod.value.toUpperCase() || 'GET') as any;
                    }
                    if (urlArg) {
                      const resUrl = resolveValue(urlArg);
                      pathStr = resUrl.value;
                      pathParams = resUrl.parameters;
                    }
                  } else if (propName === 'setRequestHeader') {
                    const headerArg = callExpr.node.arguments[0];
                    if (t.isStringLiteral(headerArg)) {
                      headers.push(headerArg.value);
                    }
                  } else if (propName === 'send') {
                    let bodyArg = callExpr.get('arguments.0') as NodePath<t.Expression>;
                    if (bodyArg && bodyArg.node && t.isCallExpression(bodyArg.node)) {
                      const calleeNode = bodyArg.node.callee;
                      if (
                        t.isMemberExpression(calleeNode) &&
                        t.isIdentifier(calleeNode.object, { name: 'JSON' }) &&
                        t.isIdentifier(calleeNode.property, { name: 'stringify' })
                      ) {
                        const firstArg = bodyArg.get('arguments.0') as NodePath<t.Expression>;
                        if (firstArg) {
                          bodyArg = firstArg;
                        }
                      }
                    }
                    if (bodyArg && bodyArg.node && t.isObjectExpression(bodyArg.node)) {
                      const props = bodyArg.get('properties') as NodePath<t.ObjectMember>[];
                      for (const prop of props) {
                        if (t.isObjectProperty(prop.node)) {
                          let name = '';
                          if (t.isIdentifier(prop.node.key)) {
                            name = prop.node.key.name;
                          } else if (t.isStringLiteral(prop.node.key)) {
                            name = prop.node.key.value;
                          }
                          if (name) {
                            bodyParams.push({
                              name,
                              type: 'body',
                              required: true,
                            });
                          }
                        }
                      }
                    }
                  }
                }
              }
            }

            const { cleanPath, queryParams } = parseQueryParamsFromUrl(pathStr);

            findings.push({
              path: cleanPath,
              method,
              parameters: [...pathParams, ...queryParams, ...bodyParams],
              headers,
              sourceFile,
              lineLocation: loc,
            });
          }
        }
      }
    },
  });

  return findings;
}
