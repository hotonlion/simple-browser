import { Element, Property } from './types.ts'

import CSS from 'css'
import pkg from 'lodash'
const { cloneDeep } = pkg

const rules: Array<CSS.Rule> = []

export const collectCSSRules = (code: string) => {
  const ast = CSS.parse(code)
  if (ast.stylesheet?.rules) {
    rules.push(...ast.stylesheet.rules as Array<CSS.Rule>)
  }
}

export const computeCSS = (element: Element) => {
  if (!element.computedStyle) {
    element.computedStyle = {}
  }
  let cloneElement = cloneDeep(element)
  const parents = []
  parents.push(element)
  // Get the parent element sequence of the current element up to the html element.
  while (cloneElement.parent?.type === 'element') {
    cloneElement = cloneElement.parent as Element
    // Make the order of elements the same as the order of the selectors. 
    parents.unshift(cloneElement)
  }
  // Traverse the CSS rules, find elements that matched.
  for (const rule of rules) {
    let matched: boolean = false
    if (rule.selectors) {
      const selectors: string[] = rule.selectors[0].split(' ')
      let index: number = selectors.length
      // Check whether the last element matches the last selector.
      if (!onMatch(parents[parents.length - 1], selectors[index - 1])) {
        continue
      } else {
        // If matched, shift the index of selectors forward by one position.
        index -= 1
      }
      // Go on matched
      for (let i = parents.length - 2; i > 0; i--) {
        if (onMatch(parents[i], selectors[index - 1])) {
          index -= 1
        } else {
          continue
        }
      }

      matched = index === 0

      if (matched && rule.declarations) {
        const spec = calcSpecificity(rule.selectors[0])
        for (const declaration of rule.declarations as CSS.Declaration[]) {
          const { property, value } = declaration
          if (property && !element.computedStyle[property]) {
            element.computedStyle[property as string] = {
              value: value as string,
              specificity: spec
            }
          }
          if (!element.computedStyle[property as string].specificity) {
            element.computedStyle[property as string].specificity = spec
          } else if (compare(spec, element.computedStyle[property as string].specificity) > 0) {
            element.computedStyle[property as string].specificity = spec
          }
        }
      }
    }
  }
}

const onMatch = (element: Element, selector: string) => {
  //  TODO
  /**
   * Groups of selectors
   * Combinators
  */
  if (!element || !selector) return false
  if (selector.charAt(0) === '#') {
    // ID selectors
    const attrs = element.attributes?.filter(attr => attr.name === 'id')
    return selector.replace('#', '') === (attrs?.length && attrs[0].value)
  } else if (selector.charAt(0) === '.') {
    // Class Selectors
    const attrs = element.attributes?.filter(attr => attr.name === 'class')
    return selector.replace('.', '') === (attrs?.length && attrs[0].value)
  } else {
    // Type Selectors
    return element.tagName === selector
  }
}

const calcSpecificity = (selectors: string) => {
  // Only simple selectors (ID selectors, Class Selectors, Type Selectors) are dealt with here.
  // TODO
  const p = [0, 0, 0, 0]
  const parts = selectors.split(' ')
  for (const part of parts) {
    if (part.charAt(0) === '#') {
      p[1] += 1
    } else if (part.charAt(0) === '.') {
      p[2] += 1
    } else if (part.match(/^[a-z]/)) {
      p[3] += 1
    }
  }
  return p
}

const compare = (spec1: Property['specificity'], spec2: Property['specificity']) => {
  if (spec1[0] - spec2[0]) {
    return spec1[0] - spec2[0]
  } else if (spec1[1] - spec2[1]) {
    return spec1[1] - spec2[1]
  } else if (spec1[2] - spec2[2]) {
    return spec1[2] - spec2[2]
  }
  return spec1[3] - spec2[3]
}
