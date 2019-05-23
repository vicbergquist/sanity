// @flow

export default function UnmarkWhitespacePlugin(blockContentType: Type) {
  return {
    onBeforeInput(event: any, editor: SlateEditor, next: void => void) {
      if (
        event.data === ' ' &&
        editor.value.document.getMarksAtRange(editor.value.selection).size > 0
      ) {
        console.log('Unmark!')
      }
      return next()
    }
  }
}
