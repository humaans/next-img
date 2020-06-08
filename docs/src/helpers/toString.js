import ReactDOMServer from 'react-dom/server'
import { html as pretty } from 'js-beautify'

export function toString(element) {
  return pretty(ReactDOMServer.renderToStaticMarkup(element), {
    wrap_line_length: 40,
    wrap_attributes: 'force-expand-multiline',
    extra_liners: ['img'],
  })
    .replace(/, \//g, ',\n                /')
    .replace(/\/><\//g, '/>\n</')
}
