import React from 'react'
import ReactDOMServer from 'react-dom/server'
import { html as pretty } from 'js-beautify'
import Code from 'react-syntax-highlighter'
import { docco } from 'react-syntax-highlighter/dist/cjs/styles/hljs'
import { Picture } from '../..'

const exampleCode = `<Picture
  src={[
    require('./images/jelly-s.jpg?sizes=100,375'),
    require('./images/jelly-m.jpg?sizes=600'),
    require('./images/jelly-l.jpg?sizes=800,1200,1600')
  ]}
  breakpoints={[480, 768]}
  sizes={[
    // used for the first image
    \`(max-width: 300px) 100px,
      100vw\`,

    // used for the second image
    \`70vw\`,

    // used for the third image
    \`(max-width: 1200px) 800px,
      (max-width: 1600px) 1200px,
      80vw\`,
  ]}
/>`

const example = (
  <Picture
    src={[
      require('./images/jelly-s.jpg?sizes=100,375'),
      require('./images/jelly-m.jpg?sizes=600'),
      require('./images/jelly-l.jpg?sizes=800,1200,1600'),
    ]}
    breakpoints={[480, 768]}
    sizes={[
      `(max-width: 300px) 100px,
      100vw`,
      `70vw`,
      `(max-width: 1200px) 800px,
      (max-width: 1600px) 1200px,
      80vw`,
    ]}
    loading='lazy'
  />
)

export default () => (
  <div className='container'>
    <link
      href='https://fonts.googleapis.com/css2?family=Source+Code+Pro:wght@400;500;600&display=swap'
      rel='stylesheet'
    />

    <div className='row'>
      <h1>next-img</h1>
    </div>

    <div className='row'>
      <h2>Advanced usage - multiple images and multiple sizes</h2>
      <Code language='javascript' style={docco}>
        {exampleCode}
      </Code>
      <h5>Behaviour</h5>
      <ul>
        <li>The image is resized to 1x, 2x and 3x density for each specified size</li>
        <li>This results in 200px, 400px, 600px, 800px, 1600px, 2400px, 1200px and 3600px sizes</li>
        <li>Each of those sizes is also converted to webp</li>
        <li>All images are optimized</li>
        <li>Since there are more images than breakpoint divisions (2 by default) - sizes prop is required</li>
      </ul>
      <h5>Resulting HTML</h5>
      <Code language='html' style={docco}>
        {toString(example)}
      </Code>
      {example}
    </div>

    <style jsx>{`
      .container {
        font-family: system-ui, BlinkMacSystemFont, -apple-system, Segoe UI, Roboto, Oxygen, Ubuntu, Cantarell,
          Fira Sans, Droid Sans, Helvetica Neue, sans-serif;
      }

      a,
      a:visited {
        color: #07f;
      }

      .row {
        max-width: 980px;
        margin: 80px auto 40px;
      }

      :global(pre) {
        background: rgba(217, 232, 255, 0.2);
        padding: 12px 30px;
        overflow: auto;
        font-size: 14px;
        font-family: 'Source Code Pro', monospace;
        font-weight: 500;
      }

      :global(img) {
        max-width: 100%;
      }
    `}</style>
  </div>
)

function toString(element) {
  return pretty(ReactDOMServer.renderToStaticMarkup(element), {
    wrap_line_length: 40,
    wrap_attributes: 'force-expand-multiline',
    extra_liners: ['img'],
  })
    .replace(/, \//g, ',\n                /')
    .replace(/\/><\//g, '/>\n</')
}
