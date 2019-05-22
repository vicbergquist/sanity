import {isEqual} from 'lodash'
import randomKey from './randomKey'

// For a block with _type 'block' (text), join spans where possible
export default function normalizeBlock(block) {
  let childIndex = 0

  // Initialize id
  if (!block._key) {
    block._key = randomKey(12)
  }
  // Return everything that isn't a content block as is,
  // We only know it should have a _key
  if (block._type !== 'block') {
    return block
  }
  // Initialize the child array
  if (!block.children) {
    block.children = []
  }
  // Initialize markdefs array
  if (!block.markDefs) {
    block.markDefs = []
  }

  // Do we have a child?
  const lastChild = block.children.slice(-1)[0]
  if (!lastChild) {
    // A content block must at least have an empty span type child as child
    block.children = [
      {
        _type: 'span',
        _key: `${block._key}${0}`,
        text: '',
        marks: []
      }
    ]
    return block
  }
  block.children = block.children
    // eslint-disable-next-line complexity
    .filter((child, index) => {
      const previousChild = block.children[index - 1]
      const hasIdenticalMarksAsLastSpan =
        previousChild &&
        previousChild._type === 'span' &&
        child._type === 'span' &&
        isEqual(previousChild.marks, child.marks)
      if (hasIdenticalMarksAsLastSpan) {
        // Remove any empty last span childs
        if (lastChild && lastChild === child && child.text === '' && block.children.length > 1) {
          return false
        }
        // Add to previous span if it has the same marks as the last one
        previousChild.text += child.text
        return false
      }
      return child
    })
    .map(child => {
      // Set an incremental child key
      child._key = `${block._key}${childIndex++}`
      // Make sure spans are the way they're supposed to
      if (child._type === 'span') {
        // Initialize span marks array
        if (!child.marks) {
          child.marks = []
        }
        // If this has marks, and begins or ends with white space,
        // put the whitespace in it's own span without any marks
        const whitespace = child.text.match(/^\s+|\s+$/g)
        if (whitespace && child.marks.length > 0) {
          const newChilds = []
          // eslint-disable-next-line max-depth
          if (whitespace[1]) {
            newChilds.push({_type: 'span', marks: [], text: whitespace[1]})
          }
          newChilds.push({
            _type: 'span',
            marks: child.marks,
            text: child.text.replace(/^\s+|\s+$/g, '')
          })
          // eslint-disable-next-line max-depth
          if (whitespace[0]) {
            newChilds.push({_type: 'span', marks: [], text: whitespace[0]})
          }
          return newChilds
        }
      }
      return child
    })
  return block
}
